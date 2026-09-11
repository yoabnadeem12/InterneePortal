import React, {useState, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Switch,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {
  createMentor,
  updateMentor,
  getDepartments,
} from '../../api/apiClient';

const DropdownItem = ({item, selected, onPress}) => (
  <TouchableOpacity
    style={[styles.dropItem, selected && styles.dropItemSelected]}
    activeOpacity={0.7}
    onPress={onPress}>
    <Text style={[styles.dropItemText, selected && {color: '#047857', fontWeight: '700'}]}>
      {item.name}
    </Text>
  </TouchableOpacity>
);

export default function MentorFormScreen({navigation, route}) {
  const editMentor = route.params?.mentor ?? null;
  const isEdit     = !!editMentor;

  const [firstName, setFirstName]   = useState(editMentor?.firstName ?? '');
  const [lastName, setLastName]     = useState(editMentor?.lastName ?? '');
  const [email, setEmail]           = useState(editMentor?.email ?? '');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [deptId, setDeptId]         = useState(editMentor?.departmentId ?? null);
  const [isActive, setIsActive]     = useState(editMentor?.isActive ?? true);
  const [departments, setDepts]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [errors, setErrors]         = useState({});
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchDepts = useCallback(async () => {
    try {
      const r = await getDepartments();
      setDepts(r.data || []);
    } catch (e) {
      console.error('Failed to load departments:', e);
    } finally {
      setDeptsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDepts();
    }, [fetchDepts])
  );

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!deptId)            e.dept      = 'Please select a department';
    if (!isEdit && !password.trim()) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim() || undefined,
        departmentId: deptId,
        password:  password.trim() || undefined,
        isActive,
      };
      if (isEdit) {
        await updateMentor(editMentor.id, payload);
        Alert.alert('Success', 'Mentor updated successfully.');
      } else {
        await createMentor(payload);
        Alert.alert('Success', 'Mentor account created successfully.');
      }
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Operation failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedDept = departments.find(d => d.id === deptId);

  return (
    <View style={styles.root}>
      <AppHeader
        title={isEdit ? 'Edit Mentor' : 'Add Mentor'}
        navigation={navigation}
        showBack
      />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Preview username */}
          {firstName || deptId ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Generated Username</Text>
              <Text style={styles.previewUsername}>
                {(firstName.toLowerCase() || 'firstname')}.Mentor.
                {selectedDept?.name.replace(/\s/g, '') ?? 'Department'}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Personal Info</Text>

          <TextInput
            label="First Name *"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.firstName ? <HelperText type="error">{errors.firstName}</HelperText> : null}

          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />

          <Text style={styles.sectionTitle}>Department</Text>
          {deptsLoading ? (
            <ActivityIndicator color="#047857" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.dropdown, errors.dept && {borderColor: '#DC2626'}]}
                activeOpacity={0.8}
                onPress={() => {
                  if (!showDropdown) fetchDepts();
                  setShowDropdown(p => !p);
                }}>
                <Text style={styles.dropdownValue}>
                  {selectedDept?.name ?? 'Select Department...'}
                </Text>
                <MaterialCommunityIcons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#78716C" />
              </TouchableOpacity>
              {errors.dept ? <HelperText type="error">{errors.dept}</HelperText> : null}
              {showDropdown && (
                <View style={styles.dropList}>
                  {departments.map(d => (
                    <DropdownItem
                      key={d.id}
                      item={d}
                      selected={deptId === d.id}
                      onPress={() => { setDeptId(d.id); setShowDropdown(false); }}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>Security</Text>
          <TextInput
            label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPass}
            right={
              <TextInput.Icon
                icon={showPass ? 'eye-off' : 'eye'}
                iconColor="#78716C"
                onPress={() => setShowPass(p => !p)}
              />
            }
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.password ? <HelperText type="error">{errors.password}</HelperText> : null}

          {isEdit && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Account Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color="#047857" />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
            contentStyle={styles.saveBtnContent}
            labelStyle={styles.saveBtnLabel}>
            {isEdit ? 'Save Changes' : 'Create Mentor Account'}
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#FBF9F5'},
  scroll:        {padding: 16, paddingBottom: 40},
  previewBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  previewLabel:    {color: '#047857', fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase'},
  previewUsername: {color: '#1C1917', fontSize: 15, fontWeight: '700', fontFamily: 'monospace'},
  sectionTitle: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  input:         {marginBottom: 6, backgroundColor: '#FAF7F0'},
  outline:       {borderColor: '#E5DDD0', borderRadius: 12},
  dropdown: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDD0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dropdownValue: {color: '#1C1917', fontSize: 14},
  dropList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 4,
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  dropItemSelected: {backgroundColor: '#D1FAE5'},
  dropItemText:     {color: '#1C1917', fontSize: 14},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {color: '#1C1917', fontSize: 14, fontWeight: '600'},
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#047857',
    elevation: 2,
  },
  saveBtnContent: {paddingVertical: 6},
  saveBtnLabel:   {fontSize: 15, fontWeight: '700', color: '#fff'},
});
