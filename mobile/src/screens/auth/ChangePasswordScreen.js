import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';
import {changePassword} from '../../api/apiClient';

export default function ChangePasswordScreen() {
  const {user, updateUserData, logout} = useAuth();
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const handleSetPassword = async () => {
    setError('');

    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword.trim());
      await updateUserData({mustChangePassword: false});
      Alert.alert(
        'Password Created Successfully',
        'Your permanent password has been set. You can now use your account.',
      );
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Failed to update password. Please try again.';
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

          {/* Icon Header */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🔐</Text>
            </View>
            <Text style={styles.appName}>Create Your Password</Text>
            <Text style={styles.tagline}>
              Welcome, {user?.firstName ?? 'Intern'}!
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.securityBadge}>
              <Text style={styles.securityBadgeText}>
                🛡️ First-Time Security Activation
              </Text>
            </View>

            <Text style={styles.cardSubtitle}>
              Please set your permanent password to activate your account. You will use this password for all future logins.
            </Text>

            <TextInput
              label="New Password *"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showPass}
              left={<TextInput.Icon icon="lock-plus" />}
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

            <TextInput
              label="Confirm New Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showPass}
              left={<TextInput.Icon icon="lock-check" />}
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
              onPress={handleSetPassword}
              loading={loading}
              disabled={loading}
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              labelStyle={styles.actionBtnLabel}>
              Set Permanent Password
            </Button>
          </View>

          {/* Sign Out Option */}
          <Button
            mode="text"
            onPress={logout}
            textColor="#8B8DAA"
            style={styles.logoutBtn}>
            Sign Out
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:       {flex: 1},
  kav:            {flex: 1},
  scroll:         {flexGrow: 1, justifyContent: 'center', padding: 24},
  logoContainer:  {alignItems: 'center', marginBottom: 24},
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF22',
    borderWidth: 2,
    borderColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
  },
  logoIcon:       {fontSize: 36},
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E8EAF6',
    letterSpacing: 0.5,
  },
  tagline:        {color: '#00D2FF', fontSize: 14, fontWeight: '600', marginTop: 4},
  card: {
    backgroundColor: '#13152A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2C45',
    elevation: 8,
    marginBottom: 16,
  },
  securityBadge: {
    backgroundColor: '#6C63FF22',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6C63FF44',
  },
  securityBadgeText: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardSubtitle:   {color: '#8B8DAA', fontSize: 13, lineHeight: 19, marginBottom: 20},
  input:          {marginBottom: 14, backgroundColor: '#1E2035'},
  inputOutline:   {borderColor: '#3D3F5C', borderRadius: 10},
  errorText:      {marginBottom: 8},
  actionBtn: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    elevation: 4,
  },
  actionBtnContent: {paddingVertical: 6},
  actionBtnLabel:   {fontSize: 16, fontWeight: '700', color: '#fff'},
  logoutBtn: {
    marginTop: 8,
  },
});
