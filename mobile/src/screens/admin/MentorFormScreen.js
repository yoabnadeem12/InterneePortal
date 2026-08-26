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
    <Text style={[styles.dropItemText, selected && {color: '#6C63FF'}]}>
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
            textColor="#E8EAF6"
          />
          {errors.firstName ? <HelperText type="error">{errors.firstName}</HelperText> : null}

          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
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
            textColor="#E8EAF6"
          />

          <Text style={styles.sectionTitle}>Department</Text>
          {deptsLoading ? (
            <ActivityIndicator color="#6C63FF" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.dropdown, errors.dept && {borderColor: '#FF5252'}]}
                activeOpacity={0.8}
                onPress={() => {
                  if (!showDropdown) fetchDepts();
                  setShowDropdown(p => !p);
                }}>
                <Text style={styles.dropdownValue}>
                  {selectedDept?.name ?? 'Select Department...'}
                </Text>
                <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
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
                onPress={() => setShowPass(p => !p)}
              />
            }
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
          />
          {errors.password ? <HelperText type="error">{errors.password}</HelperText> : null}

          {isEdit && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Account Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color="#6C63FF" />
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
  root:          {flex: 1, backgroundColor: '#0D0E1A'},
  scroll:        {padding: 16, paddingBottom: 40},
  previewBox: {
    backgroundColor: '#1E2035',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6C63FF44',
  },
  previewLabel:    {color: '#6C63FF', fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase'},
  previewUsername: {color: '#E8EAF6', fontSize: 15, fontWeight: '700', fontFamily: 'monospace'},
  sectionTitle: {
    color: '#8B8DAA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  input:         {marginBottom: 6, backgroundColor: '#13152A'},
  outline:       {borderColor: '#3D3F5C', borderRadius: 10},
  dropdown: {
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3F5C',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dropdownValue: {color: '#E8EAF6', fontSize: 14},
  dropdownArrow: {color: '#8B8DAA', fontSize: 14},
  dropList: {
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3F5C',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
  },
  dropItemSelected: {backgroundColor: '#6C63FF22'},
  dropItemText:     {color: '#E8EAF6', fontSize: 14},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {color: '#E8EAF6', fontSize: 14},
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
  },
  saveBtnContent: {paddingVertical: 6},
  saveBtnLabel:   {fontSize: 15, fontWeight: '700', color: '#fff'},
});
