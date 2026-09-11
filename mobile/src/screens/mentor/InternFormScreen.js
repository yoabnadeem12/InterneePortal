import React, {useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity} from 'react-native';
import {Text, TextInput, Button, Switch, HelperText, ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {createIntern, updateIntern, getMentorDepartments, getMentorsByDepartment, getMentorShifts} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';

const DropdownPicker = ({label, items, selectedId, onSelect, open, onToggle, placeholder, disabled}) => {
  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownHeader, disabled && styles.dropdownDisabled]}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.7}>
        <Text style={[styles.dropdownHeaderText, !selectedItem && {color: '#78716C'}]}>
          {selectedItem ? (selectedItem.name ?? `${selectedItem.firstName} ${selectedItem.lastName}`) : placeholder}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#78716C" />
      </TouchableOpacity>

      {open && !disabled && (
        <View style={styles.dropList}>
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.dropItem, selectedId === item.id && styles.dropItemSelected]}
              onPress={() => onSelect(item.id)}>
              <Text style={[styles.dropItemText, selectedId === item.id && {color: '#047857', fontWeight: 'bold'}]}>
                {item.name ?? `${item.firstName} ${item.lastName}`}
              </Text>
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
  const {user: authUser} = useAuth();

  const [firstName, setFirstName]       = useState(editIntern?.firstName ?? '');
  const [lastName, setLastName]         = useState(editIntern?.lastName ?? '');
  const [email, setEmail]               = useState(editIntern?.email ?? '');
  const [deptId, setDeptId]             = useState(editIntern?.departmentId ?? null);
  const [mentorId, setMentorId]         = useState(editIntern?.mentorId ?? null);
  const [shiftId, setShiftId]           = useState(editIntern?.shiftId ?? null);
  const [isActive, setIsActive]         = useState(editIntern?.isActive ?? true);

  const [departments, setDepartments]   = useState([]);
  const [mentors, setMentors]           = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [shifts, setShifts]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dataLoading, setDataLoading]   = useState(true);
  const [errors, setErrors]             = useState({});

  const [openDropdown, setOpenDropdown] = useState(null);

  // Load departments and shifts on mount (mentor-scoped, no 403)
  const loadData = useCallback(async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        getMentorDepartments(),
        getMentorShifts(),
      ]);
      setDepartments(dRes.data || []);
      setShifts(sRes.data || []);

      if (!isEdit) {
        if (sRes.data?.length > 0) setShiftId(sRes.data[0].id);
        if (dRes.data?.length > 0) setDeptId(dRes.data[0].id);
      }
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setDataLoading(false);
    }
  }, [isEdit]);

  // Load mentors whenever the selected department changes.
  // Always inject the logged-in mentor at the top so they can assign to themselves.
  const loadMentors = useCallback(async (id) => {
    if (!id) { setMentors([]); return; }
    setMentorsLoading(true);
    try {
      const res = await getMentorsByDepartment(id);
      let list = res.data || [];

      // Ensure the logged-in mentor is always available for self-assignment
      if (authUser) {
        const alreadyIn = list.some(m => m.id === authUser.userId);
        if (!alreadyIn) {
          const selfEntry = {
            id:           authUser.userId,
            firstName:    authUser.firstName,
            lastName:     authUser.lastName,
            username:     authUser.username,
            departmentId: authUser.departmentId,
            isActive:     true,
          };
          list = [selfEntry, ...list];
        } else {
          // Move self to top for convenience
          const self = list.find(m => m.id === authUser.userId);
          list = [self, ...list.filter(m => m.id !== authUser.userId)];
        }
      }

      setMentors(list);
    } catch (e) {
      console.error('loadMentors error:', e);
      setMentors([]);
    } finally {
      setMentorsLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Re-fetch mentors when deptId changes (covers both fresh load and edit mode)
  React.useEffect(() => {
    loadMentors(deptId);
  }, [deptId, loadMentors]);

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!deptId)            e.dept      = 'Department is required';
    if (!mentorId)          e.mentor    = 'Mentor assignment is required';
    if (!shiftId)           e.shift     = 'Shift is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
        email:        email.trim() || undefined,
        departmentId: deptId,
        mentorId,
        shiftId,
        isActive,
      };

      if (isEdit) {
        await updateIntern(editIntern.id, payload);
        Alert.alert('Success', 'Intern profile updated.');
      } else {
        const res = await createIntern(payload);
        const autoPass = res.data?.autoPassword;
        Alert.alert(
          'Intern Created!',
          `Account created for ${firstName}.\nUsername: ${res.data?.username}\nTemporary Password: ${autoPass ?? 'Sent via email'}`,
        );
      }
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Operation failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#047857" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title={isEdit ? 'Edit Intern' : 'Register Intern'}
        navigation={navigation}
        showBack
      />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">

          {/* Generated username preview */}
          {firstName ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Generated Username Format</Text>
              <Text style={styles.previewUsername}>
                {firstName.toLowerCase()}.PIA.<Text style={{color: '#047857'}}>###</Text>
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
            label="Email Address"
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

          <Text style={styles.sectionTitle}>Assignment</Text>

          <DropdownPicker
            label="Department *"
            items={departments}
            selectedId={deptId}
            onSelect={id => {
              setDeptId(id);
              setMentorId(null);
              setOpenDropdown(null);
            }}
            open={openDropdown === 'dept'}
            onToggle={() => setOpenDropdown(p => p === 'dept' ? null : 'dept')}
            placeholder="Select Department..."
          />
          {errors.dept ? <HelperText type="error">{errors.dept}</HelperText> : null}

          <DropdownPicker
            label="Assigned Mentor *"
            items={mentors}
            selectedId={mentorId}
            onSelect={id => {
              setMentorId(id);
              setOpenDropdown(null);
            }}
            open={openDropdown === 'mentor'}
            onToggle={() => setOpenDropdown(p => p === 'mentor' ? null : 'mentor')}
            placeholder={mentorsLoading ? 'Loading mentors...' : deptId ? 'Select Mentor...' : 'Select Department First'}
            disabled={!deptId || mentorsLoading}
          />
          {errors.mentor ? <HelperText type="error">{errors.mentor}</HelperText> : null}

          <DropdownPicker
            label="Shift Schedule *"
            items={shifts}
            selectedId={shiftId}
            onSelect={id => {
              setShiftId(id);
              setOpenDropdown(null);
            }}
            open={openDropdown === 'shift'}
            onToggle={() => setOpenDropdown(p => p === 'shift' ? null : 'shift')}
            placeholder="Select Shift..."
          />
          {errors.shift ? <HelperText type="error">{errors.shift}</HelperText> : null}

          {!isEdit && (
            <View style={styles.autoPassCard}>
              <View style={styles.autoPassHeader}>
                <MaterialCommunityIcons name="key-outline" size={20} color="#047857" />
                <Text style={styles.autoPassTitle}>Auto-Generated Credentials</Text>
              </View>
              <Text style={styles.autoPassDesc}>
                A secure temporary password will be auto-generated and assigned to the intern. The intern must change it upon their first login.
              </Text>
            </View>
          )}

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
            {isEdit ? 'Save Changes' : 'Register Intern Account'}
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#FBF9F5'},
  center:        {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBF9F5'},
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
    marginTop: 16,
  },
  input:         {marginBottom: 6, backgroundColor: '#FAF7F0'},
  outline:       {borderColor: '#E5DDD0', borderRadius: 12},
  dropdownContainer: {marginBottom: 8, zIndex: 10},
  dropdownLabel:     {color: '#78716C', fontSize: 12, fontWeight: '600', marginBottom: 4},
  dropdownHeader: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDD0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownDisabled:   {opacity: 0.5},
  dropdownHeaderText: {color: '#1C1917', fontSize: 14},
  dropList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    marginTop: 4,
    elevation: 6,
    zIndex: 999,
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  dropItemSelected: {backgroundColor: '#D1FAE5'},
  dropItemText:     {color: '#1C1917', fontSize: 14},
  autoPassCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoPassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  autoPassTitle: {color: '#047857', fontWeight: '700', fontSize: 13},
  autoPassDesc:  {color: '#064E3B', fontSize: 12, lineHeight: 16},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel:   {color: '#1C1917', fontSize: 14, fontWeight: '600'},
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#047857',
    elevation: 2,
  },
  saveBtnContent:{paddingVertical: 6},
  saveBtnLabel:  {fontSize: 15, fontWeight: '700', color: '#fff'},
});
