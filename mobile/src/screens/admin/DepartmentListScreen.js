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
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {getDepartments, deleteDepartment} from '../../api/apiClient';

const DeptItem = ({dept, onEdit, onDelete}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="domain" size={24} color="#047857" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{dept.name}</Text>
        <Text style={styles.coords}>
          {dept.latitude.toFixed(4)}, {dept.longitude.toFixed(4)}
        </Text>
        <Text style={styles.radius}>Geo-fence: {dept.radiusMeters}m radius</Text>
      </View>
    </View>

    {dept.description ? (
      <Text style={styles.desc}>{dept.description}</Text>
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

export default function DepartmentListScreen({navigation}) {
  const [depts, setDepts]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDepts = useCallback(async () => {
    try {
      const res = await getDepartments();
      setDepts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDepts();
    }, [fetchDepts])
  );

  const handleDelete = (dept) => {
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${dept.name}"? This may affect mentors/interns assigned to this department.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDepartment(dept.id);
              fetchDepts();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Failed to delete department.');
            }
          },
        },
      ]
    );
  };

  const filtered = depts.filter(d =>
    `${d.name} ${d.description}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Departments" navigation={navigation} />

      <Searchbar
        placeholder="Search departments..."
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
          keyExtractor={d => d.id.toString()}
          renderItem={({item}) => (
            <DeptItem
              dept={item}
              onEdit={() => navigation.navigate('DepartmentForm', {dept: item})}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="domain-off" size={40} color="#78716C" style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No departments found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        color="#fff"
        style={styles.fab}
        onPress={() => navigation.navigate('DepartmentForm')}
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info:     {flex: 1},
  name:     {color: '#1C1917', fontSize: 16, fontWeight: '700'},
  coords:   {color: '#78716C', fontSize: 12, marginTop: 2},
  radius:   {color: '#047857', fontSize: 12, marginTop: 1, fontWeight: '600'},
  desc: {
    color: '#78716C',
    fontSize: 13,
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
