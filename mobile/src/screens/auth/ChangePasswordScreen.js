import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {Text, TextInput, Button, HelperText} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';
import {changePassword} from '../../api/apiClient';

export default function ChangePasswordScreen() {
  const {user, logout} = useAuth();
  const isFirstLogin = user?.mustChangePassword === true;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [errors, setErrors]                   = useState({});

  const validate = () => {
    const e = {};
    // Only require current password when it's NOT a forced first-login reset
    if (!isFirstLogin && !currentPassword.trim()) e.current = 'Current password is required';
    if (!newPassword.trim())     e.new     = 'New password is required';
    else if (newPassword.length < 6) e.new  = 'Password must be at least 6 characters';
    if (newPassword !== confirmPassword) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Pass null as oldPassword on first-login so backend skips verification
      const oldPass = isFirstLogin ? null : currentPassword.trim();
      await changePassword(newPassword.trim(), oldPass); // apiClient: (newPassword, oldPassword)
      Alert.alert(
        'Password Changed Successfully!',
        'Please sign in again with your new password.',
        [{text: 'OK', onPress: () => logout()}],
      );
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* Top Header */}
        <LinearGradient
          colors={['#F9FAF8', '#F0FDF4', '#E6F4EA']}
          style={styles.headerBg}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.logoCircle}>
              <MaterialCommunityIcons name="shield-lock-outline" size={44} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.appTitle}>Change Password</Text>
            <Text style={styles.appSubtitle}>
              {isFirstLogin
                ? `Welcome, ${user?.firstName}! For your security, you must set a permanent password before accessing the system.`
                : `Hello, ${user?.firstName}! Enter your current password to set a new one.`}
            </Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.securityBadge}>
            <MaterialCommunityIcons name="shield-check" size={18} color="#047857" />
            <Text style={styles.securityBadgeText}>First-Time Security Setup</Text>
          </View>

          {/* Current Password — hidden on first-login temp password reset */}
          {!isFirstLogin && (
            <>
              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={t => {
                  setCurrentPassword(t);
                  if (errors.current) setErrors(e => ({...e, current: null}));
                }}
                mode="outlined"
                secureTextEntry={!showCurrent}
                left={<TextInput.Icon icon="lock-outline" iconColor="#047857" />}
                right={
                  <TextInput.Icon
                    icon={showCurrent ? 'eye-off' : 'eye'}
                    iconColor="#78716C"
                    onPress={() => setShowCurrent(p => !p)}
                  />
                }
                style={styles.input}
                outlineStyle={styles.inputOutline}
                textColor="#1C1917"
                theme={{colors: {primary: '#047857'}}}
              />
              {errors.current ? (
                <HelperText type="error" visible>
                  {errors.current}
                </HelperText>
              ) : null}
            </>
          )}

          {/* New Password */}
          <TextInput
            label="New Password (min 6 characters)"
            value={newPassword}
            onChangeText={t => {
              setNewPassword(t);
              if (errors.new) setErrors(e => ({...e, new: null}));
            }}
            mode="outlined"
            secureTextEntry={!showNew}
            left={<TextInput.Icon icon="lock-check-outline" iconColor="#047857" />}
            right={
              <TextInput.Icon
                icon={showNew ? 'eye-off' : 'eye'}
                iconColor="#78716C"
                onPress={() => setShowNew(p => !p)}
              />
            }
            style={styles.input}
            outlineStyle={styles.inputOutline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.new ? (
            <HelperText type="error" visible>
              {errors.new}
            </HelperText>
          ) : null}

          {/* Confirm Password */}
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={t => {
              setConfirmPassword(t);
              if (errors.confirm) setErrors(e => ({...e, confirm: null}));
            }}
            mode="outlined"
            secureTextEntry={!showConfirm}
            left={<TextInput.Icon icon="lock-reset" iconColor="#047857" />}
            right={
              <TextInput.Icon
                icon={showConfirm ? 'eye-off' : 'eye'}
                iconColor="#78716C"
                onPress={() => setShowConfirm(p => !p)}
              />
            }
            style={styles.input}
            outlineStyle={styles.inputOutline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.confirm ? (
            <HelperText type="error" visible>
              {errors.confirm}
            </HelperText>
          ) : null}

          {/* Submit */}
          <Button
            mode="contained"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}>
            Update Password & Continue
          </Button>

          {/* Sign out link */}
          <Button
            mode="text"
            onPress={logout}
            textColor="#78716C"
            style={styles.cancelBtn}>
            Cancel and Sign Out
          </Button>
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
    paddingTop: 50,
    paddingBottom: 36,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 5,
    shadowColor: '#047857',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -16,
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
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20,
    gap: 8,
  },
  securityBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    marginBottom: 6,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    marginTop: 10,
  },
});
