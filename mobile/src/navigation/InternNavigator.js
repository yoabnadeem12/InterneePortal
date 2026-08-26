import React from 'react';
import {Text} from 'react-native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import InternDashboard      from '../screens/intern/InternDashboard';
import MarkAttendanceScreen from '../screens/intern/MarkAttendanceScreen';
import HistoryScreen        from '../screens/intern/HistoryScreen';
import AppDrawerContent     from '../components/AppDrawerContent';

const Drawer = createDrawerNavigator();
const Stack  = createStackNavigator();

// Dashboard stack — has MarkAttendance pushed on top
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="InternDash"    component={InternDashboard} />
    <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
  </Stack.Navigator>
);

export default function InternNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="InternHome"
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown:      false,
        drawerType:       'front',
        drawerStyle:      {backgroundColor: '#13152A', width: 280},
        drawerActiveTintColor:   '#11998e',
        drawerInactiveTintColor: '#8B8DAA',
        drawerActiveBackgroundColor: '#11998e22',
      }}>

      <Drawer.Screen
        name="InternHome"
        component={DashboardStack}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>🏠</Text>,
        }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{
          drawerLabel: 'Attendance History',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>📅</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}
