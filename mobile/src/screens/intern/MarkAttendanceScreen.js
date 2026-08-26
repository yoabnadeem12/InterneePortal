import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator as RNActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import {Text, Button} from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
} from 'react-native-vision-camera';
import {useIsFocused} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import AppHeader from '../../components/AppHeader';
import {
  markAttendance,
  registerFace,
} from '../../api/apiClient';
import {
  detectFaces,
  evaluateLivenessChallenge,
  imageUriToBase64,
} from '../../utils/faceUtils';

const CHALLENGES = [
  { id: 'blink',      title: 'Blink Both Eyes',          icon: '👁️', instruction: 'Blink your eyes naturally' },
  { id: 'turn_left',  title: 'Turn Head Slightly Left',  icon: '⬅️', instruction: 'Turn your head slightly to the left' },
  { id: 'turn_right', title: 'Turn Head Slightly Right', icon: '➡️', instruction: 'Turn your head slightly to the right' },
  { id: 'smile',      title: 'Smile at the Camera',      icon: '😊', instruction: 'Smile naturally at the camera' },
];

const STEP = {
  IDLE:            'idle',
  REQUESTING_PERM: 'requesting_perm',
  SCANNING:        'scanning',
  CHALLENGE_ACTIVE:'challenge_active',
  CHALLENGE_PASSED:'challenge_passed',
  FACE_VERIFYING:  'face_verifying',
  FACE_SUCCESS:    'face_success',
  FACE_FAILED:     'face_failed',
  GPS_CHECKING:    'gps_checking',
  GPS_SUCCESS:     'gps_success',
  GPS_FAILED:      'gps_failed',
  MARKING:         'marking',
  DONE:            'done',
  ERROR:           'error',
};

export default function MarkAttendanceScreen({navigation, route}) {
  const mode  = route.params?.mode ?? 'checkin';
  const isReg = mode === 'register';

  const isFocused      = useIsFocused();
  const [isAppForeground, setIsAppForeground] = useState(true);
  const [cameraReady, setCameraReady]         = useState(false);

  const [step, setStep]       = useState(STEP.IDLE);
  const [message, setMessage] = useState('');
  const [permGranted, setPermGranted] = useState(false);

  // Active Liveness Challenge state
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengePassed, setChallengePassed]   = useState(false);
  const livenessStateRef = useRef({ eyesClosedDetected: false, attempts: 0 });

  const cameraRef   = useRef(null);
  const frontDevice = useCameraDevice('front');
  const backDevice  = useCameraDevice('back');
  const device      = frontDevice ?? backDevice;

  useEffect(() => {
    const sub = AppState.addEventListener('change', next =>
      setIsAppForeground(next === 'active'),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Pick random challenge for attendance verification
    if (!isReg) {
      const picked = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setCurrentChallenge(picked);
    }
    requestPermissions();
  }, []);

  const handleSafeGoBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else if (navigation?.navigate) {
      try { navigation.navigate('InternDash'); } catch (_) {}
    }
  };

  // ── Permissions ───────────────────────────────────────────────────────────
  const requestPermissions = async () => {
    setStep(STEP.REQUESTING_PERM);
    try {
      let camGranted = false;
      try {
        const camStatus = await Camera.requestCameraPermission();
        camGranted = camStatus === 'granted';
      } catch (_) {
        const p = await request(
          Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
        );
        camGranted = p === RESULTS.GRANTED;
      }

      let locGranted = true;
      if (!isReg) {
        const p = await request(
          Platform.OS === 'ios'
            ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
            : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        );
        locGranted = p === RESULTS.GRANTED;
      }

      if (camGranted && locGranted) {
        setPermGranted(true);
        setStep(STEP.SCANNING);
        if (isReg) {
          setMessage('Center your face in the oval frame and tap below');
        } else {
          setMessage('Look at the camera and perform the live challenge below');
        }
      } else {
        setStep(STEP.ERROR);
        setMessage(!camGranted ? 'Camera permission required.' : 'Location permission required.');
      }
    } catch (_) {
      setStep(STEP.ERROR);
      setMessage('Permission request failed.');
    }
  };

  // ── Core processing ───────────────────────────────────────────────────────
  const processFaceImage = async (imagePath, isPassedLiveness = false) => {
    setStep(STEP.FACE_VERIFYING);
    setMessage('🔍 Processing face image...');

    try {
      // 1. Fast on-device face detection check (ML Kit)
      const faces = await detectFaces(imagePath);
      if (!faces || faces.length === 0) {
        setStep(STEP.FACE_FAILED);
        setMessage(
          '❌ No face detected.\n\n' +
          '• Ensure bright, even lighting on your face\n' +
          '• Hold camera steady at eye level\n' +
          '• Make sure your full face is visible inside the oval',
        );
        return;
      }

      // Check active liveness challenge if not already passed
      let livenessSuccess = isPassedLiveness || isReg;
      if (!isReg && !livenessSuccess && currentChallenge) {
        const achieved = evaluateLivenessChallenge(faces[0], currentChallenge.id, livenessStateRef.current);
        if (achieved) {
          livenessSuccess = true;
          setChallengePassed(true);
        } else {
          // If not achieved yet, give helpful prompt
          livenessStateRef.current.attempts += 1;
          if (livenessStateRef.current.attempts > 1) {
            // After multiple frames without movement, alert to static photo
            setStep(STEP.FACE_FAILED);
            setMessage(
              `❌ Live motion not detected for "${currentChallenge.title}".\n\n` +
              `• Static photos and screen replays are not permitted.\n` +
              `• Please ${currentChallenge.instruction.toLowerCase()} live in front of the camera.`,
            );
            return;
          }
        }
      }

      // 2. Convert to Base64 in milliseconds
      setMessage('📤 Preparing photo for AI verification...');
      const base64Image = await imageUriToBase64(imagePath);

      if (isReg) {
        // Face Registration flow
        setMessage('💾 Enrolling face with ArcFace AI model...');
        await registerFace(base64Image);
        setStep(STEP.DONE);
        setMessage('✅ Face successfully registered & enrolled!');
        setTimeout(handleSafeGoBack, 2000);
        return;
      }

      // Attendance Check-In / Check-Out flow
      setMessage('📍 Acquiring GPS location...');
      setStep(STEP.GPS_CHECKING);

      Geolocation.getCurrentPosition(
        async position => {
          const {latitude, longitude} = position.coords;
          setStep(STEP.MARKING);
          setMessage('🔒 Running Anti-Spoofing & FaceNet AI verification...');

          try {
            const res = await markAttendance({
              type: mode,
              latitude,
              longitude,
              faceDescriptor: base64Image,
              livenessChallenge: currentChallenge?.id ?? 'blink',
              livenessPassed: true,
            });

            setStep(STEP.DONE);
            setMessage(`✅ ${res.data.message}`);
            setTimeout(handleSafeGoBack, 2500);
          } catch (apiErr) {
            const errMsg = apiErr?.response?.data?.message ?? 'Face verification failed.';
            setStep(STEP.FACE_FAILED);
            setMessage(`❌ ${errMsg}`);
          }
        },
        _err => {
          setStep(STEP.GPS_FAILED);
          setMessage('❌ Could not get GPS location. Please turn on location services.');
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 0},
      );
    } catch (e) {
      console.error('processFaceImage error:', e);
      const errMsg = e?.response?.data?.message || e?.message || 'Verification error occurred.';
      setStep(STEP.ERROR);
      setMessage(`⚠️ ${errMsg}`);
    }
  };

  // ── Camera capture with Active Liveness Verification ───────────────────────
  const captureAndProcess = async () => {
    if (!cameraRef.current) return;

    // For attendance check-in/out: perform active challenge check
    if (!isReg && currentChallenge && !challengePassed) {
      setStep(STEP.CHALLENGE_ACTIVE);
      setMessage(`👉 ${currentChallenge.instruction}...`);

      try {
        // Capture initial frame
        const photo1 = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed', flash: 'off' });
        const uri1 = photo1.path.startsWith('file://') ? photo1.path : `file://${photo1.path}`;
        const faces1 = await detectFaces(uri1);

        if (faces1 && faces1.length > 0) {
          evaluateLivenessChallenge(faces1[0], currentChallenge.id, livenessStateRef.current);
        }

        // Wait briefly for user movement
        await new Promise(r => setTimeout(r, 450));

        // Capture second frame to verify dynamic movement
        const photo2 = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed', flash: 'off' });
        const uri2 = photo2.path.startsWith('file://') ? photo2.path : `file://${photo2.path}`;
        const faces2 = await detectFaces(uri2);

        let passed = false;
        if (faces2 && faces2.length > 0) {
          passed = evaluateLivenessChallenge(faces2[0], currentChallenge.id, livenessStateRef.current);
        }

        if (passed) {
          setChallengePassed(true);
          setStep(STEP.CHALLENGE_PASSED);
          setMessage(`✅ ${currentChallenge.title} Verified!`);
          await processFaceImage(uri2, true);
        } else {
          // If dynamic motion was not registered (e.g. static photo)
          await processFaceImage(uri2, false);
        }
      } catch (e) {
        console.warn('Liveness capture error:', e);
        setStep(STEP.FACE_FAILED);
        setMessage('❌ Could not complete liveness challenge. Please try again.');
      }
      return;
    }

    // Direct capture for registration or if challenge already passed
    try {
      let photo;
      try {
        photo = await cameraRef.current.takeSnapshot({quality: 90});
      } catch (_) {
        photo = await cameraRef.current.takePhoto({
          qualityPrioritization: 'speed',
          flash: 'off',
          skipMetadata: true,
        });
      }
      if (!photo?.path) throw new Error('No image');
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      await processFaceImage(uri, challengePassed);
    } catch (e) {
      console.warn('Camera capture error:', e);
      setStep(STEP.FACE_FAILED);
      setMessage('❌ Camera capture failed. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await launchImageLibrary({mediaType: 'photo', quality: 0.9});
      if (result.didCancel) return;
      if (result.errorCode) { Alert.alert('Error', result.errorMessage); return; }
      const uri = result.assets?.[0]?.uri;
      if (uri) await processFaceImage(uri, true);
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const retry = () => {
    // Pick a new random challenge on retry
    if (!isReg) {
      const picked = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setCurrentChallenge(picked);
    }
    setChallengePassed(false);
    livenessStateRef.current = { eyesClosedDetected: false, attempts: 0 };
    setStep(STEP.SCANNING);
    setMessage(isReg ? 'Center your face in the oval frame and tap below' : 'Look at the camera and perform the live challenge below');
  };

  // ── Camera state ──────────────────────────────────────────────────────────
  const isCameraActive = isFocused && isAppForeground && permGranted && [STEP.SCANNING, STEP.CHALLENGE_ACTIVE].includes(step);
  const isProcessing   = [STEP.FACE_VERIFYING, STEP.GPS_CHECKING, STEP.MARKING, STEP.REQUESTING_PERM, STEP.CHALLENGE_ACTIVE].includes(step);

  const titles = {checkin: 'Mark Check-In', checkout: 'Mark Check-Out', register: 'Register Face'};

  const stepIcons = {
    [STEP.IDLE]:           '⏳',
    [STEP.REQUESTING_PERM]:'🔑',
    [STEP.SCANNING]:       '📷',
    [STEP.CHALLENGE_ACTIVE]:'🔄',
    [STEP.CHALLENGE_PASSED]:'✅',
    [STEP.FACE_VERIFYING]: '🔒',
    [STEP.FACE_SUCCESS]:   '✅',
    [STEP.FACE_FAILED]:    '❌',
    [STEP.GPS_CHECKING]:   '📍',
    [STEP.GPS_SUCCESS]:    '✅',
    [STEP.GPS_FAILED]:     '❌',
    [STEP.MARKING]:        '📤',
    [STEP.DONE]:           '✅',
    [STEP.ERROR]:          '⚠️',
  };

  return (
    <View style={styles.root}>
      <AppHeader title={titles[mode]} navigation={navigation} showBack />

      {/* Camera view */}
      <View style={styles.cameraContainer}>
        {permGranted && device ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isCameraActive}
            photo={true}
            androidPreviewViewType="texture-view"
            onInitialized={() => setCameraReady(true)}
            onError={err => console.warn('Camera error:', err)}
          />
        ) : (
          <View style={styles.noCameraBox}>
            <RNActivityIndicator color="#6C63FF" size="large" />
            <Text style={styles.noCameraText}>
              {!permGranted ? 'Requesting permissions…' : 'No camera device found'}
            </Text>
          </View>
        )}

        {/* Face oval guide */}
        {(step === STEP.SCANNING || step === STEP.CHALLENGE_ACTIVE) && (
          <View style={styles.faceGuide}>
            <View style={[styles.faceOval, challengePassed && styles.faceOvalSuccess]} />
            <Text style={styles.faceGuideLabel}>
              {isReg ? 'ArcFace AI — Center Face Here' : 'Anti-Spoofing & Liveness Guard'}
            </Text>
          </View>
        )}

        {/* Active Challenge HUD banner */}
        {!isReg && currentChallenge && (step === STEP.SCANNING || step === STEP.CHALLENGE_ACTIVE) && (
          <View style={styles.challengeBanner}>
            <Text style={styles.challengeIcon}>{currentChallenge.icon}</Text>
            <View style={styles.challengeTextCol}>
              <Text style={styles.challengeTitle}>Live Challenge: {currentChallenge.title}</Text>
              <Text style={styles.challengeSubtitle}>{currentChallenge.instruction}</Text>
            </View>
          </View>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <RNActivityIndicator color="#6C63FF" size="large" />
            <Text style={styles.processingText}>{message}</Text>
          </View>
        )}
      </View>

      {/* Status panel */}
      <View style={styles.statusPanel}>
        {/* Step indicators */}
        <View style={styles.stepRow}>
          {isReg ? (
            <>
              <StepDot label="Capture" active={step !== STEP.IDLE} done={step === STEP.DONE} />
              <StepLine />
              <StepDot label="ArcFace AI" active={[STEP.FACE_VERIFYING, STEP.DONE].includes(step)} done={step === STEP.DONE} />
              <StepLine />
              <StepDot label="Enrolled" active={step === STEP.DONE} done={step === STEP.DONE} />
            </>
          ) : (
            <>
              <StepDot label="Liveness" active={step !== STEP.IDLE} done={challengePassed || [STEP.GPS_CHECKING, STEP.MARKING, STEP.DONE].includes(step)} />
              <StepLine />
              <StepDot label="Anti-Spoof" active={[STEP.FACE_VERIFYING, STEP.GPS_CHECKING, STEP.MARKING, STEP.DONE].includes(step)} done={[STEP.GPS_CHECKING, STEP.MARKING, STEP.DONE].includes(step)} />
              <StepLine />
              <StepDot label="GPS" active={[STEP.GPS_CHECKING, STEP.MARKING, STEP.DONE].includes(step)} done={[STEP.MARKING, STEP.DONE].includes(step)} />
              <StepLine />
              <StepDot label="Verified" active={[STEP.MARKING, STEP.DONE].includes(step)} done={step === STEP.DONE} />
            </>
          )}
        </View>

        <Text style={styles.stepIcon}>{stepIcons[step] ?? '⏳'}</Text>
        {!isProcessing && <Text style={styles.statusMessage}>{message}</Text>}

        {/* Buttons */}
        {step === STEP.SCANNING && (
          <View style={styles.actionBtnGroup}>
            <Button
              mode="contained"
              style={styles.captureBtn}
              contentStyle={styles.captureBtnContent}
              labelStyle={styles.captureBtnLabel}
              icon="camera"
              onPress={captureAndProcess}>
              {isReg ? 'Capture & Enroll Face' : `Perform ${currentChallenge?.title ?? 'Liveness Check'}`}
            </Button>
            {/* Gallery upload is allowed ONLY during enrollment, disabled during live attendance verification */}
            {isReg && (
              <Button
                mode="text"
                icon="image-outline"
                labelStyle={styles.galleryBtnLabel}
                onPress={pickFromGallery}>
                Or choose from gallery
              </Button>
            )}
          </View>
        )}

        {[STEP.FACE_FAILED, STEP.GPS_FAILED, STEP.ERROR].includes(step) && (
          <View style={styles.actionBtnGroup}>
            <Button
              mode="contained"
              style={styles.captureBtn}
              labelStyle={styles.captureBtnLabel}
              onPress={retry}>
              Try Again (New Challenge)
            </Button>
          </View>
        )}

        {step === STEP.DONE && (
          <Button
            mode="contained"
            style={[styles.captureBtn, {backgroundColor: '#4CAF50'}]}
            labelStyle={styles.captureBtnLabel}
            onPress={handleSafeGoBack}>
            Done
          </Button>
        )}
      </View>
    </View>
  );
}

const StepDot = ({label, active, done}) => (
  <View style={styles.stepDotContainer}>
    <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
      <Text style={styles.stepDotText}>{done ? '✓' : ''}</Text>
    </View>
    <Text style={[styles.stepDotLabel, active && {color: '#6C63FF'}]}>{label}</Text>
  </View>
);

const StepLine = () => <View style={styles.stepLine} />;

const styles = StyleSheet.create({
  root:            {flex: 1, backgroundColor: '#0D0E1A'},
  cameraContainer: {flex: 1, backgroundColor: '#000', position: 'relative'},
  noCameraBox:     {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  noCameraText:    {color: '#8B8DAA', fontSize: 14},
  faceGuide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: 220, height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  faceOvalSuccess: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
  },
  faceGuideLabel: {
    color: '#6C63FF',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '600',
  },
  challengeBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 29, 58, 0.92)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  challengeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  challengeTextCol: {
    flex: 1,
  },
  challengeTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  challengeSubtitle: {
    color: '#A0A3BD',
    fontSize: 12,
    marginTop: 2,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {color: '#E8EAF6', fontSize: 14, textAlign: 'center', paddingHorizontal: 24},
  statusPanel: {
    backgroundColor: '#13152A',
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2A2C45',
    minHeight: 240,
    alignItems: 'center',
  },
  stepRow:          {flexDirection: 'row', alignItems: 'center', marginBottom: 16, width: '90%'},
  stepDotContainer: {alignItems: 'center'},
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#2A2C45',
    borderWidth: 2, borderColor: '#3D3F5C',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: {borderColor: '#6C63FF', backgroundColor: '#6C63FF22'},
  stepDotDone:   {borderColor: '#4CAF50', backgroundColor: '#4CAF50'},
  stepDotText:   {color: '#fff', fontSize: 11, fontWeight: '700'},
  stepDotLabel:  {color: '#8B8DAA', fontSize: 8, marginTop: 4, fontWeight: '600'},
  stepLine:      {flex: 1, height: 2, backgroundColor: '#3D3F5C'},
  stepIcon:      {fontSize: 30, marginBottom: 6},
  statusMessage: {color: '#E8EAF6', fontSize: 13, textAlign: 'center', lineHeight: 19},
  actionBtnGroup: {width: '100%', alignItems: 'center', gap: 8, marginTop: 10},
  captureBtn:         {borderRadius: 12, backgroundColor: '#6C63FF', width: '100%'},
  captureBtnDisabled: {backgroundColor: '#3D3F5C'},
  captureBtnContent:  {paddingVertical: 8},
  captureBtnLabel:    {fontSize: 15, fontWeight: '700', color: '#fff'},
  galleryBtnLabel:    {fontSize: 13, color: '#8B8DAA'},
  retryBtn:           {borderRadius: 12, borderColor: '#6C63FF', width: '100%'},
});
