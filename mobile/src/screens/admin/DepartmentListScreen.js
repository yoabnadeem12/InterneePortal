import React, {useEffect, useState, useCallback} from 'react';
import {View, FlatList, StyleSheet, Alert, RefreshControl} from 'react-native';
import {Text, FAB, Searchbar, ActivityIndicator} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {getDepartments, deleteDepartment} from '../../api/apiClient';

const DeptCard = ({dept, onEdit, onDelete}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🏢</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{dept.name}</Text>
        <Text style={styles.desc}>{dept.description ?? 'No description'}</Text>
        <Text style={styles.radius}>📍 Radius: {dept.radiusMeters}m</Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.actionBtn} onPress={onEdit}>✏️</Text>
        <Text style={styles.actionBtn} onPress={onDelete}>🗑️</Text>
      </View>
    </View>
    <View style={styles.coordsRow}>
      <View style={styles.coordBox}>
        <Text style={styles.coordLabel}>Latitude</Text>
        <Text style={styles.coordValue}>{dept.latitude.toFixed(6)}</Text>
      </View>
      <View style={styles.coordDivider} />
      <View style={styles.coordBox}>
        <Text style={styles.coordLabel}>Longitude</Text>
        <Text style={styles.coordValue}>{dept.longitude.toFixed(6)}</Text>
      </View>
    </View>
  </View>
);

export default function DepartmentListScreen({navigation}) {
  const [depts, setDepts]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getDepartments();
      setDepts(res.data);
      setFiltered(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onSearch = text => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(depts.filter(d => d.name.toLowerCase().includes(q)));
  };

  const handleDelete = dept => {
    Alert.alert('Delete Department', `Delete "${dept.name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await deleteDepartment(dept.id); load(); }
          catch { Alert.alert('Error', 'Could not delete department.'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Departments" navigation={navigation} />

      <Searchbar
        placeholder="Search departments..."
        value={search}
        onChangeText={onSearch}
        style={styles.search}
        inputStyle={{color: '#E8EAF6'}}
        iconColor="#FFD700"
        placeholderTextColor="#6B6D8A"
      />

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <DeptCard
              dept={item}
              onEdit={() => navigation.navigate('DepartmentForm', {dept: item})}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No departments found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="Add Department"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('DepartmentForm', {dept: null})}
      />
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2C45',
    overflow: 'hidden',
    elevation: 2,
  },
  cardHeader:    {flexDirection: 'row', padding: 16, alignItems: 'center', gap: 12},
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFD70022',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD70044',
  },
  icon:          {fontSize: 22},
  cardInfo:      {flex: 1},
  name:          {color: '#E8EAF6', fontSize: 15, fontWeight: '700'},
  desc:          {color: '#8B8DAA', fontSize: 12, marginTop: 2},
  radius:        {color: '#FFD700', fontSize: 11, marginTop: 2},
  actions:       {gap: 8},
  actionBtn:     {fontSize: 20},
  coordsRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1C33',
    borderTopWidth: 1,
    borderTopColor: '#2A2C45',
  },
  coordBox:      {flex: 1, padding: 12, alignItems: 'center'},
  coordDivider:  {width: 1, backgroundColor: '#2A2C45'},
  coordLabel:    {color: '#6B6D8A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  coordValue:    {color: '#4CAF50', fontSize: 13, fontFamily: 'monospace', marginTop: 2},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#6C63FF',
  },
  empty:       {alignItems: 'center', paddingTop: 60},
  emptyText:   {color: '#8B8DAA', fontSize: 16},
});
