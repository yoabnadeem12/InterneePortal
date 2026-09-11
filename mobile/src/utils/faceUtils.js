import FaceDetection from '@react-native-ml-kit/face-detection';

export const detectFaces = async (imagePath) => {
  try {
    const faces = await FaceDetection.detect(imagePath, {
      performanceMode:    'fast',
      landmarkMode:       'all',
      contourMode:        'none',
      classificationMode: 'all',
      minFaceSize:        0.10,
    });
    return faces || [];
  } catch (e) {
    console.warn('ML Kit Face Detection warning:', e);
    return [];
  }
};

export const evaluateLivenessChallenge = (face, challengeId, stateRef) => {
  if (!face) return false;

  const leftEyeOpen  = face.leftEyeOpenProbability ?? 1.0;
  const rightEyeOpen = face.rightEyeOpenProbability ?? 1.0;
  const smilingProb  = face.smilingProbability ?? 0.0;
  const yawAngle     = face.headEulerAngleY ?? 0.0;

  switch (challengeId) {
    case 'blink': {
      // Step 1: Detect eyes closing (< 0.45)
      if (leftEyeOpen < 0.45 || rightEyeOpen < 0.45) {
        stateRef.eyesClosedDetected = true;
      }
      // Step 2: Detect eyes open (> 0.55) or after being closed
      if (stateRef.eyesClosedDetected && (leftEyeOpen > 0.55 || rightEyeOpen > 0.55)) {
        return true;
      }
      // If eyes are clearly closed or state tracked
      if (leftEyeOpen < 0.40 && rightEyeOpen < 0.40) {
        stateRef.eyesClosedDetected = true;
      }
      return stateRef.eyesClosedDetected;
    }

    case 'turn_left': {
      // Head yaw turned left: yawAngle < -8 degrees
      return yawAngle < -8.0;
    }

    case 'turn_right': {
      // Head yaw turned right: yawAngle > 8 degrees
      return yawAngle > 8.0;
    }

    case 'smile': {
      // Smiling probability > 0.35
      return smilingProb > 0.35;
    }

    default:
      return true;
  }
};

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
