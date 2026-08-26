import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import {getInterns, getMentorAttendance} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';

const TodayCard = ({record}) => (
  <View style={styles.todayCard}>
    <Text style={styles.todayName}>{record.internName}</Text>
    <Text style={styles.todayUsername}>{record.internUsername}</Text>
    <View style={styles.todayStatuses}>
      <StatusPill label="Check-In" status={record.checkInStatus} />
      <StatusPill label="Check-Out" status={record.checkOutStatus} />
      <StatusPill label="Overall" status={record.overallStatus} />
    </View>
    <View style={styles.todayTimes}>
      {record.checkInTime ? (
        <Text style={styles.timeText}>
          🕐 In: {new Date(record.checkInTime).toLocaleTimeString()}
        </Text>
      ) : null}
      {record.checkOutTime ? (
        <Text style={styles.timeText}>
          🕐 Out: {new Date(record.checkOutTime).toLocaleTimeString()}
        </Text>
      ) : null}
    </View>
  </View>
);

const StatusPill = ({label, status}) => {
  const colors = {
    Early: '#FFC107', OnTime: '#4CAF50', Late: '#FF5252',
    NotYet: '#9E9E9E', Present: '#4CAF50', Incomplete: '#FF9800', Absent: '#FF5252',
  };
  const c = colors[status] ?? '#9E9E9E';
  return (
    <View style={[styles.pill, {backgroundColor: c + '22', borderColor: c}]}>
      <Text style={[styles.pillLabel, {color: '#8B8DAA'}]}>{label}</Text>
      <Text style={[styles.pillStatus, {color: c}]}>{status}</Text>
    </View>
  );
};

export default function MentorDashboard({navigation}) {
  const {user} = useAuth();
  const [interns, setInterns]   = useState([]);
  const [today, setToday]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [internsRes, attRes] = await Promise.all([
        getInterns(),
        getMentorAttendance(todayStr),
      ]);
      setInterns(internsRes.data);
      setToday(attRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const presentCount  = today.filter(r => r.overallStatus === 'Present').length;
  const absentCount   = interns.length - today.filter(r => r.checkInTime).length;

  return (
    <View style={styles.root}>
      <AppHeader title="Mentor Dashboard" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />
        }>

        <LinearGradient colors={['#00B4DB', '#0083B0']} style={styles.banner}>
          <Text style={styles.bannerGreet}>👋 {user?.firstName}'s Panel</Text>
          <Text style={styles.bannerSub}>{new Date().toDateString()}</Text>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.stat, {borderTopColor: '#6C63FF'}]}>
            <Text style={[styles.statVal, {color: '#6C63FF'}]}>{interns.length}</Text>
            <Text style={styles.statLbl}>Total Interns</Text>
          </View>
          <View style={[styles.stat, {borderTopColor: '#4CAF50'}]}>
            <Text style={[styles.statVal, {color: '#4CAF50'}]}>{presentCount}</Text>
            <Text style={styles.statLbl}>Present Today</Text>
          </View>
          <View style={[styles.stat, {borderTopColor: '#FF5252'}]}>
            <Text style={[styles.statVal, {color: '#FF5252'}]}>{absentCount}</Text>
            <Text style={styles.statLbl}>Absent Today</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        {loading ? (
          <ActivityIndicator color="#00B4DB" style={{marginTop: 20}} />
        ) : today.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No attendance records for today</Text>
          </View>
        ) : (
          today.map(r => <TodayCard key={r.id} record={r} />)
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#0D0E1A'},
  scroll:  {flex: 1},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  bannerGreet:    {color: '#fff', fontSize: 20, fontWeight: '700'},
  bannerSub:      {color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4},
  statsRow:       {flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8},
  stat: {
    flex: 1,
    backgroundColor: '#13152A',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statVal:        {fontSize: 24, fontWeight: '800'},
  statLbl:        {color: '#8B8DAA', fontSize: 11, marginTop: 2, textAlign: 'center'},
  sectionTitle: {
    color: '#E8EAF6',
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  todayCard: {
    backgroundColor: '#13152A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  todayName:      {color: '#E8EAF6', fontSize: 14, fontWeight: '700'},
  todayUsername:  {color: '#6C63FF', fontSize: 11, marginBottom: 8},
  todayStatuses:  {flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6},
  pill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 70,
  },
  pillLabel:      {fontSize: 9, fontWeight: '600', textTransform: 'uppercase'},
  pillStatus:     {fontSize: 11, fontWeight: '700'},
  todayTimes:     {flexDirection: 'row', gap: 16},
  timeText:       {color: '#8B8DAA', fontSize: 11},
  empty:          {alignItems: 'center', paddingVertical: 40},
  emptyText:      {color: '#8B8DAA', fontSize: 14},
});
