import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import {getAdminDashboard} from '../../api/apiClient';

const StatCard = ({iconName = 'account-group', label, value, color}) => (
  <View style={[styles.statCard, {borderLeftColor: color}]}>
    <MaterialCommunityIcons name={iconName || 'account-group'} size={28} color={color} style={{marginBottom: 8}} />
    <Text style={[styles.statValue, {color}]}>{value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function AdminDashboard({navigation}) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.root}>
      <AppHeader title="Admin Dashboard" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }>

        {/* Welcome banner */}
        <LinearGradient
          colors={['#059669', '#047857']}
          style={styles.banner}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}>
          <Text style={styles.bannerGreet}>Administrator Panel</Text>
          <Text style={styles.bannerSub}>System Overview & Management</Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color="#047857" style={styles.loader} />
        ) : (
          <>
            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.grid}>
              <StatCard iconName="account-tie" label="Mentors"     value={data?.totalMentors}     color="#047857" />
              <StatCard iconName="domain"      label="Departments" value={data?.totalDepartments} color="#065F46" />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actions}>
              {[
                {iconName: 'account-plus', label: 'Add New Mentor', drawer: 'Mentors', screen: 'MentorForm', color: '#047857'},
                {iconName: 'account-group', label: 'View All Mentors', drawer: 'Mentors', screen: 'MentorList', color: '#065F46'},
                {iconName: 'domain-plus', label: 'Add Department', drawer: 'Departments', screen: 'DepartmentForm', color: '#0D9488'},
                {iconName: 'map-marker-radius', label: 'Departments', drawer: 'Departments', screen: 'DepartmentList', color: '#0284C7'},
              ].map(a => (
                <View
                  key={a.label}
                  style={styles.actionCard}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={() => {
                    navigation.navigate(a.drawer, {screen: a.screen});
                  }}>
                  <MaterialCommunityIcons name={a.iconName} size={24} color={a.color} />
                  <Text style={styles.actionCardText}>{a.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#78716C" />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         {flex: 1, backgroundColor: '#FBF9F5'},
  scroll:       {flex: 1, paddingBottom: 40},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 3,
  },
  bannerGreet:  {color: '#fff', fontSize: 20, fontWeight: '700'},
  bannerSub:    {color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4},
  sectionTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  loader:       {marginTop: 40},
  grid:         {flexDirection: 'row', paddingHorizontal: 16, gap: 12},
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    alignItems: 'center',
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statValue:    {fontSize: 28, fontWeight: '800'},
  statLabel:    {color: '#78716C', fontSize: 12, marginTop: 4, fontWeight: '600'},
  actions:      {paddingHorizontal: 16, gap: 10},
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  actionCardText:{color: '#1C1917', fontSize: 14, fontWeight: '600', flex: 1, marginLeft: 12},
});
