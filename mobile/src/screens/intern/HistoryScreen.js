import React, {useEffect, useState} from 'react';
import {View, FlatList, StyleSheet, RefreshControl} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getAttendanceHistory} from '../../api/apiClient';
import {formatTimePKT, formatDatePKT} from '../../utils/timeUtils';

const HistoryCard = ({record}) => {
  const checkInColor = {
    Early: '#D97706', OnTime: '#16A34A', Late: '#DC2626', NotYet: '#78716C',
  }[record.checkInStatus] ?? '#78716C';

  const checkOutColor = {
    Early: '#DC2626', OnTime: '#16A34A', Late: '#047857', NotYet: '#78716C',
  }[record.checkOutStatus] ?? '#78716C';

  return (
    <View style={styles.card}>
      {/* Date row */}
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDatePKT(record.date)}</Text>
        <StatusBadge status={record.overallStatus} />
      </View>

      {/* Times */}
      <View style={styles.timesRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Check-In</Text>
          {record.checkInTime ? (
            <>
              <Text style={[styles.timeValue, {color: checkInColor}]}>
                {formatTimePKT(record.checkInTime)}
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
                {formatTimePKT(record.checkOutTime)}
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
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <MaterialCommunityIcons
            name="face-recognition"
            size={16}
            color={record.checkInFaceVerified ? '#16A34A' : '#DC2626'}
          />
          <Text style={[styles.verifyIcon, {color: record.checkInFaceVerified ? '#16A34A' : '#DC2626'}]}>
            Face: {record.checkInFaceVerified ? 'Verified' : 'Failed'}
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={16}
            color={record.checkInGeoVerified ? '#16A34A' : '#DC2626'}
          />
          <Text style={[styles.verifyIcon, {color: record.checkInGeoVerified ? '#16A34A' : '#DC2626'}]}>
            GPS: {record.checkInGeoVerified ? 'In Range' : 'Out of Range'}
          </Text>
        </View>
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
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: '#16A34A'}]}>{present}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: '#047857'}]}>{percent}%</Text>
          <Text style={styles.summaryLabel}>Rate</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#047857" style={styles.loader} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => <HistoryCard record={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No attendance records found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#FBF9F5'},
  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
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
  summaryItem:    {flex: 1, alignItems: 'center'},
  summaryValue:   {fontSize: 22, fontWeight: '800', color: '#1C1917'},
  summaryLabel:   {fontSize: 11, color: '#78716C', marginTop: 2, fontWeight: '600'},
  summaryDivider: {width: 1, backgroundColor: '#EAE2D5'},
  loader:  {marginTop: 40},
  list:    {paddingHorizontal: 16, paddingBottom: 40},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  date:        {color: '#1C1917', fontSize: 14, fontWeight: '700'},
  timesRow:    {flexDirection: 'row', padding: 14},
  timeBlock:   {flex: 1, alignItems: 'center', gap: 4},
  timeLabel:   {color: '#78716C', fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  timeValue:   {fontSize: 16, fontWeight: '700'},
  noTime:      {color: '#D1D5DB', fontSize: 18},
  timeDivider: {width: 1, backgroundColor: '#EAE2D5'},
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    padding: 10,
    backgroundColor: '#FAF7F0',
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
  },
  verifyIcon: {fontSize: 12, fontWeight: '600'},
  empty:      {alignItems: 'center', paddingTop: 60},
  emptyText:  {color: '#78716C', fontSize: 16},
});
