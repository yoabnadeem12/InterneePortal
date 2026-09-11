import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AdminDashboard       from '../screens/admin/AdminDashboard';
import MentorListScreen     from '../screens/admin/MentorListScreen';
import MentorFormScreen     from '../screens/admin/MentorFormScreen';
import DepartmentListScreen from '../screens/admin/DepartmentListScreen';
import DepartmentFormScreen from '../screens/admin/DepartmentFormScreen';
import AppDrawerContent     from '../components/AppDrawerContent';

const Drawer = createDrawerNavigator();
const Stack  = createStackNavigator();

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

export default function AdminNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown:      false,
        drawerType:       'front',
        drawerStyle:      {backgroundColor: '#FFFFFF', width: 280},
        drawerActiveTintColor:   '#047857',
        drawerInactiveTintColor: '#78716C',
        drawerActiveBackgroundColor: '#D1FAE5',
        drawerLabelStyle: {fontWeight: '600', fontSize: 14},
      }}>

      <Drawer.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="Mentors"
        component={MentorStack}
        options={{
          drawerLabel: 'Mentors',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="account-tie-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="Departments"
        component={DepartmentStack}
        options={{
          drawerLabel: 'Departments',
          drawerIcon: ({color}) => <MaterialCommunityIcons name="domain" size={22} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
}
