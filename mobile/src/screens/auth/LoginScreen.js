import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';

export default function LoginScreen() {
  const {login} = useAuth();
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      let msg = 'Login failed. Check your credentials.';
      if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message === 'Network Error' || !e?.response) {
        msg = 'Cannot connect to backend server. Make sure port 5000 is running and forwarded.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0D0E1A', '#13152A', '#1A1C33']}
      style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0E1A" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo / branding */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>📋</Text>
            </View>
            <Text style={styles.appName}>PIA Attendance</Text>
            <Text style={styles.tagline}>Intern Management System</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>
              Sign in to your account to continue
            </Text>

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor="#E8EAF6"
              placeholderTextColor="#6B6D8A"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPass}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPass ? 'eye-off' : 'eye'}
                  onPress={() => setShowPass(p => !p)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor="#E8EAF6"
            />

            {error ? (
              <HelperText type="error" visible style={styles.errorText}>
                ⚠️  {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
              contentStyle={styles.loginBtnContent}
              labelStyle={styles.loginBtnLabel}>
              Sign In
            </Button>
          </View>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>Role-based login</Text>
            <Text style={styles.hintRow}>🛡  Admin → username: admin</Text>
            <Text style={styles.hintRow}>👨‍🏫 Mentor → firstname.Mentor.Dept</Text>
            <Text style={styles.hintRow}>🎓  Intern → firstname.PIA.001</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:       {flex: 1},
  kav:            {flex: 1},
  scroll:         {flexGrow: 1, justifyContent: 'center', padding: 24},
  logoContainer:  {alignItems: 'center', marginBottom: 32},
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
  },
  logoIcon:       {fontSize: 36},
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E8EAF6',
    letterSpacing: 1,
  },
  tagline:        {color: '#8B8DAA', fontSize: 13, marginTop: 4},
  card: {
    backgroundColor: '#13152A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2C45',
    elevation: 8,
    marginBottom: 20,
  },
  cardTitle:      {color: '#E8EAF6', fontSize: 22, fontWeight: '700', marginBottom: 4},
  cardSubtitle:   {color: '#8B8DAA', fontSize: 13, marginBottom: 24},
  input:          {marginBottom: 14, backgroundColor: '#1E2035'},
  inputOutline:   {borderColor: '#3D3F5C', borderRadius: 10},
  errorText:      {marginBottom: 8},
  loginBtn: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    elevation: 4,
  },
  loginBtnContent: {paddingVertical: 6},
  loginBtnLabel:   {fontSize: 16, fontWeight: '700', letterSpacing: 0.5, color: '#fff'},
  hintBox: {
    backgroundColor: '#1A1C33',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  hintTitle:      {color: '#6C63FF', fontWeight: '700', marginBottom: 8, fontSize: 13},
  hintRow:        {color: '#8B8DAA', fontSize: 12, marginBottom: 4},
});
