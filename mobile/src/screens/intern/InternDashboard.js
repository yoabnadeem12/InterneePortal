import React, {useCallback, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, Button, ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getInternProfile, getTodayRecord} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';
import {formatTimePKT} from '../../utils/timeUtils';

const TimeCard = ({label, time, status, iconName = 'clock-outline', iconColor}) => (
  <View style={styles.timeCard}>
    <MaterialCommunityIcons name={iconName || 'clock-outline'} size={22} color={iconColor} style={{marginBottom: 2}} />
    <Text style={styles.timeCardLabel}>{label}</Text>
    {time ? (
      <>
        <Text style={styles.timeCardTime}>{formatTimePKT(time)}</Text>
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

        <LinearGradient colors={['#047857', '#064E3B']} style={styles.banner}>
          <Text style={styles.bannerGreet}>Hello, {user?.firstName}!</Text>
          <Text style={styles.bannerDate}>{new Date().toDateString()}</Text>
          {profile?.shift && (
            <View style={styles.shiftBadge}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" />
                <Text style={styles.shiftText}>{profile.shift.name}</Text>
              </View>
              <Text style={styles.shiftTimes}>
                {profile.shift.checkInStart} – {profile.shift.checkOutStart} (PKT)
              </Text>
            </View>
          )}
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color="#047857" style={styles.loader} />
        ) : (
          <>
            {/* One-time initial face registration if not enrolled yet */}
            {!profile?.hasFace && (
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
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
                    iconName="login"
                    iconColor="#16A34A"
                    label="Check In"
                    time={today.checkInTime}
                    status={today.checkInStatus}
                  />
                  <View style={styles.timeDivider} />
                  <TimeCard
                    iconName="logout"
                    iconColor="#047857"
                    label="Check Out"
                    time={today.checkOutTime}
                    status={today.checkOutStatus}
                  />
                </View>
                <View style={styles.verifyRow}>
                  <Text style={styles.verifyItem}>
                    Face: {today.faceVerified ? 'Verified' : 'Failed'}
                  </Text>
                  <Text style={styles.verifyItem}>
                    Geo: {today.geoVerified ? 'In Range' : 'Out of Range'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noRecordBox}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
                <Text style={styles.noRecordText}>No attendance record for today yet.</Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="camera"
                disabled={!canCheckIn || !profile?.hasFace}
                style={[styles.actionBtn, {backgroundColor: canCheckIn && profile?.hasFace ? '#16A34A' : '#D1D5DB'}]}
                contentStyle={styles.actionBtnContent}
                labelStyle={styles.actionBtnLabel}
                onPress={() => navigation.navigate('MarkAttendance', {mode: 'checkin'})}>
                Mark Check-In
              </Button>
              <Button
                mode="contained"
                icon="camera"
                disabled={!canCheckOut || !profile?.hasFace}
                style={[styles.actionBtn, {backgroundColor: canCheckOut && profile?.hasFace ? '#047857' : '#D1D5DB'}]}
                contentStyle={styles.actionBtnContent}
                labelStyle={styles.actionBtnLabel}
                onPress={() => navigation.navigate('MarkAttendance', {mode: 'checkout'})}>
                Mark Check-Out
              </Button>
            </View>

            {/* Department info */}
            {profile?.department && (
              <View style={styles.deptCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <MaterialCommunityIcons name="domain" size={18} color="#047857" />
                  <Text style={styles.deptTitle}>My Department</Text>
                </View>
                <Text style={styles.deptName}>{profile.department.name}</Text>
                <Text style={styles.deptCoords}>
                  Lat/Lng: {profile.department.latitude.toFixed(4)}, {profile.department.longitude.toFixed(4)}
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
  root:     {flex: 1, backgroundColor: '#FBF9F5'},
  scroll:   {flex: 1},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 3,
  },
  bannerGreet:  {color: '#fff', fontSize: 22, fontWeight: '800'},
  bannerDate:   {color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2},
  shiftBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  shiftText:   {color: '#fff', fontSize: 13, fontWeight: '700'},
  shiftTimes:  {color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 2},
  loader:      {marginTop: 40},
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: 10,
  },
  warningText:  {flex: 1},
  warningTitle: {color: '#DC2626', fontWeight: '700', fontSize: 13},
  warningDesc:  {color: '#7F1D1D', fontSize: 11, marginTop: 2},
  warningBtn:   {backgroundColor: '#DC2626'},
  sectionTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  statusLabel:  {color: '#78716C', fontSize: 13, fontWeight: '600'},
  timeCardsRow: {flexDirection: 'row'},
  timeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  timeCardLabel: {color: '#78716C', fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  timeCardTime:  {color: '#1C1917', fontSize: 18, fontWeight: '800'},
  timeCardNone:  {color: '#D1D5DB', fontSize: 22},
  timeDivider:   {width: 1, backgroundColor: '#EAE2D5'},
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 12,
    backgroundColor: '#FAF7F0',
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
  },
  verifyItem:    {color: '#78716C', fontSize: 12, fontWeight: '500'},
  noRecordBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  noRecordText:  {color: '#78716C', fontSize: 14},
  actionButtons: {flexDirection: 'row', marginHorizontal: 16, gap: 12, marginTop: 16, marginBottom: 16},
  actionBtn:     {flex: 1, borderRadius: 12, elevation: 2},
  actionBtnContent: {paddingVertical: 6},
  actionBtnLabel:   {fontWeight: '700', color: '#fff'},
  deptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  deptTitle:    {color: '#047857', fontSize: 13, fontWeight: '700'},
  deptName:     {color: '#1C1917', fontSize: 16, fontWeight: '700', marginTop: 4},
  deptCoords:   {color: '#78716C', fontSize: 12, marginTop: 4},
  deptRadius:   {color: '#16A34A', fontSize: 12, marginTop: 2, fontWeight: '600'},
});
