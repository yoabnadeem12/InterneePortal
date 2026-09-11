import React, {useCallback, useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  Searchbar,
  FAB,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {getMentors, deleteMentor} from '../../api/apiClient';

const MentorItem = ({mentor, onEdit, onDelete}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {mentor.firstName?.[0]}{mentor.lastName?.[0]}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {mentor.firstName} {mentor.lastName}
        </Text>
        <Text style={styles.username}>@{mentor.username}</Text>
        <Text style={styles.dept}>{mentor.department?.name ?? 'No Department'}</Text>
      </View>
      <Chip
        style={[styles.statusChip, {backgroundColor: mentor.isActive ? '#DCFCE7' : '#FEE2E2'}]}
        textStyle={{color: mentor.isActive ? '#16A34A' : '#DC2626', fontSize: 11, fontWeight: '700'}}>
        {mentor.isActive ? 'Active' : 'Inactive'}
      </Chip>
    </View>

    {mentor.email ? (
      <Text style={styles.email}>{mentor.email}</Text>
    ) : null}

    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <MaterialCommunityIcons name="pencil-outline" size={20} color="#047857" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <MaterialCommunityIcons name="delete-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  </View>
);

export default function MentorListScreen({navigation}) {
  const [mentors, setMentors]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const fetchMentors = useCallback(async () => {
    try {
      const res = await getMentors();
      setMentors(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMentors();
    }, [fetchMentors])
  );

  const handleDelete = (mentor) => {
    Alert.alert(
      'Delete Mentor',
      `Are you sure you want to deactivate / delete ${mentor.firstName} ${mentor.lastName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMentor(mentor.id);
              fetchMentors();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Failed to delete mentor.');
            }
          },
        },
      ]
    );
  };

  const filtered = mentors.filter(m =>
    `${m.firstName} ${m.lastName} ${m.username} ${m.department?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Mentors" navigation={navigation} />

      <Searchbar
        placeholder="Search mentors..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        inputStyle={{color: '#1C1917'}}
        iconColor="#047857"
        placeholderTextColor="#78716C"
      />

      {loading ? (
        <ActivityIndicator color="#047857" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={m => m.id.toString()}
          renderItem={({item}) => (
            <MentorItem
              mentor={item}
              onEdit={() => navigation.navigate('MentorForm', {mentor: item})}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No mentors found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        color="#fff"
        style={styles.fab}
        onPress={() => navigation.navigate('MentorForm')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:     {flex: 1, backgroundColor: '#FBF9F5'},
  search: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  loader:   {marginTop: 40},
  list:     {paddingHorizontal: 16, paddingBottom: 80},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  info:     {flex: 1},
  name:     {color: '#1C1917', fontSize: 15, fontWeight: '700'},
  username: {color: '#047857', fontSize: 12, fontWeight: '600', marginTop: 1},
  dept:     {color: '#78716C', fontSize: 12, marginTop: 2},
  statusChip: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
    paddingTop: 10,
    marginTop: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FAF7F0',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#78716C',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#047857',
    borderRadius: 16,
    elevation: 4,
  },
});
