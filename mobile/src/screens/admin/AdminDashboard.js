import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, Card, ActivityIndicator} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../../components/AppHeader';
import {getMentors, getDepartments} from '../../api/apiClient';
import {useAuth} from '../../context/AuthContext';

const StatCard = ({icon, label, value, color}) => (
  <View style={[styles.statCard, {borderLeftColor: color}]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function AdminDashboard({navigation}) {
  const {user} = useAuth();
  const [stats, setStats] = useState({mentors: 0, departments: 0});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const [mentorsRes, deptsRes] = await Promise.all([
        getMentors(),
        getDepartments(),
      ]);
      setStats({
        mentors:     mentorsRes.data.length,
        departments: deptsRes.data.length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  return (
    <View style={styles.root}>
      <AppHeader title="Admin Dashboard" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} />
        }>

        {/* Welcome banner */}
        <LinearGradient
          colors={['#6C63FF', '#3D3A8C']}
          style={styles.banner}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}>
          <Text style={styles.bannerGreet}>
            👋 Welcome back, {user?.firstName}!
          </Text>
          <Text style={styles.bannerSub}>Manage your organization</Text>
        </LinearGradient>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {loading ? (
          <ActivityIndicator color="#6C63FF" style={styles.loader} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard icon="👨‍🏫" label="Mentors"     value={stats.mentors}     color="#6C63FF" />
            <StatCard icon="🏢" label="Departments"  value={stats.departments} color="#FFD700" />
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            {icon: '➕', label: 'Add Mentor',     drawer: 'Mentors',     screen: 'MentorForm',     color: '#6C63FF'},
            {icon: '👥', label: 'View Mentors',   drawer: 'Mentors',     screen: 'MentorList',     color: '#00B4DB'},
            {icon: '🏢', label: 'Add Department', drawer: 'Departments', screen: 'DepartmentForm', color: '#FFD700'},
            {icon: '📍', label: 'Departments',    drawer: 'Departments', screen: 'DepartmentList', color: '#4CAF50'},
          ].map(a => (
            <View
              key={a.label}
              style={[styles.actionCard, {borderTopColor: a.color}]}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => navigation.navigate(a.drawer, {screen: a.screen})}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#0D0E1A'},
  scroll:        {flex: 1},
  banner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
  },
  bannerGreet:   {color: '#fff', fontSize: 20, fontWeight: '700'},
  bannerSub:     {color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4},
  sectionTitle: {
    color: '#E8EAF6',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  loader:        {marginTop: 20},
  statsRow:      {flexDirection: 'row', paddingHorizontal: 16, gap: 12},
  statCard: {
    flex: 1,
    backgroundColor: '#13152A',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statIcon:      {fontSize: 28, marginBottom: 8},
  statValue:     {fontSize: 28, fontWeight: '800'},
  statLabel:     {color: '#8B8DAA', fontSize: 12, marginTop: 2, fontWeight: '600'},
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 32,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#13152A',
    borderRadius: 14,
    padding: 20,
    borderTopWidth: 3,
    elevation: 3,
    alignItems: 'center',
  },
  actionIcon:    {fontSize: 30, marginBottom: 8},
  actionLabel:   {color: '#E8EAF6', fontSize: 13, fontWeight: '600', textAlign: 'center'},
});
