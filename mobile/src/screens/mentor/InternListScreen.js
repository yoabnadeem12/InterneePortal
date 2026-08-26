import React, {useState, useCallback} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  ActivityIndicator,
  Chip,
  Button,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {
  getInterns,
  deleteIntern,
  getMentorDepartments,
  getMentorsByDepartment,
  transferIntern,
} from '../../api/apiClient';

const SHIFT_COLORS = {1: '#6C63FF', 2: '#00B4DB'};

const InternCard = ({intern, onEdit, onDelete, onTransfer}) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <View style={[styles.avatar, {backgroundColor: SHIFT_COLORS[intern.shiftId] ?? '#6C63FF'}]}>
        <Text style={styles.avatarText}>
          {intern.firstName?.[0]}{intern.lastName?.[0]}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{intern.firstName} {intern.lastName}</Text>
        <Text style={styles.username}>@{intern.username}</Text>
        <Text style={styles.dept}>🏢 {intern.departmentName ?? '-'}</Text>
        <View style={styles.badges}>
          <Chip
            compact
            style={[styles.shiftChip, {backgroundColor: (SHIFT_COLORS[intern.shiftId] ?? '#6C63FF') + '22'}]}
            textStyle={{color: SHIFT_COLORS[intern.shiftId] ?? '#6C63FF', fontSize: 10}}>
            ⏰ {intern.shiftName ?? 'No Shift'}
          </Chip>
          {intern.hasFace ? (
            <Chip compact style={styles.faceChip} textStyle={styles.faceChipText}>
              🔒 Face ✓
            </Chip>
          ) : (
            <Chip compact style={styles.noFaceChip} textStyle={styles.noFaceText}>
              ⚠️ No Face
            </Chip>
          )}
        </View>
      </View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.actionTouch}
        activeOpacity={0.7}
        onPress={onTransfer}>
        <Text style={styles.actionBtn}>🔁</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionTouch}
        activeOpacity={0.7}
        onPress={onEdit}>
        <Text style={styles.actionBtn}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionTouch}
        activeOpacity={0.7}
        onPress={onDelete}>
        <Text style={styles.actionBtn}>🗑️</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function InternListScreen({navigation}) {
  const [interns, setInterns]         = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Transfer Modal State
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedIntern, setSelectedIntern]             = useState(null);
  const [departments, setDepartments]                   = useState([]);
  const [selectedDeptId, setSelectedDeptId]             = useState(null);
  const [mentorsInDept, setMentorsInDept]               = useState([]);
  const [selectedMentorId, setSelectedMentorId]         = useState(null);
  const [loadingMentors, setLoadingMentors]             = useState(false);
  const [transferring, setTransferring]                 = useState(false);

  const load = async () => {
    try {
      const res = await getInterns();
      setInterns(res.data || []);
      setFiltered(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onSearch = text => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(interns.filter(i =>
      i.firstName.toLowerCase().includes(q) ||
      i.lastName.toLowerCase().includes(q)  ||
      i.username.toLowerCase().includes(q)
    ));
  };

  const handleDelete = intern => {
    Alert.alert(
      'Remove Intern',
      `Are you sure you want to remove ${intern.firstName} ${intern.lastName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIntern(intern.id);
              load();
              Alert.alert('Success', 'Intern has been removed.');
            } catch (e) {
              Alert.alert('Error', 'Could not remove intern.');
            }
          },
        },
      ],
    );
  };

  // ─── Transfer Flow ───────────────────────────────────────────────────────────
  const openTransferModal = async (intern) => {
    setSelectedIntern(intern);
    setSelectedDeptId(null);
    setSelectedMentorId(null);
    setMentorsInDept([]);
    setTransferModalVisible(true);

    try {
      const res = await getMentorDepartments();
      setDepartments(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load departments.');
    }
  };

  const handleSelectDepartment = async (deptId) => {
    setSelectedDeptId(deptId);
    setSelectedMentorId(null);
    setLoadingMentors(true);
    try {
      const res = await getMentorsByDepartment(deptId);
      setMentorsInDept(res.data || []);
    } catch (e) {
      console.error('Failed to load mentors for dept:', e);
      setMentorsInDept([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedDeptId) {
      Alert.alert('Selection Required', 'Please select a target department.');
      return;
    }
    if (!selectedMentorId) {
      Alert.alert('Selection Required', 'Please select a mentor from the selected department.');
      return;
    }

    setTransferring(true);
    try {
      await transferIntern(selectedIntern.id, {
        departmentId: selectedDeptId,
        mentorId: selectedMentorId,
      });

      const targetMentor = mentorsInDept.find(m => m.id === selectedMentorId);
      Alert.alert(
        'Intern Transferred',
        `${selectedIntern.firstName} ${selectedIntern.lastName} has been successfully transferred to ${targetMentor ? `${targetMentor.firstName} ${targetMentor.lastName}` : 'the new mentor'}.`,
      );
      setTransferModalVisible(false);
      load();
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Failed to transfer intern.';
      Alert.alert('Transfer Error', msg);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader title="My Interns" navigation={navigation} />
      <Searchbar
        placeholder="Search interns..."
        value={search}
        onChangeText={onSearch}
        style={styles.search}
        inputStyle={{color: '#E8EAF6'}}
        iconColor="#00B4DB"
        placeholderTextColor="#6B6D8A"
      />
      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <InternCard
              intern={item}
              onTransfer={() => openTransferModal(item)}
              onEdit={() => navigation.navigate('InternForm', {intern: item})}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No interns found</Text>
            </View>
          }
        />
      )}
      <FAB
        icon="plus"
        label="Add Intern"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('InternForm', {intern: null})}
      />

      {/* ─── Transfer Intern Modal ────────────────────────────────────────── */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>🔁</Text>
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>Transfer Intern</Text>
                <Text style={styles.modalSub}>
                  {selectedIntern ? `${selectedIntern.firstName} ${selectedIntern.lastName} (@${selectedIntern.username})` : ''}
                </Text>
              </View>
            </View>

            <ScrollView style={{maxHeight: 380}}>
              {/* Step 1: Department Selection */}
              <Text style={styles.formSectionLabel}>1. Select Target Department</Text>
              <View style={styles.pickerList}>
                {departments.map(d => {
                  const selected = selectedDeptId === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectDepartment(d.id)}>
                      <Text style={[styles.pickerItemText, selected && {color: '#6C63FF', fontWeight: 'bold'}]}>
                        🏢 {d.name}
                      </Text>
                      {selected ? <Text style={{color: '#6C63FF'}}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Step 2: Mentors in Selected Department */}
              {selectedDeptId ? (
                <>
                  <Text style={styles.formSectionLabel}>2. Select Target Mentor</Text>
                  {loadingMentors ? (
                    <ActivityIndicator color="#6C63FF" style={{marginVertical: 12}} />
                  ) : mentorsInDept.length === 0 ? (
                    <View style={styles.noMentorBox}>
                      <Text style={styles.noMentorText}>⚠️ No active mentors in this department.</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerList}>
                      {mentorsInDept.map(m => {
                        const selected = selectedMentorId === m.id;
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                            activeOpacity={0.7}
                            onPress={() => setSelectedMentorId(m.id)}>
                            <View>
                              <Text style={[styles.pickerItemText, selected && {color: '#00D2FF', fontWeight: 'bold'}]}>
                                👨‍🏫 {m.firstName} {m.lastName}
                              </Text>
                              <Text style={styles.pickerItemSub}>@{m.username}</Text>
                            </View>
                            {selected ? <Text style={{color: '#00D2FF'}}>✓</Text> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                textColor="#8B8DAA"
                style={styles.modalCancelBtn}
                onPress={() => setTransferModalVisible(false)}>
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={transferring}
                disabled={transferring || !selectedDeptId || !selectedMentorId}
                style={styles.modalConfirmBtn}
                contentStyle={{paddingVertical: 4}}
                onPress={handleConfirmTransfer}>
                Confirm Transfer
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#0D0E1A'},
  search: {
    margin: 16,
    backgroundColor: '#13152A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  loader:  {marginTop: 40},
  list:    {paddingHorizontal: 16, paddingBottom: 100},
  card: {
    backgroundColor: '#13152A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2C45',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  cardLeft:    {flexDirection: 'row', flex: 1, gap: 12},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText:  {color: '#fff', fontWeight: '700', fontSize: 16},
  cardInfo:    {flex: 1, gap: 2},
  name:        {color: '#E8EAF6', fontSize: 14, fontWeight: '700'},
  username:    {color: '#6C63FF', fontSize: 12},
  dept:        {color: '#8B8DAA', fontSize: 12},
  badges:      {flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap'},
  shiftChip:   {height: 22},
  faceChip:    {backgroundColor: '#4CAF5022', height: 22, borderColor: '#4CAF5044', borderWidth: 1},
  faceChipText:{color: '#4CAF50', fontSize: 10},
  noFaceChip:  {backgroundColor: '#FF525222', height: 22, borderColor: '#FF525244', borderWidth: 1},
  noFaceText:  {color: '#FF5252', fontSize: 10},
  actions:     {flexDirection: 'column', gap: 6, justifyContent: 'center', alignItems: 'center'},
  actionTouch: {padding: 6, borderRadius: 8, backgroundColor: '#1E2035'},
  actionBtn:   {fontSize: 16},
  fab: {position: 'absolute', right: 20, bottom: 24, backgroundColor: '#6C63FF'},
  empty:       {alignItems: 'center', paddingTop: 60},
  emptyText:   {color: '#8B8DAA', fontSize: 16},

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#13152A',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
    paddingBottom: 12,
  },
  modalIcon:  {fontSize: 28},
  modalTitle: {color: '#E8EAF6', fontSize: 18, fontWeight: '700'},
  modalSub:   {color: '#00D2FF', fontSize: 12, marginTop: 2},
  formSectionLabel: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  pickerList: {
    backgroundColor: '#1A1C33',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2C45',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#6C63FF22',
  },
  pickerItemText: {
    color: '#E8EAF6',
    fontSize: 14,
  },
  pickerItemSub: {
    color: '#8B8DAA',
    fontSize: 11,
    marginTop: 2,
  },
  noMentorBox: {
    backgroundColor: '#FF525215',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF525233',
    marginBottom: 12,
  },
  noMentorText: {
    color: '#FF5252',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2C45',
    paddingTop: 14,
  },
  modalCancelBtn: {
    borderColor: '#3D3F5C',
    borderRadius: 10,
  },
  modalConfirmBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
  },
});
