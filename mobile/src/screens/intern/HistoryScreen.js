import React, {useEffect, useState} from 'react';
import {View, FlatList, StyleSheet, RefreshControl} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getAttendanceHistory} from '../../api/apiClient';

const HistoryCard = ({record}) => {
  const checkInColor = {
    Early: '#FFC107', OnTime: '#4CAF50', Late: '#FF5252', NotYet: '#9E9E9E',
  }[record.checkInStatus] ?? '#9E9E9E';

  const checkOutColor = {
    Early: '#FF5252', OnTime: '#4CAF50', Late: '#FF9800', NotYet: '#9E9E9E',
  }[record.checkOutStatus] ?? '#9E9E9E';

  return (
    <View style={styles.card}>
      {/* Date row */}
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{record.date}</Text>
        <StatusBadge status={record.overallStatus} />
      </View>

      {/* Times */}
      <View style={styles.timesRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Check-In</Text>
          {record.checkInTime ? (
            <>
              <Text style={[styles.timeValue, {color: checkInColor}]}>
                {new Date(record.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </Text>
              <StatusBadge status={record.checkInStatus} size="sm" />
            </>
          ) : (
            <Text style={styles.noTime}>—</Text>
          )}
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Check-Out</Text>
          {record.checkOutTime ? (
            <>
              <Text style={[styles.timeValue, {color: checkOutColor}]}>
                {new Date(record.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </Text>
              <StatusBadge status={record.checkOutStatus} size="sm" />
            </>
          ) : (
            <Text style={styles.noTime}>—</Text>
          )}
        </View>
      </View>

      {/* Verification icons */}
      <View style={styles.verifyRow}>
        <Text style={[styles.verifyIcon, {color: record.checkInFaceVerified ? '#4CAF50' : '#FF5252'}]}>
          {record.checkInFaceVerified ? '🔒 Face ✓' : '🔓 Face ✗'}
        </Text>
        <Text style={[styles.verifyIcon, {color: record.checkInGeoVerified ? '#4CAF50' : '#FF5252'}]}>
          {record.checkInGeoVerified ? '📍 GPS ✓' : '📍 GPS ✗'}
        </Text>
      </View>
    </View>
  );
};

export default function HistoryScreen({navigation}) {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAttendanceHistory();
      setRecords(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // Summary stats
  const total     = records.length;
  const present   = records.filter(r => r.overallStatus === 'Present').length;
  const percent   = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <View style={styles.root}>
      <AppHeader title="Attendance History" navigation={navigation} />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Total Days</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: '#4CAF50'}]}>{present}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: '#FF5252'}]}>{total - present}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={[styles.summaryItem, styles.percentBox]}>
          <Text style={[styles.summaryValue, {color: percent >= 75 ? '#4CAF50' : '#FF5252'}]}>
            {percent}%
          </Text>
          <Text style={styles.summaryLabel}>Attendance</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.loader} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => <HistoryCard record={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No attendance records yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#0D0E1A'},
  summary: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#13152A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2C45',
    overflow: 'hidden',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#2A2C45',
  },
  percentBox:    {borderRightWidth: 0},
  summaryValue:  {color: '#E8EAF6', fontSize: 22, fontWeight: '800'},
  summaryLabel:  {color: '#8B8DAA', fontSize: 10, marginTop: 2},
  loader:        {marginTop: 40},
  list:          {paddingHorizontal: 16, paddingBottom: 20},
  card: {
    backgroundColor: '#13152A',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2C45',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
  },
  date:          {color: '#E8EAF6', fontSize: 14, fontWeight: '700'},
  timesRow:      {flexDirection: 'row'},
  timeBlock:     {flex: 1, padding: 14, gap: 4, alignItems: 'center'},
  timeLabel:     {color: '#8B8DAA', fontSize: 10, fontWeight: '700', textTransform: 'uppercase'},
  timeValue:     {fontSize: 16, fontWeight: '800'},
  noTime:        {color: '#3D3F5C', fontSize: 20},
  timeDivider:   {width: 1, backgroundColor: '#2A2C45'},
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 10,
    backgroundColor: '#1A1C33',
    borderTopWidth: 1,
    borderTopColor: '#2A2C45',
  },
  verifyIcon:    {fontSize: 11},
  empty:         {alignItems: 'center', paddingVertical: 60},
  emptyIcon:     {fontSize: 48, marginBottom: 12},
  emptyText:     {color: '#8B8DAA', fontSize: 15},
});
