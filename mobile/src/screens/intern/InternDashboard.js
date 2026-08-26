import React, {useCallback, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, Button, ActivityIndicator} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getInternProfile, getTodayRecord} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';

const TimeCard = ({label, time, status, icon}) => (
  <View style={styles.timeCard}>
    <Text style={styles.timeCardIcon}>{icon}</Text>
    <Text style={styles.timeCardLabel}>{label}</Text>
    {time ? (
      <>
        <Text style={styles.timeCardTime}>
          {new Date(time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
        </Text>
        <StatusBadge status={status} size="sm" />
      </>
    ) : (
      <Text style={styles.timeCardNone}>—</Text>
    )}
  </View>
);

export default function InternDashboard({navigation}) {
  const {user} = useAuth();
  const [profile, setProfile]     = useState(null);
  const [today, setToday]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        getInternProfile(),
        getTodayRecord(),
      ]);
      setProfile(pRes.data);
      setToday(tRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const canCheckIn  = today?.hasRecord ? !today.checkInTime  : true;
  const canCheckOut = today?.hasRecord ? !today.checkOutTime && !!today.checkInTime : false;

  return (
    <View style={styles.root}>
      <AppHeader title="My Dashboard" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />}>

        <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.banner}>
          <Text style={styles.bannerGreet}>Hello, {user?.firstName}! 👋</Text>
          <Text style={styles.bannerDate}>{new Date().toDateString()}</Text>
          {profile?.shift && (
            <View style={styles.shiftBadge}>
              <Text style={styles.shiftText}>⏰ {profile.shift.name}</Text>
              <Text style={styles.shiftTimes}>
                {profile.shift.checkInStart} – {profile.shift.checkOutStart}
              </Text>
            </View>
          )}
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color="#11998e" style={styles.loader} />
        ) : (
          <>
            {/* One-time initial face registration */}
            {!profile?.hasFace && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>Face Not Registered</Text>
                  <Text style={styles.warningDesc}>
                    You must register your face once before marking attendance.
                  </Text>
                </View>
                <Button
                  mode="contained"
                  compact
                  style={styles.warningBtn}
                  onPress={() => navigation.navigate('MarkAttendance', {mode: 'register'})}>
                  Register
                </Button>
              </View>
            )}

            {/* Today's status */}
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            {today?.hasRecord ? (
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Text style={styles.statusLabel}>Overall Status</Text>
                  <StatusBadge status={today.overallStatus} size="lg" />
                </View>
                <View style={styles.timeCardsRow}>
                  <TimeCard
                    icon="🟢"
                    label="Check In"
                    time={today.checkInTime}
                    status={today.checkInStatus}
                  />
                  <View style={styles.timeDivider} />
                  <TimeCard
                    icon="🔴"
                    label="Check Out"
                    time={today.checkOutTime}
                    status={today.checkOutStatus}
                  />
                </View>
                {/* Verifications */}
                <View style={styles.verifyRow}>
                  <Text style={styles.verifyItem}>
                    {today.checkInFace ? '🔒 Face ✓' : '🔓 Face ✗'}
                  </Text>
                  <Text style={styles.verifyItem}>
                    {today.checkInGeo ? '📍 GPS ✓' : '📍 GPS ✗'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noRecordBox}>
                <Text style={styles.noRecordIcon}>📋</Text>
                <Text style={styles.noRecordText}>No attendance recorded today</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="camera-outline"
                disabled={!canCheckIn || !profile?.hasFace}
                style={[styles.actionBtn, {backgroundColor: '#4CAF50'}]}
                contentStyle={styles.actionBtnContent}
                labelStyle={styles.actionBtnLabel}
                onPress={() => navigation.navigate('MarkAttendance', {mode: 'checkin'})}>
                Mark Check-In
              </Button>
              <Button
                mode="contained"
                icon="camera-outline"
                disabled={!canCheckOut || !profile?.hasFace}
                style={[styles.actionBtn, {backgroundColor: '#FF5252'}]}
                contentStyle={styles.actionBtnContent}
                labelStyle={styles.actionBtnLabel}
                onPress={() => navigation.navigate('MarkAttendance', {mode: 'checkout'})}>
                Mark Check-Out
              </Button>
            </View>

            {/* Department info */}
            {profile?.department && (
              <View style={styles.deptCard}>
                <Text style={styles.deptTitle}>🏢 My Department</Text>
                <Text style={styles.deptName}>{profile.department.name}</Text>
                <Text style={styles.deptCoords}>
                  📍 {profile.department.latitude.toFixed(4)}, {profile.department.longitude.toFixed(4)}
                </Text>
                <Text style={styles.deptRadius}>
                  Geo-fence: {profile.department.radiusMeters}m radius
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     {flex: 1, backgroundColor: '#0D0E1A'},
  scroll:   {flex: 1},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  bannerGreet:  {color: '#fff', fontSize: 22, fontWeight: '800'},
  bannerDate:   {color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2},
  shiftBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  shiftText:   {color: '#fff', fontSize: 13, fontWeight: '700'},
  shiftTimes:  {color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2},
  loader:      {marginTop: 40},
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FF525215',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FF525244',
    alignItems: 'center',
    gap: 10,
  },
  warningIcon:  {fontSize: 24},
  warningText:  {flex: 1},
  warningTitle: {color: '#FF5252', fontWeight: '700', fontSize: 13},
  warningDesc:  {color: '#8B8DAA', fontSize: 11, marginTop: 2},
  warningBtn:   {backgroundColor: '#FF5252'},
  sectionTitle: {
    color: '#E8EAF6',
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: '#13152A',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2C45',
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
  },
  statusLabel:  {color: '#8B8DAA', fontSize: 13},
  timeCardsRow: {flexDirection: 'row'},
  timeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  timeCardIcon:  {fontSize: 20},
  timeCardLabel: {color: '#8B8DAA', fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  timeCardTime:  {color: '#E8EAF6', fontSize: 18, fontWeight: '800'},
  timeCardNone:  {color: '#3D3F5C', fontSize: 22},
  timeDivider:   {width: 1, backgroundColor: '#2A2C45'},
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 12,
    backgroundColor: '#1A1C33',
    borderTopWidth: 1,
    borderTopColor: '#2A2C45',
  },
  verifyItem:    {color: '#8B8DAA', fontSize: 12},
  noRecordBox: {
    alignItems: 'center',
    backgroundColor: '#13152A',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  noRecordIcon:  {fontSize: 40, marginBottom: 10},
  noRecordText:  {color: '#8B8DAA', fontSize: 14},
  actionButtons: {flexDirection: 'row', marginHorizontal: 16, gap: 12, marginTop: 16, marginBottom: 16},
  actionBtn:     {flex: 1, borderRadius: 12},
  actionBtnContent: {paddingVertical: 6},
  actionBtnLabel:   {fontWeight: '700', color: '#fff'},
  faceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13152A',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  faceCardInfo: {flex: 1},
  faceCardTitle: {color: '#E8EAF6', fontSize: 14, fontWeight: '700'},
  faceCardSub: {color: '#4CAF50', fontSize: 12, marginTop: 2, fontWeight: '600'},
  reRegisterBtn: {
    borderColor: '#6C63FF',
    borderRadius: 8,
  },
  reRegisterBtnLabel: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '700',
  },
  deptCard: {
    backgroundColor: '#13152A',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  deptTitle:   {color: '#8B8DAA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6},
  deptName:    {color: '#E8EAF6', fontSize: 15, fontWeight: '700'},
  deptCoords:  {color: '#4CAF50', fontSize: 12, fontFamily: 'monospace', marginTop: 4},
  deptRadius:  {color: '#8B8DAA', fontSize: 12, marginTop: 2},
});
