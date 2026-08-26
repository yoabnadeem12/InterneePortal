import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import AdminDashboard       from '../screens/admin/AdminDashboard';
import MentorListScreen     from '../screens/admin/MentorListScreen';
import MentorFormScreen     from '../screens/admin/MentorFormScreen';
import DepartmentListScreen from '../screens/admin/DepartmentListScreen';
import DepartmentFormScreen from '../screens/admin/DepartmentFormScreen';
import AppDrawerContent     from '../components/AppDrawerContent';

const Drawer = createDrawerNavigator();
const Stack  = createStackNavigator();

// Stack inside drawer for screens that need a back button
const MentorStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="MentorList"    component={MentorListScreen} />
    <Stack.Screen name="MentorForm"    component={MentorFormScreen} />
  </Stack.Navigator>
);

const DepartmentStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="DepartmentList" component={DepartmentListScreen} />
    <Stack.Screen name="DepartmentForm" component={DepartmentFormScreen} />
  </Stack.Navigator>
);

const drawerTheme = {
  colors: {
    primary:          '#6C63FF',
    card:             '#13152A',
    text:             '#E8EAF6',
    border:           '#2A2C45',
    notification:     '#FF5252',
    background:       '#0D0E1A',
  },
};

export default function AdminNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown:      false,
        drawerType:       'front',
        drawerStyle:      {backgroundColor: '#13152A', width: 280},
        drawerActiveTintColor:   '#6C63FF',
        drawerInactiveTintColor: '#8B8DAA',
        drawerActiveBackgroundColor: '#6C63FF22',
      }}>

      <Drawer.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>📊</Text>,
        }}
      />
      <Drawer.Screen
        name="Mentors"
        component={MentorStack}
        options={{
          drawerLabel: 'Mentors',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>👨‍🏫</Text>,
        }}
      />
      <Drawer.Screen
        name="Departments"
        component={DepartmentStack}
        options={{
          drawerLabel: 'Departments',
          drawerIcon: ({color}) => <Text style={{fontSize: 18, color}}>🏢</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}

// Hack: Text must be imported inside this file
const {Text} = require('react-native');
