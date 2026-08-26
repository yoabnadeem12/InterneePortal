import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import {Avatar, Text, Divider} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';

const roleLabels = {
  Admin: 'System Administrator',
  Mentor: 'Mentor',
  Intern: 'Intern',
};

const roleColors = {
  Admin:  ['#6C63FF', '#3D3A8C'],
  Mentor: ['#00B4DB', '#0083B0'],
  Intern: ['#11998e', '#38ef7d'],
};

export default function AppDrawerContent(props) {
  const {user, logout} = useAuth();
  const colors = roleColors[user?.role] ?? ['#6C63FF', '#3D3A8C'];
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

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
        <Text style={styles.logoutText}>🚪  Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13152A',
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
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deptBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 8,
  },
  deptText: {
    color: '#fff',
    fontSize: 12,
  },
  username: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 6,
  },
  itemsContainer: {
    paddingTop: 12,
  },
  divider: {
    backgroundColor: '#3D3F5C',
    marginHorizontal: 16,
  },
  logoutBtn: {
    padding: 20,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '600',
  },
});
