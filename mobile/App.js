import React from 'react';
import {View, StyleSheet, StatusBar, ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {PaperProvider} from 'react-native-paper';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {appTheme} from './src/theme/theme';

import LoginScreen          from './src/screens/auth/LoginScreen';
import ChangePasswordScreen from './src/screens/auth/ChangePasswordScreen';
import AdminNavigator       from './src/navigation/AdminNavigator';
import MentorNavigator      from './src/navigation/MentorNavigator';
import InternNavigator      from './src/navigation/InternNavigator';

function RootNavigator() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Force first-time password change before granting dashboard access
  if (user.mustChangePassword) {
    return <ChangePasswordScreen />;
  }

  // Route to the correct panel based on role
  switch (user.role) {
    case 'Admin':
      return <AdminNavigator />;
    case 'Mentor':
      return <MentorNavigator />;
    case 'Intern':
      return <InternNavigator />;
    default:
      return <LoginScreen />;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="#0D0E1A" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0D0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
