// API base URL — uses adb reverse tunnel so device reaches local backend
// Run: adb reverse tcp:5000 tcp:5000
export const API_BASE_URL = 'http://localhost:5000'; // Physical device with adb reverse
// For Android emulator:
// export const API_BASE_URL = 'http://10.0.2.2:5000';

// GPS
export const GEO_RADIUS_METERS = 50;

// Face recognition — MobileFaceNet cosine distance
// Genuine pairs (same person): typically 0.2–0.55
// Imposters (different people): typically 0.7–1.5
export const FACE_MATCH_THRESHOLD = 0.60;

// Shift IDs
export const SHIFT_1_ID = 1;
export const SHIFT_2_ID = 2;
