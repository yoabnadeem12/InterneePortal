import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {Text, TextInput, Button, HelperText} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';

export default function LoginScreen() {
  const {login} = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginError, setLoginError]   = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const validate = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password.trim()) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoginError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password.trim());
    } catch (err) {
      console.log('Login error:', err);
      const serverMsg = err?.response?.data?.message;
      if (serverMsg) {
        setLoginError(serverMsg);
      } else if (err?.message?.includes('Network Error')) {
        setLoginError('Unable to connect to server. Check connection or adb reverse.');
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* Top brand header */}
        <LinearGradient
          colors={['#F9FAF8', '#F0FDF4', '#E6F4EA']}
          style={styles.headerBg}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.logoCircle}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.appTitle}>PIA Attendance</Text>
            <Text style={styles.appSubtitle}>Smart Biometric Verification Portal</Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Your Account</Text>

          {loginError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Username */}
          <TextInput
            label="Username"
            value={username}
            onChangeText={t => {
              setUsername(t);
              if (fieldErrors.username) setFieldErrors(e => ({...e, username: null}));
            }}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="account" iconColor="#047857" />}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {fieldErrors.username ? (
            <HelperText type="error" visible>
              {fieldErrors.username}
            </HelperText>
          ) : null}

          {/* Password */}
          <TextInput
            label="Password"
            value={password}
            onChangeText={t => {
              setPassword(t);
              if (fieldErrors.password) setFieldErrors(e => ({...e, password: null}));
            }}
            mode="outlined"
            secureTextEntry={!showPass}
            left={<TextInput.Icon icon="lock" iconColor="#047857" />}
            right={
              <TextInput.Icon
                icon={showPass ? 'eye-off' : 'eye'}
                iconColor="#78716C"
                onPress={() => setShowPass(p => !p)}
              />
            }
            style={styles.input}
            outlineStyle={styles.inputOutline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {fieldErrors.password ? (
            <HelperText type="error" visible>
              {fieldErrors.password}
            </HelperText>
          ) : null}

          {/* Submit */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={submitting}
            disabled={submitting}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}>
            Sign In
          </Button>

          {/* Roles hint */}
          <View style={styles.rolesHint}>
            <Text style={styles.rolesHintTitle}>Portals Included:</Text>
            <Text style={styles.rolesHintItem}>� Administrator (Full Management)</Text>
            <Text style={styles.rolesHintItem}>� Mentor (Intern Tracking & Reports)</Text>
            <Text style={styles.rolesHintItem}>� Intern (Face AI & GPS Attendance)</Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  scroll: {
    flexGrow: 1,
  },
  headerBg: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#047857',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 4,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FAF7F0',
  },
  inputOutline: {
    borderRadius: 12,
    borderColor: '#E5DDD0',
  },
  btn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#047857',
    elevation: 3,
    shadowColor: '#047857',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  btnContent: {
    paddingVertical: 6,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rolesHint: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
  },
  rolesHintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rolesHintItem: {
    fontSize: 12,
    color: '#78716C',
    marginVertical: 2,
    fontWeight: '500',
  },
});
