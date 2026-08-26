import React, {useEffect, useState, useCallback} from 'react';
import {View, FlatList, StyleSheet, Alert, RefreshControl} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {getMentors, deleteMentor} from '../../api/apiClient';

const MentorCard = ({mentor, onEdit, onDelete}) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {mentor.firstName?.[0]}{mentor.lastName?.[0]}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{mentor.firstName} {mentor.lastName}</Text>
        <Text style={styles.username}>@{mentor.username}</Text>
        <Text style={styles.dept}>🏢 {mentor.departmentName ?? 'No Dept'}</Text>
        {mentor.email ? <Text style={styles.email}>✉️ {mentor.email}</Text> : null}
        <Chip
          compact
          style={[styles.statusChip, {backgroundColor: mentor.isActive ? '#4CAF5022' : '#FF525222'}]}
          textStyle={{color: mentor.isActive ? '#4CAF50' : '#FF5252', fontSize: 10}}>
          {mentor.isActive ? 'Active' : 'Inactive'}
        </Chip>
      </View>
    </View>
    <View style={styles.actions}>
      <Text style={styles.actionBtn} onPress={onEdit}>✏️</Text>
      <Text style={styles.actionBtn} onPress={onDelete}>🗑️</Text>
    </View>
  </View>
);

export default function MentorListScreen({navigation}) {
  const [mentors, setMentors]     = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getMentors();
      setMentors(res.data);
      setFiltered(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onSearch = text => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(mentors.filter(m =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q)  ||
      m.username.toLowerCase().includes(q)  ||
      (m.departmentName ?? '').toLowerCase().includes(q)
    ));
  };

  const handleDelete = mentor => {
    Alert.alert(
      'Delete Mentor',
      `Deactivate ${mentor.firstName} ${mentor.lastName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMentor(mentor.id);
              load();
            } catch (e) {
              Alert.alert('Error', 'Could not delete mentor.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Mentors" navigation={navigation} />

      <Searchbar
        placeholder="Search mentors..."
        value={search}
        onChangeText={onSearch}
        style={styles.search}
        inputStyle={{color: '#E8EAF6'}}
        iconColor="#6C63FF"
        placeholderTextColor="#6B6D8A"
      />

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <MentorCard
              mentor={item}
              onEdit={() => navigation.navigate('MentorForm', {mentor: item})}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No mentors found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="Add Mentor"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('MentorForm', {mentor: null})}
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
    elevation: 2,
    borderWidth: 1,
    borderColor: '#2A2C45',
  },
  loader:  {marginTop: 40},
  list:    {paddingHorizontal: 16, paddingBottom: 100},
  card: {
    backgroundColor: '#13152A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2C45',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  cardLeft:    {flexDirection: 'row', flex: 1, gap: 12},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText:  {color: '#fff', fontWeight: '700', fontSize: 16},
  cardInfo:    {flex: 1, gap: 2},
  name:        {color: '#E8EAF6', fontSize: 15, fontWeight: '700'},
  username:    {color: '#6C63FF', fontSize: 12},
  dept:        {color: '#8B8DAA', fontSize: 12},
  email:       {color: '#8B8DAA', fontSize: 11},
  statusChip:  {alignSelf: 'flex-start', marginTop: 4, height: 22},
  actions:     {gap: 12},
  actionBtn:   {fontSize: 20},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#6C63FF',
  },
  empty:       {alignItems: 'center', paddingTop: 60},
  emptyText:   {color: '#8B8DAA', fontSize: 16},
});
