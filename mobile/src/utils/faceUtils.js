/**
 * faceUtils.js
 *
 * Fast on-device face detection + image preprocessing for Server-Side FaceNet ONNX.
 *
 * 1. @react-native-ml-kit/face-detection: fast on-device face presence & active liveness challenge checks (blinks, head turns, smiles).
 * 2. imageUriToBase64: ultra-fast native Blob/FileReader conversion (<15ms).
 * 3. Deep AI recognition + Passive Anti-Spoofing runs server-side on .NET Core via Microsoft.ML.OnnxRuntime.
 */

import FaceDetection from '@react-native-ml-kit/face-detection';

/**
 * Fast on-device face detection with full classification & landmark capabilities.
 * @param {string} imagePath - file:// URI
 */
export const detectFaces = async (imagePath) => {
  try {
    const faces = await FaceDetection.detect(imagePath, {
      performanceMode:    'fast',
      landmarkMode:       'all',
      contourMode:        'none',
      classificationMode: 'all',
      minFaceSize:        0.15,
    });
    return faces || [];
  } catch (e) {
    console.warn('ML Kit Face Detection warning:', e);
    return [];
  }
};

/**
 * Evaluates whether a detected face fulfills the specific active liveness challenge.
 * @param {object} face - Face object from ML Kit
 * @param {string} challengeId - "blink" | "turn_left" | "turn_right" | "smile"
 * @param {object} stateRef - persistent tracking state across frames
 * @returns {boolean} Whether the challenge was successfully achieved
 */
export const evaluateLivenessChallenge = (face, challengeId, stateRef) => {
  if (!face) return false;

  const leftEyeOpen  = face.leftEyeOpenProbability ?? 1.0;
  const rightEyeOpen = face.rightEyeOpenProbability ?? 1.0;
  const smilingProb  = face.smilingProbability ?? 0.0;
  const yawAngle     = face.headEulerAngleY ?? 0.0;

  switch (challengeId) {
    case 'blink': {
      // Step 1: Detect eyes closing (< 0.35)
      if (leftEyeOpen < 0.38 && rightEyeOpen < 0.38) {
        stateRef.eyesClosedDetected = true;
      }
      // Step 2: Detect eyes opening back up (> 0.65) after being closed
      if (stateRef.eyesClosedDetected && (leftEyeOpen > 0.65 || rightEyeOpen > 0.65)) {
        return true;
      }
      return false;
    }

    case 'turn_left': {
      // Head yaw turned left: yawAngle < -12 degrees
      if (yawAngle < -12.0) {
        return true;
      }
      return false;
    }

    case 'turn_right': {
      // Head yaw turned right: yawAngle > 12 degrees
      if (yawAngle > 12.0) {
        return true;
      }
      return false;
    }

    case 'smile': {
      // Smiling probability > 0.60
      if (smilingProb > 0.60) {
        return true;
      }
      return false;
    }

    default:
      return true;
  }
};

/**
 * Converts a local image file:// URI to a base64 Data URL in milliseconds.
 * Uses React Native's native Blob / FileReader implementation.
 * @param {string} imageUri - file:// URI
 * @returns {Promise<string>} Base64 image string (data:image/jpeg;base64,...)
 */
export const imageUriToBase64 = async (imageUri) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('imageUriToBase64 error:', error);
    throw new Error('Failed to convert captured photo for face verification.');
  }
};

export const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
};

export const cosineDistance = (a, b) => 1.0 - cosineSimilarity(a, b);

export const isSamePerson = (storedDescriptor, liveDescriptor, threshold = 0.58) => {
  if (!storedDescriptor || !liveDescriptor) return {match: false, distance: 1.0};
  if (storedDescriptor.length !== liveDescriptor.length) return {match: false, distance: 1.0};
  const dist = cosineDistance(storedDescriptor, liveDescriptor);
  return {match: dist <= threshold, distance: dist};
};

export const embeddingToJson = (embedding) =>
  typeof embedding === 'string' ? embedding : JSON.stringify(Array.from(embedding));

export const jsonToEmbedding = (json) => {
  if (typeof json !== 'string') return new Float32Array(json);
  try {
    return new Float32Array(JSON.parse(json));
  } catch {
    return null;
  }
};
