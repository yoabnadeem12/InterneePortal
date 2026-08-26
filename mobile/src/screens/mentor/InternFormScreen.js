import React, {useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity} from 'react-native';
import {Text, TextInput, Button, Switch, HelperText, ActivityIndicator} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {createIntern, updateIntern, getMentorShifts, getMentorDepartments} from '../../api/apiClient';

const DropdownPicker = ({label, items, selectedId, onSelect, onToggle, labelKey = 'name', color = '#6C63FF'}) => {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === selectedId);
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdown, {borderColor: open ? color : '#3D3F5C'}]}
        activeOpacity={0.8}
        onPress={() => {
          if (!open && onToggle) onToggle();
          setOpen(p => !p);
        }}>
        <Text style={[styles.dropdownValue, {color: selected ? '#E8EAF6' : '#6B6D8A'}]}>
          {selected?.[labelKey] ?? `Select ${label}...`}
        </Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropList}>
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.dropItem, selectedId === item.id && {backgroundColor: color + '22'}]}
              activeOpacity={0.7}
              onPress={() => {onSelect(item.id); setOpen(false);}}>
              <Text style={[styles.dropItemText, selectedId === item.id && {color}]}>
                {item[labelKey]}
              </Text>
              {item.description ? (
                <Text style={styles.dropItemSub}>{item.description}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function InternFormScreen({navigation, route}) {
  const editIntern = route.params?.intern ?? null;
  const isEdit     = !!editIntern;

  const [firstName, setFirstName] = useState(editIntern?.firstName ?? '');
  const [lastName, setLastName]   = useState(editIntern?.lastName ?? '');
  const [email, setEmail]         = useState(editIntern?.email ?? '');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [shiftId, setShiftId]     = useState(editIntern?.shiftId ?? null);
  const [deptId, setDeptId]       = useState(editIntern?.departmentId ?? null);
  const [isActive, setIsActive]   = useState(editIntern?.isActive ?? true);

  const [shifts, setShifts]       = useState([]);
  const [depts, setDepts]         = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([getMentorShifts(), getMentorDepartments()]);
      setShifts(sRes.data || []);
      setDepts(dRes.data || []);
    } catch (e) {
      console.error('Failed to load shifts/departments:', e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!email.trim() || !email.includes('@')) e.email = 'Valid Gmail address is required to send credentials';
    if (!shiftId)          e.shift     = 'Please select a shift';
    if (!deptId)           e.dept      = 'Please select a department';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim() || undefined,
        shiftId,
        departmentId: deptId,
        password:  password.trim() || undefined,
        isActive,
      };
      if (isEdit) {
        await updateIntern(editIntern.id, payload);
        Alert.alert('Success', 'Intern updated.');
      } else {
        const res = await createIntern(payload);
        Alert.alert(
          'Intern Account Created',
          `Username: ${res.data.username}\n\nAuto-generated credentials have been emailed to ${email.trim()}.\n\nThe student will set their own permanent password upon first login.`,
        );
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title={isEdit ? 'Edit Intern' : 'Add Intern'} navigation={navigation} showBack />
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Username preview for new intern */}
          {!isEdit && firstName && (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Generated Username</Text>
              <Text style={styles.previewUsername}>
                {firstName.toLowerCase()}.PIA.<Text style={{color: '#FFD700'}}>###</Text>
              </Text>
              <Text style={styles.previewNote}>
                Serial number assigned automatically
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Personal Info</Text>

          <TextInput label="First Name *" value={firstName} onChangeText={setFirstName}
            mode="outlined" style={styles.input} outlineStyle={styles.outline} textColor="#E8EAF6" />
          {errors.firstName ? <HelperText type="error">{errors.firstName}</HelperText> : null}

          <TextInput label="Last Name" value={lastName} onChangeText={setLastName}
            mode="outlined" style={styles.input} outlineStyle={styles.outline} textColor="#E8EAF6" />

          <TextInput label="Student Gmail *" value={email} onChangeText={setEmail}
            mode="outlined" keyboardType="email-address" autoCapitalize="none"
            placeholder="student@gmail.com"
            placeholderTextColor="#6B6D8A"
            style={styles.input} outlineStyle={styles.outline} textColor="#E8EAF6" />
          {errors.email ? <HelperText type="error">{errors.email}</HelperText> : null}

          <Text style={styles.sectionTitle}>Shift & Department</Text>

          <DropdownPicker
            label="Shift"
            items={shifts}
            selectedId={shiftId}
            onSelect={setShiftId}
            onToggle={fetchData}
            labelKey="name"
            color="#6C63FF"
          />
          {errors.shift ? <HelperText type="error">{errors.shift}</HelperText> : null}

          <DropdownPicker
            label="Department"
            items={depts}
            selectedId={deptId}
            onSelect={setDeptId}
            onToggle={fetchData}
            labelKey="name"
            color="#00B4DB"
          />
          {errors.dept ? <HelperText type="error">{errors.dept}</HelperText> : null}

          {isEdit ? (
            <>
              <Text style={styles.sectionTitle}>Security</Text>
              <TextInput
                label="New Password (leave blank to keep)"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPass}
                right={<TextInput.Icon icon={showPass ? 'eye-off' : 'eye'} onPress={() => setShowPass(p => !p)} />}
                style={styles.input}
                outlineStyle={styles.outline}
                textColor="#E8EAF6"
              />
            </>
          ) : (
            <View style={styles.autoPassCard}>
              <View style={styles.autoPassHeader}>
                <Text style={styles.autoPassIcon}>🔑</Text>
                <Text style={styles.autoPassTitle}>Auto-Generated Credentials</Text>
              </View>
              <Text style={styles.autoPassDesc}>
                A secure temporary password and username will be generated and emailed automatically to{' '}
                <Text style={{color: '#00D2FF', fontWeight: 'bold'}}>
                  {email.trim() || "the student's Gmail"}
                </Text>.
              </Text>
              <Text style={styles.autoPassSub}>
                🛡️ The student will create their own permanent password upon first login.
              </Text>
            </View>
          )}

          {isEdit && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Account Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color="#6C63FF" />
            </View>
          )}

          <Button mode="contained" onPress={handleSave} loading={saving}
            style={styles.saveBtn} contentStyle={styles.saveBtnContent} labelStyle={styles.saveBtnLabel}>
            {isEdit ? 'Save Changes' : 'Create Intern Account'}
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#0D0E1A'},
  loadingRoot:   {flex: 1, backgroundColor: '#0D0E1A', justifyContent: 'center', alignItems: 'center'},
  scroll:        {padding: 16, paddingBottom: 40},
  previewBox: {
    backgroundColor: '#1E2035',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6C63FF44',
  },
  previewLabel:    {color: '#6C63FF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4},
  previewUsername: {color: '#E8EAF6', fontSize: 16, fontWeight: '700', fontFamily: 'monospace'},
  previewNote:     {color: '#8B8DAA', fontSize: 11, marginTop: 4},
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
  pickerContainer: {marginBottom: 6},
  pickerLabel:   {color: '#8B8DAA', fontSize: 12, marginBottom: 4},
  dropdown: {
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {fontSize: 14},
  dropdownArrow: {color: '#8B8DAA', fontSize: 14},
  dropList: {
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3F5C',
    marginTop: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
  },
  dropItemText:  {color: '#E8EAF6', fontSize: 14},
  dropItemSub:   {color: '#8B8DAA', fontSize: 11, marginTop: 2},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel:   {color: '#E8EAF6', fontSize: 14},
  autoPassCard: {
    backgroundColor: '#1E2035',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#6C63FF44',
  },
  autoPassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  autoPassIcon: {
    fontSize: 18,
  },
  autoPassTitle: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  autoPassDesc: {
    color: '#E8EAF6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  autoPassSub: {
    color: '#8B8DAA',
    fontSize: 12,
    lineHeight: 16,
  },
  saveBtn:       {marginTop: 24, borderRadius: 12, backgroundColor: '#6C63FF'},
  saveBtnContent:{paddingVertical: 6},
  saveBtnLabel:  {fontSize: 15, fontWeight: '700', color: '#fff'},
});
