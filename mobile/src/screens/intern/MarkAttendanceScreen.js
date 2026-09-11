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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
  uploadAttendancePhoto,
  uploadCheckInPhoto,
} from '../../api/apiClient';
import {
  detectFaces,
  evaluateLivenessChallenge,
  imageUriToBase64,
} from '../../utils/faceUtils';

const CHALLENGES = [
  { id: 'blink',      title: 'Blink Both Eyes',          iconName: 'eye-outline', instruction: 'Blink your eyes naturally' },
  { id: 'turn_left',  title: 'Turn Head Slightly Left',  iconName: 'arrow-left-circle', instruction: 'Turn your head slightly to the left' },
  { id: 'turn_right', title: 'Turn Head Slightly Right', iconName: 'arrow-right-circle', instruction: 'Turn your head slightly to the right' },
  { id: 'smile',      title: 'Smile at the Camera',      iconName: 'emoticon-happy-outline', instruction: 'Smile naturally at the camera' },
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

  // Stores the server-hosted URL of the latest audit photo.
  // Updated on every check-in attempt so mentor always sees who was present.
  const auditPhotoUrlRef = useRef(null);

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

  // Permissions
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

  // Core processing
  const processFaceImage = async (imagePath, isPassedLiveness = false) => {
    setStep(STEP.FACE_VERIFYING);
    setMessage('Processing face image...');

    try {
      // 1. Fast on-device face detection check (ML Kit)
      const faces = await detectFaces(imagePath);
      if (!faces || faces.length === 0) {
        setStep(STEP.FACE_FAILED);
        setMessage(
          'No face detected.\n\n' +
          '� Ensure bright, even lighting on your face\n' +
          '� Hold camera steady at eye level\n' +
          '� Make sure your full face is visible inside the oval',
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
          livenessStateRef.current.attempts += 1;
          if (livenessStateRef.current.attempts > 2) {
            setStep(STEP.FACE_FAILED);
            setMessage(
              `Live motion not detected for "${currentChallenge.title}".\n\n` +
              `� Static photos and screen replays are not permitted.\n` +
              `� Please ${currentChallenge.instruction.toLowerCase()} live in front of the camera.`,
            );
            return;
          }
        }
      }

      // 2. Convert to Base64 in milliseconds
      setMessage('Preparing photo for AI verification...');
      const base64Image = await imageUriToBase64(imagePath);

      if (isReg) {
        // Face Registration flow
        setMessage('Enrolling face with ArcFace AI model...');
        await registerFace(base64Image);
        setStep(STEP.DONE);
        setMessage('Face successfully registered & enrolled!');
        setTimeout(handleSafeGoBack, 2000);
        return;
      }

      // Attendance Check-In / Check-Out flow
      setMessage('Acquiring GPS location...');
      setStep(STEP.GPS_CHECKING);

      Geolocation.getCurrentPosition(
        async position => {
          const {latitude, longitude} = position.coords;
          setStep(STEP.MARKING);
          setMessage('Running Anti-Spoofing & FaceNet AI verification...');

          try {
            if (!isReg && !auditPhotoUrlRef.current && imagePath) {
              try {
                const upRes = await uploadAttendancePhoto(imagePath, mode);
                if (upRes?.data?.photoUrl) auditPhotoUrlRef.current = upRes.data.photoUrl;
              } catch (_) {}
            }
            const res = await markAttendance({
              type: mode,
              latitude,
              longitude,
              faceDescriptor: base64Image,
              livenessChallenge: currentChallenge?.id ?? 'blink',
              livenessPassed: true,
              checkInPhotoUrl: mode === 'checkin' ? auditPhotoUrlRef.current : undefined,
              checkOutPhotoUrl: mode === 'checkout' ? auditPhotoUrlRef.current : undefined,
              photoUrl: auditPhotoUrlRef.current,
            });

            setStep(STEP.DONE);
            setMessage(`${res.data.message}`);
            setTimeout(handleSafeGoBack, 2500);
          } catch (apiErr) {
            const errMsg = apiErr?.response?.data?.message ?? 'Face verification failed.';
            setStep(STEP.FACE_FAILED);
            setMessage(`${errMsg}`);
          }
        },
        _err => {
          setStep(STEP.GPS_FAILED);
          setMessage('Could not get GPS location. Please turn on location services.');
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 0},
      );
    } catch (e) {
      console.error('processFaceImage error:', e);
      const errMsg = e?.response?.data?.message || e?.message || 'Verification error occurred.';
      setStep(STEP.ERROR);
      setMessage(`${errMsg}`);
    }
  };

  // Camera capture with Active Liveness Verification
  const captureAndProcess = async () => {
    if (!cameraRef.current) return;

    if (!isReg && currentChallenge && !challengePassed) {
      setStep(STEP.CHALLENGE_ACTIVE);
      setMessage(`${currentChallenge.instruction}...`);

      try {
        const photo1 = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed', flash: 'off' });
        const uri1 = photo1.path.startsWith('file://') ? photo1.path : `file://${photo1.path}`;
        const faces1 = await detectFaces(uri1);

        if (faces1 && faces1.length > 0) {
          evaluateLivenessChallenge(faces1[0], currentChallenge.id, livenessStateRef.current);
        }

        await new Promise(r => setTimeout(r, 450));

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
          setMessage(`${currentChallenge.title} Verified!`);
          await processFaceImage(uri2, true);
        } else {
          await processFaceImage(uri2, false);
        }
      } catch (e) {
        console.warn('Liveness capture error:', e);
        setStep(STEP.FACE_FAILED);
        setMessage('Could not complete liveness challenge. Please try again.');
      }
      return;
    }

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
      setMessage('Camera capture failed. Please try again.');
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
    auditPhotoUrlRef.current = null;
    if (!isReg) {
      const picked = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setCurrentChallenge(picked);
    }
    setChallengePassed(false);
    livenessStateRef.current = { eyesClosedDetected: false, attempts: 0 };
    setStep(STEP.SCANNING);
    setMessage(isReg ? 'Center your face in the oval frame and tap below' : 'Look at the camera and perform the live challenge below');
  };

  const isCameraActive = isFocused && isAppForeground && permGranted && [STEP.SCANNING, STEP.CHALLENGE_ACTIVE].includes(step);
  const isProcessing   = [STEP.FACE_VERIFYING, STEP.GPS_CHECKING, STEP.MARKING, STEP.REQUESTING_PERM, STEP.CHALLENGE_ACTIVE].includes(step);

  const titles = {checkin: 'Mark Check-In', checkout: 'Mark Check-Out', register: 'Register Face'};

  const stepIcons = {
    [STEP.IDLE]:            {name: 'clock-outline', color: '#78716C'},
    [STEP.REQUESTING_PERM]: {name: 'key-outline', color: '#047857'},
    [STEP.SCANNING]:        {name: 'camera-outline', color: '#047857'},
    [STEP.CHALLENGE_ACTIVE]:{name: 'sync', color: '#047857'},
    [STEP.CHALLENGE_PASSED]:{name: 'check-circle', color: '#16A34A'},
    [STEP.FACE_VERIFYING]:  {name: 'shield-account', color: '#047857'},
    [STEP.FACE_SUCCESS]:    {name: 'check-circle', color: '#16A34A'},
    [STEP.FACE_FAILED]:     {name: 'close-circle', color: '#DC2626'},
    [STEP.GPS_CHECKING]:    {name: 'map-marker-radius', color: '#047857'},
    [STEP.GPS_SUCCESS]:     {name: 'check-circle', color: '#16A34A'},
    [STEP.GPS_FAILED]:      {name: 'close-circle', color: '#DC2626'},
    [STEP.MARKING]:         {name: 'cloud-upload', color: '#047857'},
    [STEP.DONE]:            {name: 'check-decagram', color: '#16A34A'},
    [STEP.ERROR]:           {name: 'alert-circle', color: '#DC2626'},
  };

  const currentStepIcon = stepIcons[step] || {name: 'information-outline', color: '#78716C'};

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
            <RNActivityIndicator color="#047857" size="large" />
            <Text style={styles.noCameraText}>
              {!permGranted ? 'Requesting permissions�' : 'No camera device found'}
            </Text>
          </View>
        )}

        {/* Face oval guide */}
        {(step === STEP.SCANNING || step === STEP.CHALLENGE_ACTIVE) && (
          <View style={styles.faceGuide}>
            <View style={[styles.faceOval, challengePassed && styles.faceOvalSuccess]} />
            <Text style={styles.faceGuideLabel}>
              {isReg ? 'ArcFace AI � Center Face Here' : 'Anti-Spoofing & Liveness Guard'}
            </Text>
          </View>
        )}

        {/* Active Challenge HUD banner */}
        {!isReg && currentChallenge && (step === STEP.SCANNING || step === STEP.CHALLENGE_ACTIVE) && (
          <View style={styles.challengeBanner}>
            <MaterialCommunityIcons name={currentChallenge?.iconName || 'eye-outline'} size={28} color="#047857" style={{marginRight: 12}} />
            <View style={styles.challengeTextCol}>
              <Text style={styles.challengeTitle}>Live Challenge: {currentChallenge.title}</Text>
              <Text style={styles.challengeSubtitle}>{currentChallenge.instruction}</Text>
            </View>
          </View>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <RNActivityIndicator color="#047857" size="large" />
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

        <MaterialCommunityIcons name={currentStepIcon?.name || 'information-outline'} size={32} color={currentStepIcon.color} style={{marginBottom: 6}} />
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
            style={[styles.captureBtn, {backgroundColor: '#16A34A'}]}
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
      {done ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
    </View>
    <Text style={[styles.stepDotLabel, active && {color: '#047857'}]}>{label}</Text>
  </View>
);

const StepLine = () => <View style={styles.stepLine} />;

const styles = StyleSheet.create({
  root:            {flex: 1, backgroundColor: '#FBF9F5'},
  cameraContainer: {flex: 1, backgroundColor: '#000', position: 'relative'},
  noCameraBox:     {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  noCameraText:    {color: '#78716C', fontSize: 14},
  faceGuide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: 220, height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#047857',
    borderStyle: 'dashed',
  },
  faceOvalSuccess: {
    borderColor: '#16A34A',
    borderStyle: 'solid',
  },
  faceGuideLabel: {
    color: '#047857',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '700',
  },
  challengeBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#047857',
    shadowColor: '#047857',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  challengeTextCol: {
    flex: 1,
  },
  challengeTitle: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '700',
  },
  challengeSubtitle: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {color: '#1C1917', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24},
  statusPanel: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
    minHeight: 240,
    alignItems: 'center',
    elevation: 4,
  },
  stepRow:          {flexDirection: 'row', alignItems: 'center', marginBottom: 16, width: '90%'},
  stepDotContainer: {alignItems: 'center'},
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FAF7F0',
    borderWidth: 2, borderColor: '#EAE2D5',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: {borderColor: '#047857', backgroundColor: '#D1FAE5'},
  stepDotDone:   {borderColor: '#16A34A', backgroundColor: '#16A34A'},
  stepDotLabel:  {color: '#78716C', fontSize: 8, marginTop: 4, fontWeight: '600'},
  stepLine:      {flex: 1, height: 2, backgroundColor: '#EAE2D5'},
  statusMessage: {color: '#1C1917', fontSize: 13, textAlign: 'center', lineHeight: 19, fontWeight: '500'},
  actionBtnGroup: {width: '100%', alignItems: 'center', gap: 8, marginTop: 10},
  captureBtn:         {borderRadius: 12, backgroundColor: '#047857', width: '100%', elevation: 2},
  captureBtnDisabled: {backgroundColor: '#D1D5DB'},
  captureBtnContent:  {paddingVertical: 8},
  captureBtnLabel:    {fontSize: 15, fontWeight: '700', color: '#fff'},
  galleryBtnLabel:    {fontSize: 13, color: '#78716C', fontWeight: '600'},
  retryBtn:           {borderRadius: 12, borderColor: '#047857', width: '100%'},
});
