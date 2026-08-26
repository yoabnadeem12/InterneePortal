import React from 'react';
import {Text} from 'react-native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
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
        drawerStyle:      {backgroundColor: '#13152A', width: 280},
        drawerActiveTintColor:   '#00B4DB',
        drawerInactiveTintColor: '#8B8DAA',
        drawerActiveBackgroundColor: '#00B4DB22',
      }}>

      <Drawer.Screen
        name="MentorDashboard"
        component={MentorDashboard}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>📊</Text>,
        }}
      />
      <Drawer.Screen
        name="MyInterns"
        component={InternStack}
        options={{
          drawerLabel: 'My Interns',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>🎓</Text>,
        }}
      />
      <Drawer.Screen
        name="AttendanceReport"
        component={AttendanceReportScreen}
        options={{
          drawerLabel: 'Attendance Report',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>📋</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}
