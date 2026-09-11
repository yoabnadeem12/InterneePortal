import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InternDashboard      from '../screens/intern/InternDashboard';
import MarkAttendanceScreen from '../screens/intern/MarkAttendanceScreen';
import HistoryScreen        from '../screens/intern/HistoryScreen';
import AppDrawerContent     from '../components/AppDrawerContent';

const Drawer = createDrawerNavigator();
const Stack  = createStackNavigator();

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
        drawerStyle:      {backgroundColor: '#FFFFFF', width: 280},
        drawerActiveTintColor:   '#0D9488',
        drawerInactiveTintColor: '#78716C',
        drawerActiveBackgroundColor: '#CCFBF1',
        drawerLabelStyle: {fontWeight: '600', fontSize: 14},
      }}>

      <Drawer.Screen
        name="InternHome"
        component={DashboardStack}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="home-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{
          drawerLabel: 'Attendance History',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="calendar-clock-outline" size={22} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
}
