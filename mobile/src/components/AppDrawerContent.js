import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import {Avatar, Text, Divider} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';

const roleLabels = {
  Admin: 'System Administrator',
  Mentor: 'Mentor',
  Intern: 'Intern',
};

const roleColors = {
  Admin:  ['#047857', '#064E3B'],
  Mentor: ['#059669', '#047857'],
  Intern: ['#047857', '#064E3B'],
};

export default function AppDrawerContent(props) {
  const {user, logout} = useAuth();
  const colors = roleColors[user?.role] ?? ['#047857', '#064E3B'];
  const firstInit = user?.firstName ? user.firstName[0] : '';
  const lastInit  = user?.lastName ? user.lastName[0] : '';
  const initials  = (firstInit + lastInit).toUpperCase() || '?';

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={colors} style={styles.header}>
        <Avatar.Text
          size={64}
          label={initials}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>{roleLabels[user?.role] ?? user?.role}</Text>
        {user?.departmentName ? (
          <View style={styles.deptBadge}>
            <Text style={styles.deptText}>{user.departmentName}</Text>
          </View>
        ) : null}
        <Text style={styles.username}>@{user?.username}</Text>
      </LinearGradient>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.itemsContainer}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Divider style={styles.divider} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={20} color="#DC2626" style={{marginRight: 8}} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  role: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deptBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 8,
  },
  deptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  username: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 6,
  },
  itemsContainer: {
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    backgroundColor: '#EAE2D5',
    marginHorizontal: 16,
  },
  logoutBtn: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
