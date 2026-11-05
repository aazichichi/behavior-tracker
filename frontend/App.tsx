// frontend/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RegisterOnboardingScreen from './src/screens/RegisterOnboardingScreen';
import StudentDashboard from './src/screens/StudentDashboard';
import AddStudentScreen from './src/screens/AddStudentScreen';
import EditBehaviorsScreen from './src/screens/EditBehaviorsScreen';
import TrackerScreen from './src/screens/TrackerScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ 
          headerStyle: { backgroundColor: '#4A90E2' }, 
          headerTintColor: '#fff', 
          headerTitleStyle: { fontWeight: 'bold' } 
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Credentials' }} />
        <Stack.Screen name="RegisterOnboarding" component={RegisterOnboardingScreen} options={{ title: 'Create Profile Setup' }} />
        <Stack.Screen name="Dashboard" component={StudentDashboard} options={{ title: 'Teacher Dashboard', headerLeft: () => null }} />
        <Stack.Screen name="AddStudent" component={AddStudentScreen} options={{ title: 'Add New Student' }} />
        <Stack.Screen name="EditBehaviors" component={EditBehaviorsScreen} options={{ title: 'Configure Behaviors' }} />
        <Stack.Screen name="Tracker" component={TrackerScreen} options={{ title: 'Interval Session' }} />
        <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} options={{ title: 'Session Summary Matrix' }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'System Administration Control', headerLeft: () => null }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

