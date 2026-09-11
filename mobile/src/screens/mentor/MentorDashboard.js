import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import {getInterns, getMentorAttendance} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';
import {formatTimePKT, getTodayPKT} from '../../utils/timeUtils';

const TodayCard = ({record}) => (
  <View style={styles.todayCard}>
    <Text style={styles.todayName}>{record.internName}</Text>
    <Text style={styles.todayUsername}>@{record.internUsername}</Text>
    <View style={styles.todayStatuses}>
      <StatusPill label="Check-In" status={record.checkInStatus} />
      <StatusPill label="Check-Out" status={record.checkOutStatus} />
      <StatusPill label="Overall" status={record.overallStatus} />
    </View>
    <View style={styles.todayTimes}>
      {record.checkInTime ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <MaterialCommunityIcons name="clock-in" size={14} color="#16A34A" />
          <Text style={styles.timeText}>
            In: {formatTimePKT(record.checkInTime)}
          </Text>
        </View>
      ) : null}
      {record.checkOutTime ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <MaterialCommunityIcons name="clock-out" size={14} color="#047857" />
          <Text style={styles.timeText}>
            Out: {formatTimePKT(record.checkOutTime)}
          </Text>
        </View>
      ) : null}
    </View>
  </View>
);

const StatusPill = ({label, status}) => {
  const colors = {
    Early: '#D97706', OnTime: '#16A34A', Late: '#DC2626',
    NotYet: '#78716C', Present: '#16A34A', Incomplete: '#047857', Absent: '#DC2626',
  };
  const c = colors[status] ?? '#78716C';
  return (
    <View style={[styles.pill, {backgroundColor: c + '15', borderColor: c + '44'}]}>
      <Text style={[styles.pillLabel, {color: c}]}>{label}: </Text>
      <Text style={[styles.pillStatus, {color: c}]}>{status ?? '�'}</Text>
    </View>
  );
};

const StatCard = ({iconName = 'account-group', label, value, color}) => (
  <View style={[styles.statCard, {borderLeftColor: color}]}>
    <MaterialCommunityIcons name={iconName || 'account-group'} size={26} color={color} style={{marginBottom: 6}} />
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function MentorDashboard({navigation}) {
  const {user} = useAuth();
  const [internCount, setInternCount] = useState(0);
  const [todayRecords, setTodayRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const todayStr = getTodayPKT();
      const [internsRes, attRes] = await Promise.all([
        getInterns(),
        getMentorAttendance(todayStr),
      ]);
      setInternCount(internsRes.data.length);
      setTodayRecords(attRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const presentCount = todayRecords.filter(r => r.overallStatus === 'Present').length;
  const lateCount    = todayRecords.filter(r => r.checkInStatus === 'Late').length;

  return (
    <View style={styles.root}>
      <AppHeader title="Mentor Dashboard" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }>

        {/* Welcome banner */}
        <LinearGradient
          colors={['#059669', '#047857']}
          style={styles.banner}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}>
          <Text style={styles.bannerGreet}>
            Welcome, {user?.firstName}!
          </Text>
          <Text style={styles.bannerDept}>
            {user?.departmentName ?? 'Department'} � {new Date().toDateString()} (PKT)
          </Text>
        </LinearGradient>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        {loading ? (
          <ActivityIndicator color="#047857" style={styles.loader} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard iconName="account-group" label="My Interns" value={internCount}  color="#047857" />
            <StatCard iconName="account-check" label="Present"    value={presentCount} color="#16A34A" />
            <StatCard iconName="clock-alert"   label="Late"       value={lateCount}    color="#DC2626" />
          </View>
        )}

        {/* Quick action: View full report */}
        <View style={styles.actionRow}>
          <View
            style={styles.actionCard}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => navigation.navigate('AttendanceReport')}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={24} color="#047857" />
            <Text style={styles.actionCardText}>View Attendance Report</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#78716C" />
          </View>
        </View>

        {/* Today's live logs */}
        <Text style={styles.sectionTitle}>Today's Attendance Logs</Text>
        {loading ? null : todayRecords.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
            <Text style={styles.emptyText}>No attendance records marked today yet.</Text>
          </View>
        ) : (
          todayRecords.map((r, idx) => <TodayCard key={r.id ? ('att-' + r.id) : ('rec-' + idx)} record={r} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#FBF9F5'},
  scroll:        {flex: 1, paddingBottom: 40},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 3,
  },
  bannerGreet:   {color: '#fff', fontSize: 20, fontWeight: '700'},
  bannerDept:    {color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4},
  sectionTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  loader:        {marginTop: 20},
  statsRow:      {flexDirection: 'row', paddingHorizontal: 16, gap: 10},
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    alignItems: 'center',
  },
  statValue:     {fontSize: 24, fontWeight: '800'},
  statLabel:     {color: '#78716C', fontSize: 11, marginTop: 2, fontWeight: '600', textAlign: 'center'},
  actionRow:     {paddingHorizontal: 16, marginTop: 16},
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  actionCardText:{color: '#1C1917', fontSize: 14, fontWeight: '600', flex: 1, marginLeft: 12},
  todayCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  todayName:     {color: '#1C1917', fontSize: 15, fontWeight: '700'},
  todayUsername: {color: '#047857', fontSize: 12, fontWeight: '600', marginTop: 2},
  todayStatuses: {flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap'},
  pill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
  },
  pillLabel:     {fontSize: 10, fontWeight: '600'},
  pillStatus:    {fontSize: 10, fontWeight: '700'},
  todayTimes:    {flexDirection: 'row', gap: 16, marginTop: 10},
  timeText:      {color: '#78716C', fontSize: 12},
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  emptyText:     {color: '#78716C', fontSize: 14},
});
