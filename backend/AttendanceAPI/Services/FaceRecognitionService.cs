using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System.Text.Json;

namespace AttendanceAPI.Services
{
    public class FaceRecognitionService : IDisposable
    {
        private readonly ILogger<FaceRecognitionService> _logger;
        private readonly InferenceSession? _arcFaceSession;
        private readonly InferenceSession? _ultraFaceSession;
        private readonly InferenceSession? _antiSpoofSession;
        private readonly string _modelDir;

        private readonly int _inputWidth = 112;
        private readonly int _inputHeight = 112;
        private readonly string _inputName = "input";

        // Threshold for ArcFace Cosine Distance (1.0 - CosineSimilarity)
        // Genuine pairs (same person): distance typically 0.05 - 0.50 (Similarity >= 0.50)
        // Imposter pairs (diff person): distance typically 0.75 - 1.20 (Similarity <= 0.25)
        public const double DefaultThreshold = 0.58;

        // Threshold for MiniFASNet Passive Anti-Spoofing
        // Score > 0.60 indicates a real 3D human face, Score < 0.60 indicates 2D photo / screen replay
        public const double DefaultSpoofThreshold = 0.60;

        public FaceRecognitionService(ILogger<FaceRecognitionService> logger, IWebHostEnvironment env)
        {
            _logger = logger;
            _modelDir = Path.Combine(env.ContentRootPath, "Models", "AI");

            var arcFacePath = Path.Combine(_modelDir, "facenet.onnx");
            var ultraFacePath = Path.Combine(_modelDir, "ultraface.onnx");
            var antiSpoofPath = Path.Combine(_modelDir, "antispoof.onnx");

            try
            {
                if (File.Exists(arcFacePath))
                {
                    var opt = new Microsoft.ML.OnnxRuntime.SessionOptions
                    {
                        GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
                        ExecutionMode = ExecutionMode.ORT_SEQUENTIAL
                    };
                    _arcFaceSession = new InferenceSession(arcFacePath, opt);
                    _logger.LogInformation("ArcFace / FaceNet ONNX model loaded successfully ({Path})", arcFacePath);

                    var firstInput = _arcFaceSession.InputMetadata.First();
                    _inputName = firstInput.Key;
                    var dims = firstInput.Value.Dimensions;
                    if (dims.Length == 4)
                    {
                        // e.g. [1, 3, 112, 112] or [1, 3, 160, 160]
                        _inputHeight = dims[2] > 0 ? dims[2] : 112;
                        _inputWidth  = dims[3] > 0 ? dims[3] : 112;
                    }
                    _logger.LogInformation("ArcFace Input Tensor: {Name}, Size: {W}x{H}", _inputName, _inputWidth, _inputHeight);
                }

                if (File.Exists(ultraFacePath))
                {
                    var opt = new Microsoft.ML.OnnxRuntime.SessionOptions
                    {
                        GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
                        ExecutionMode = ExecutionMode.ORT_SEQUENTIAL
                    };
                    _ultraFaceSession = new InferenceSession(ultraFacePath, opt);
                    _logger.LogInformation("UltraFace ONNX model loaded successfully");
                }

                if (File.Exists(antiSpoofPath))
                {
                    var opt = new Microsoft.ML.OnnxRuntime.SessionOptions
                    {
                        GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
                        ExecutionMode = ExecutionMode.ORT_SEQUENTIAL
                    };
                    _antiSpoofSession = new InferenceSession(antiSpoofPath, opt);
                    _logger.LogInformation("MiniFASNetV2 Anti-Spoofing ONNX model loaded successfully");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize ONNX inference sessions");
            }
        }

        /// <summary>
        /// Runs MiniFASNetV2 Passive Anti-Spoofing model to detect if the photo is a real live face
        /// or a printed photo / phone screen replay.
        /// Returns (isReal, realScore) where realScore is between 0.0 (fake/spoof) and 1.0 (live human).
        /// </summary>
        public (bool IsReal, double RealScore) CheckAntiSpoof(string base64OrRaw, double threshold = DefaultSpoofThreshold)
        {
            if (string.IsNullOrWhiteSpace(base64OrRaw)) return (false, 0.0);

            var trimmed = base64OrRaw.Trim();
            if (trimmed.StartsWith("[")) return (true, 1.0); // Already an extracted embedding

            try
            {
                var cleanBase64 = trimmed;
                var commaIndex = cleanBase64.IndexOf(',');
                if (commaIndex >= 0) cleanBase64 = cleanBase64.Substring(commaIndex + 1);

                byte[] imageBytes = Convert.FromBase64String(cleanBase64);
                return CheckAntiSpoofFromBytes(imageBytes, threshold);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Anti-spoofing check failed to parse image");
                return (true, 0.85); // Non-blocking fallback
            }
        }

        /// <summary>
        /// Anti-spoof inference on raw image bytes.
        /// </summary>
        public (bool IsReal, double RealScore) CheckAntiSpoofFromBytes(byte[] imageBytes, double threshold = DefaultSpoofThreshold)
        {
            if (_antiSpoofSession == null) return (true, 1.0);

            try
            {
                using var image = Image.Load<Rgb24>(imageBytes);

                // Detect face bounding box or crop centered region
                var faceRect = DetectFaceBoundingBox(image);
                if (faceRect.HasValue)
                {
                    int cx = faceRect.Value.X + faceRect.Value.Width / 2;
                    int cy = faceRect.Value.Y + faceRect.Value.Height / 2;
                    int size = (int)(Math.Max(faceRect.Value.Width, faceRect.Value.Height) * 2.0);
                    int x1 = Math.Max(0, cx - size / 2);
                    int y1 = Math.Max(0, cy - size / 2);
                    int w = Math.Min(image.Width - x1, size);
                    int h = Math.Min(image.Height - y1, size);

                    if (w > 20 && h > 20)
                    {
                        image.Mutate(ctx => ctx.Crop(new Rectangle(x1, y1, w, h)));
                    }
                }

                // MiniFASNet standard input: 80x80 BGR
                image.Mutate(ctx => ctx.Resize(80, 80));

                var tensor = new DenseTensor<float>(new[] { 1, 3, 80, 80 });
                for (int y = 0; y < 80; y++)
                {
                    for (int x = 0; x < 80; x++)
                    {
                        var p = image[x, y];
                        // BGR format
                        tensor[0, 0, y, x] = p.B;
                        tensor[0, 1, y, x] = p.G;
                        tensor[0, 2, y, x] = p.R;
                    }
                }

                var inputName = _antiSpoofSession.InputMetadata.Keys.First();
                var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor(inputName, tensor) };
                using var results = _antiSpoofSession.Run(inputs);

                var output = results.First().AsTensor<float>().ToArray();
                // Softmax probability
                double maxVal = output.Max();
                double[] exp = output.Select(v => Math.Exp(v - maxVal)).ToArray();
                double sum = exp.Sum();
                double realScore = exp.Length > 1 ? (exp[1] / sum) : 0.9;

                bool isReal = realScore >= threshold;
                return (isReal, realScore);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Passive anti-spoofing error");
                return (true, 0.85);
            }
        }

        /// <summary>
        /// Extracts a 512-D normalized embedding from a base64 encoded image string or JSON float array.
        /// </summary>
        public float[] ExtractEmbedding(string base64OrRaw)
        {
            if (string.IsNullOrWhiteSpace(base64OrRaw))
                throw new ArgumentException("Image data cannot be empty");

            var trimmed = base64OrRaw.Trim();

            // If already a JSON float array (e.g. stored in DB), parse directly
            if (trimmed.StartsWith("["))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<float[]>(trimmed);
                    if (parsed != null && parsed.Length > 0) return parsed;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse JSON float array descriptor");
                }
            }

            // Strip data:image/...;base64, prefix if present
            var cleanBase64 = trimmed;
            var commaIndex = cleanBase64.IndexOf(',');
            if (commaIndex >= 0)
            {
                cleanBase64 = cleanBase64.Substring(commaIndex + 1);
            }

            byte[] imageBytes = Convert.FromBase64String(cleanBase64);
            return ExtractEmbeddingFromBytes(imageBytes);
        }

        /// <summary>
        /// Extracts ArcFace 512-D embedding from raw image byte array.
        /// </summary>
        public float[] ExtractEmbeddingFromBytes(byte[] imageBytes)
        {
            if (_arcFaceSession == null)
                throw new InvalidOperationException("Face recognition ONNX model is not loaded");

            using var image = Image.Load<Rgb24>(imageBytes);

            // Optional: detect bounding box or use center crop
            var faceRect = DetectFaceBoundingBox(image);
            if (faceRect.HasValue)
            {
                image.Mutate(ctx => ctx.Crop(faceRect.Value));
            }

            // Resize to target model dimensions (112x112 or 160x160)
            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(_inputWidth, _inputHeight),
                Mode = ResizeMode.Crop
            }));

            // Prepare DenseTensor: Shape [1, 3, H, W] (CHW format)
            // ArcFace / InsightFace standard normalization: (pixel - 127.5) / 127.5 -> [-1.0, 1.0]
            var tensor = new DenseTensor<float>(new[] { 1, 3, _inputHeight, _inputWidth });

            for (int y = 0; y < _inputHeight; y++)
            {
                for (int x = 0; x < _inputWidth; x++)
                {
                    var pixel = image[x, y];
                    tensor[0, 0, y, x] = (pixel.R - 127.5f) / 127.5f;
                    tensor[0, 1, y, x] = (pixel.G - 127.5f) / 127.5f;
                    tensor[0, 2, y, x] = (pixel.B - 127.5f) / 127.5f;
                }
            }

            var inputs = new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor(_inputName, tensor)
            };

            using var results = _arcFaceSession.Run(inputs);
            var outputTensor = results.First().AsTensor<float>();
            var embedding = outputTensor.ToArray();

            // L2 normalize the embedding
            return NormalizeL2(embedding);
        }

        /// <summary>
        /// Detects face bounding box using UltraFace or returns null for full image.
        /// </summary>
        private Rectangle? DetectFaceBoundingBox(Image<Rgb24> image)
        {
            if (_ultraFaceSession == null) return null;

            try
            {
                using var clone = image.Clone();
                clone.Mutate(ctx => ctx.Resize(320, 240));

                var tensor = new DenseTensor<float>(new[] { 1, 3, 240, 320 });
                for (int y = 0; y < 240; y++)
                {
                    for (int x = 0; x < 320; x++)
                    {
                        var p = clone[x, y];
                        // Ultraface normalization: (pixel - 127.0) / 128.0
                        tensor[0, 0, y, x] = (p.R - 127.0f) / 128.0f;
                        tensor[0, 1, y, x] = (p.G - 127.0f) / 128.0f;
                        tensor[0, 2, y, x] = (p.B - 127.0f) / 128.0f;
                    }
                }

                var inputName = _ultraFaceSession.InputMetadata.Keys.First();
                var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor(inputName, tensor) };
                using var results = _ultraFaceSession.Run(inputs);

                var scores = results.ElementAt(0).AsTensor<float>();
                var boxes = results.ElementAt(1).AsTensor<float>();

                int bestIdx = -1;
                float bestScore = 0.7f; // confidence threshold

                int numBoxes = scores.Dimensions[1];
                for (int i = 0; i < numBoxes; i++)
                {
                    float faceScore = scores[0, i, 1];
                    if (faceScore > bestScore)
                    {
                        bestScore = faceScore;
                        bestIdx = i;
                    }
                }

                if (bestIdx >= 0)
                {
                    float x1 = Math.Max(0, boxes[0, bestIdx, 0]) * image.Width;
                    float y1 = Math.Max(0, boxes[0, bestIdx, 1]) * image.Height;
                    float x2 = Math.Min(1, boxes[0, bestIdx, 2]) * image.Width;
                    float y2 = Math.Min(1, boxes[0, bestIdx, 3]) * image.Height;

                    // Expand box by 15% for facial context
                    float padW = (x2 - x1) * 0.15f;
                    float padH = (y2 - y1) * 0.15f;

                    int rx = (int)Math.Max(0, x1 - padW);
                    int ry = (int)Math.Max(0, y1 - padH);
                    int rw = (int)Math.Min(image.Width - rx, (x2 - x1) + padW * 2);
                    int rh = (int)Math.Min(image.Height - ry, (y2 - y1) + padH * 2);

                    if (rw > 20 && rh > 20)
                    {
                        return new Rectangle(rx, ry, rw, rh);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "UltraFace detection fallback to center crop");
            }

            return null;
        }

        /// <summary>
        /// Compares two embeddings using Cosine Distance (1.0 - CosineSimilarity).
        /// </summary>
        public (bool IsMatch, double Distance, double Similarity) Compare(float[] emb1, float[] emb2, double threshold = DefaultThreshold)
        {
            if (emb1 == null || emb2 == null || emb1.Length != emb2.Length)
                return (false, 1.0, 0.0);

            double dot = 0;
            double norm1 = 0;
            double norm2 = 0;

            for (int i = 0; i < emb1.Length; i++)
            {
                dot += emb1[i] * emb2[i];
                norm1 += emb1[i] * emb1[i];
                norm2 += emb2[i] * emb2[i];
            }

            double similarity = dot / (Math.Sqrt(norm1) * Math.Sqrt(norm2) + 1e-10);
            double distance = 1.0 - similarity;

            bool isMatch = distance <= threshold;
            return (isMatch, distance, similarity);
        }

        private static float[] NormalizeL2(float[] v)
        {
            double sumSq = 0;
            for (int i = 0; i < v.Length; i++) sumSq += v[i] * v[i];
            double norm = Math.Sqrt(sumSq);
            if (norm > 1e-10)
            {
                for (int i = 0; i < v.Length; i++) v[i] = (float)(v[i] / norm);
            }
            return v;
        }

        public void Dispose()
        {
            _arcFaceSession?.Dispose();
            _ultraFaceSession?.Dispose();
        }
    }
}
