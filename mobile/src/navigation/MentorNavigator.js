import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MentorDashboard        from '../screens/mentor/MentorDashboard';
import InternListScreen       from '../screens/mentor/InternListScreen';
import InternFormScreen       from '../screens/mentor/InternFormScreen';
import AttendanceReportScreen from '../screens/mentor/AttendanceReportScreen';
import AppDrawerContent       from '../components/AppDrawerContent';

const Drawer = createDrawerNavigator();
const Stack  = createStackNavigator();

const InternStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="InternList" component={InternListScreen} />
    <Stack.Screen name="InternForm" component={InternFormScreen} />
  </Stack.Navigator>
);

export default function MentorNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="MentorDashboard"
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown:      false,
        drawerType:       'front',
        drawerStyle:      {backgroundColor: '#FFFFFF', width: 280},
        drawerActiveTintColor:   '#D97706',
        drawerInactiveTintColor: '#78716C',
        drawerActiveBackgroundColor: '#FEF3C7',
        drawerLabelStyle: {fontWeight: '600', fontSize: 14},
      }}>

      <Drawer.Screen
        name="MentorDashboard"
        component={MentorDashboard}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="MyInterns"
        component={InternStack}
        options={{
          drawerLabel: 'My Interns',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="account-school-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="AttendanceReport"
        component={AttendanceReportScreen}
        options={{
          drawerLabel: 'Attendance Report',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="clipboard-text-clock-outline" size={22} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
}
