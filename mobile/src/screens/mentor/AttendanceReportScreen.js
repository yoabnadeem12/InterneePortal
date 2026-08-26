import React, {useState, useCallback} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, ActivityIndicator, Searchbar} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getMentorAttendance, getInterns} from '../../api/apiClient';

const DateFilter = ({selected, onSelect}) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return (
    <FlatList
      horizontal
      data={dates}
      keyExtractor={d => d}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateFilters}
      renderItem={({item}) => {
        const isSelected = item === selected;
        const label = item === dates[0] ? 'Today' : item.slice(5); // MM-DD
        return (
          <TouchableOpacity
            style={[styles.dateChip, isSelected && styles.dateChipSelected]}
            onPress={() => onSelect(item)}>
            <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const AttendanceRow = ({record}) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>
          {record.internName?.[0]}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{record.internName}</Text>
        <Text style={styles.rowUsername}>{record.internUsername}</Text>
      </View>
    </View>
    <View style={styles.rowRight}>
      <StatusBadge status={record.overallStatus} />
      <View style={styles.rowStatuses}>
        <StatusBadge status={`In: ${record.checkInStatus}`} />
        <StatusBadge status={`Out: ${record.checkOutStatus}`} />
      </View>
      {record.checkInTime ? (
        <Text style={styles.rowTime}>
          🕐 {new Date(record.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
          {record.checkOutTime
            ? ` → ${new Date(record.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
            : ' → —'}
        </Text>
      ) : null}
    </View>
  </View>
);

export default function AttendanceReportScreen({navigation}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]         = useState(today);
  const [records, setRecords]   = useState([]);
  const [interns, setInterns]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const load = async (d) => {
    setLoading(true);
    try {
      const [attRes, intRes] = await Promise.all([
        getMentorAttendance(d),
        getInterns(),
      ]);
      setRecords(attRes.data);
      setInterns(intRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(date); }, [date]));

  const handleDateChange = d => { setDate(d); load(d); };

  // Build a full list: all interns + mark absent if no record
  const fullList = interns
    .filter(i =>
      !search ||
      i.firstName.toLowerCase().includes(search.toLowerCase()) ||
      i.lastName.toLowerCase().includes(search.toLowerCase())
    )
    .map(intern => {
      const rec = records.find(r => r.userId === intern.id);
      return rec ?? {
        id: `absent-${intern.id}`,
        userId: intern.id,
        internName: `${intern.firstName} ${intern.lastName}`,
        internUsername: intern.username,
        date,
        checkInStatus: 'NotYet',
        checkOutStatus: 'NotYet',
        overallStatus: 'Absent',
      };
    });

  const presentCount  = fullList.filter(r => r.overallStatus === 'Present').length;
  const abscentCount  = fullList.filter(r => r.overallStatus === 'Absent').length;
  const incompleteCount = fullList.filter(r => r.overallStatus === 'Incomplete').length;

  return (
    <View style={styles.root}>
      <AppHeader title="Attendance Report" navigation={navigation} />

      <DateFilter selected={date} onSelect={handleDateChange} />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, {borderTopColor: '#4CAF50'}]}>
          <Text style={[styles.summaryVal, {color: '#4CAF50'}]}>{presentCount}</Text>
          <Text style={styles.summaryLbl}>Present</Text>
        </View>
        <View style={[styles.summaryBox, {borderTopColor: '#FF9800'}]}>
          <Text style={[styles.summaryVal, {color: '#FF9800'}]}>{incompleteCount}</Text>
          <Text style={styles.summaryLbl}>Incomplete</Text>
        </View>
        <View style={[styles.summaryBox, {borderTopColor: '#FF5252'}]}>
          <Text style={[styles.summaryVal, {color: '#FF5252'}]}>{abscentCount}</Text>
          <Text style={styles.summaryLbl}>Absent</Text>
        </View>
      </View>

      <Searchbar
        placeholder="Search intern..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        inputStyle={{color: '#E8EAF6'}}
        iconColor="#6C63FF"
        placeholderTextColor="#6B6D8A"
      />

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.loader} />
      ) : (
        <FlatList
          data={fullList}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => <AttendanceRow record={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No interns assigned</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#0D0E1A'},
  dateFilters:   {paddingHorizontal: 16, paddingVertical: 10, gap: 8},
  dateChip: {
    backgroundColor: '#13152A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  dateChipSelected: {backgroundColor: '#6C63FF', borderColor: '#6C63FF'},
  dateChipText:     {color: '#8B8DAA', fontSize: 12, fontWeight: '600'},
  dateChipTextSelected: {color: '#fff'},
  summaryRow:    {flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8},
  summaryBox: {
    flex: 1,
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderTopWidth: 3,
    padding: 10,
    alignItems: 'center',
  },
  summaryVal:    {fontSize: 22, fontWeight: '800'},
  summaryLbl:    {color: '#8B8DAA', fontSize: 11, marginTop: 2},
  search: {
    marginHorizontal: 16,
    backgroundColor: '#13152A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2C45',
    marginBottom: 8,
  },
  loader:  {marginTop: 20},
  list:    {paddingHorizontal: 16, paddingBottom: 20},
  row: {
    backgroundColor: '#13152A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2C45',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowLeft:       {flexDirection: 'row', gap: 10, flex: 1},
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarText: {color: '#fff', fontWeight: '700', fontSize: 14},
  rowInfo:       {flex: 1},
  rowName:       {color: '#E8EAF6', fontSize: 13, fontWeight: '600'},
  rowUsername:   {color: '#6C63FF', fontSize: 11},
  rowRight:      {alignItems: 'flex-end', gap: 4},
  rowStatuses:   {flexDirection: 'row', gap: 4},
  rowTime:       {color: '#8B8DAA', fontSize: 10, marginTop: 2},
  empty:         {alignItems: 'center', paddingVertical: 40},
  emptyText:     {color: '#8B8DAA'},
});
