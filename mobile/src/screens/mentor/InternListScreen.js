import React, {useCallback, useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  Searchbar,
  FAB,
  Chip,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {
  getInterns,
  deleteIntern,
  transferIntern,
  getMentorDepartments,
  getMentorsByDepartment,
} from '../../api/apiClient';

const SHIFT_COLORS = {1: '#047857', 2: '#065F46'};

const InternItem = ({intern, onEdit, onDelete, onTransfer}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, {backgroundColor: SHIFT_COLORS[intern.shiftId] ?? '#047857'}]}>
        <Text style={styles.avatarText}>
          {intern.firstName?.[0]}{intern.lastName?.[0]}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {intern.firstName} {intern.lastName}
          </Text>
          {intern.shift && (
            <Chip
              style={[styles.shiftChip, {backgroundColor: (SHIFT_COLORS[intern.shiftId] ?? '#047857') + '20'}]}
              textStyle={{color: SHIFT_COLORS[intern.shiftId] ?? '#047857', fontSize: 10, fontWeight: '700'}}>
              {intern.shift.name}
            </Chip>
          )}
        </View>
        <Text style={styles.username}>@{intern.username}</Text>
        <Text style={styles.dept}>{intern.department?.name ?? 'No Department'}</Text>
      </View>
    </View>

    <View style={styles.detailsRow}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Face AI</Text>
        <Text style={[styles.detailVal, {color: intern.faceDescriptor ? '#16A34A' : '#DC2626'}]}>
          {intern.faceDescriptor ? 'Enrolled' : 'Pending'}
        </Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Mentor</Text>
        <Text style={styles.detailVal}>
          {intern.mentor ? `${intern.mentor.firstName}` : 'None'}
        </Text>
      </View>
    </View>

    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn} onPress={onTransfer}>
        <MaterialCommunityIcons name="account-switch-outline" size={20} color="#047857" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <MaterialCommunityIcons name="pencil-outline" size={20} color="#047857" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <MaterialCommunityIcons name="delete-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  </View>
);

export default function InternListScreen({navigation}) {
  const [interns, setInterns]     = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  // Transfer Modal State
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedIntern, setSelectedIntern]             = useState(null);
  const [departments, setDepartments]                   = useState([]);
  const [selectedDeptId, setSelectedDeptId]             = useState(null);
  const [mentorsInDept, setMentorsInDept]               = useState([]);
  const [selectedMentorId, setSelectedMentorId]         = useState(null);
  const [loadingMentors, setLoadingMentors]             = useState(false);
  const [transferring, setTransferring]                 = useState(false);

  const fetchInterns = useCallback(async () => {
    try {
      const res = await getInterns();
      setInterns(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInterns();
    }, [fetchInterns])
  );

  const handleDelete = (intern) => {
    Alert.alert(
      'Delete Intern',
      `Are you sure you want to deactivate ${intern.firstName} ${intern.lastName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIntern(intern.id);
              fetchInterns();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Failed to delete intern.');
            }
          },
        },
      ]
    );
  };

  const openTransferModal = async (intern) => {
    setSelectedIntern(intern);
    setSelectedDeptId(intern.departmentId ?? null);
    setSelectedMentorId(intern.mentorId ?? null);
    setTransferModalVisible(true);

    try {
      const deptRes = await getMentorDepartments();
      setDepartments(deptRes.data || []);

      if (intern.departmentId) {
        setLoadingMentors(true);
        try {
          const mRes = await getMentorsByDepartment(intern.departmentId);
          setMentorsInDept(mRes.data || []);
        } finally {
          setLoadingMentors(false);
        }
      }
    } catch (err) {
      console.error('Failed to load transfer data', err);
    }
  };

  const handleDeptSelect = async (deptId) => {
    setSelectedDeptId(deptId);
    setSelectedMentorId(null);
    setLoadingMentors(true);
    try {
      const mRes = await getMentorsByDepartment(deptId);
      setMentorsInDept(mRes.data || []);
    } catch (err) {
      console.error('Failed to load mentors for department', err);
      setMentorsInDept([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedDeptId) {
      Alert.alert('Selection Required', 'Please select a destination department.');
      return;
    }
    if (!selectedMentorId) {
      Alert.alert('Selection Required', 'Please select a new mentor for the intern.');
      return;
    }

    setTransferring(true);
    try {
      await transferIntern(selectedIntern.id, {
        departmentId: selectedDeptId,
        mentorId: selectedMentorId,
      });
      Alert.alert('Success', `${selectedIntern.firstName} has been transferred successfully.`);
      setTransferModalVisible(false);
      fetchInterns();
    } catch (err) {
      Alert.alert('Transfer Failed', err?.response?.data?.message ?? 'Could not transfer intern.');
    } finally {
      setTransferring(false);
    }
  };

  const filtered = interns.filter(i =>
    `${i.firstName} ${i.lastName} ${i.username} ${i.department?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Interns" navigation={navigation} />

      <Searchbar
        placeholder="Search interns..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        inputStyle={{color: '#1C1917'}}
        iconColor="#047857"
        placeholderTextColor="#78716C"
      />

      {loading ? (
        <ActivityIndicator color="#047857" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id.toString()}
          renderItem={({item}) => (
            <InternItem
              intern={item}
              onEdit={() => navigation.navigate('InternForm', {intern: item})}
              onDelete={() => handleDelete(item)}
              onTransfer={() => openTransferModal(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-school-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No interns found</Text>
            </View>
          }
        />
      )}

      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="account-switch" size={28} color="#047857" />
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>Transfer Intern</Text>
                <Text style={styles.modalSub}>
                  {selectedIntern?.firstName} {selectedIntern?.lastName} (@{selectedIntern?.username})
                </Text>
              </View>
            </View>

            <ScrollView style={{maxHeight: 380}}>
              {/* Step 1: Pick Department */}
              <Text style={styles.modalSectionTitle}>1. Select New Department</Text>
              <View style={styles.pickerList}>
                {departments.map(d => {
                  const selected = selectedDeptId === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      onPress={() => handleDeptSelect(d.id)}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <MaterialCommunityIcons name="domain" size={16} color={selected ? '#047857' : '#78716C'} />
                        <Text style={[styles.pickerItemText, selected && {color: '#047857', fontWeight: 'bold'}]}>
                          {d.name}
                        </Text>
                      </View>
                      {selected ? <MaterialCommunityIcons name="check" size={18} color="#047857" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Step 2: Pick Mentor */}
              <Text style={[styles.modalSectionTitle, {marginTop: 16}]}>2. Assign Mentor in Department</Text>
              {loadingMentors ? (
                <ActivityIndicator color="#047857" style={{marginVertical: 12}} />
              ) : mentorsInDept.length === 0 ? (
                <Text style={styles.emptyMentorsText}>
                  {selectedDeptId ? 'No active mentors found in this department.' : 'Please select a department above.'}
                </Text>
              ) : (
                <View style={styles.pickerList}>
                  {mentorsInDept.map(m => {
                    const selected = selectedMentorId === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                        onPress={() => setSelectedMentorId(m.id)}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                          <MaterialCommunityIcons name="account-tie" size={16} color={selected ? '#047857' : '#78716C'} />
                          <Text style={[styles.pickerItemText, selected && {color: '#047857', fontWeight: 'bold'}]}>
                            {m.firstName} {m.lastName} (@{m.username})
                          </Text>
                        </View>
                        {selected ? <MaterialCommunityIcons name="check" size={18} color="#047857" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="text"
                textColor="#78716C"
                onPress={() => setTransferModalVisible(false)}
                disabled={transferring}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmTransfer}
                loading={transferring}
                disabled={transferring || !selectedDeptId || !selectedMentorId}
                style={styles.transferBtn}>
                Confirm Transfer
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <FAB
        icon="plus"
        color="#fff"
        style={styles.fab}
        onPress={() => navigation.navigate('InternForm')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:     {flex: 1, backgroundColor: '#FBF9F5'},
  search: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  loader:   {marginTop: 40},
  list:     {paddingHorizontal: 16, paddingBottom: 80},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  info:      {flex: 1},
  nameRow:   {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  name:      {color: '#1C1917', fontSize: 15, fontWeight: '700'},
  username:  {color: '#047857', fontSize: 12, fontWeight: '600', marginTop: 1},
  dept:      {color: '#78716C', fontSize: 12, marginTop: 2},
  shiftChip: {height: 22, alignItems: 'center'},
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  detailItem:  {flex: 1},
  detailLabel: {color: '#78716C', fontSize: 11, fontWeight: '600'},
  detailVal:   {color: '#1C1917', fontSize: 13, fontWeight: '700', marginTop: 2},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
    paddingTop: 10,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FAF7F0',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#78716C',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#047857',
    borderRadius: 16,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  modalTitle: {color: '#1C1917', fontSize: 17, fontWeight: '700'},
  modalSub:   {color: '#047857', fontSize: 12, marginTop: 2, fontWeight: '600'},
  modalSectionTitle: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerList: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#D1FAE5',
  },
  pickerItemText: {
    color: '#1C1917',
    fontSize: 13,
  },
  emptyMentorsText: {
    color: '#78716C',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
  },
  transferBtn: {
    borderRadius: 10,
    backgroundColor: '#047857',
  },
});
