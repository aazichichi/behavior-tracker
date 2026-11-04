// frontend/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const handleSignIn = async () => {
    if (!loginInput.trim() || !passwordInput.trim()) {
      return Alert.alert('Fields Required', 'Please provide both your account username and password.');
    }
    
    // Pass both inputs down to verification handler
    const user = await apiService.login(loginInput, passwordInput);
    
    if (!user) {
      return Alert.alert('Authentication Failed', 'Invalid username or password combination.');
    }
    
    // Updated property from PascalCase (.Role) to camelCase (.role)
    if (user.role === 'admin') {
      navigation.navigate('AdminDashboard', { user });
    } else {
      navigation.navigate('Dashboard', { user });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.branding}>📋 Behavior Tracker</Text>
      <Text style={styles.subtext}>Applied Behavioral Analysis Tracking App</Text>
      
      {/* Username Token Entry */}
      <TextInput 
        style={styles.field} 
        placeholder="Username (e.g. jrivera or admin)" 
        placeholderTextColor="#a4b0be"
        value={loginInput} 
        onChangeText={setLoginInput} 
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Password Secure Input */}
      <TextInput 
        style={styles.field} 
        placeholder="Password" 
        placeholderTextColor="#a4b0be"
        value={passwordInput} 
        onChangeText={setPasswordInput} 
        secureTextEntry={true} 
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <TouchableOpacity style={styles.cta} onPress={handleSignIn}>
        <Text style={styles.ctaText}>Authenticate Access</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.onboardLink} onPress={() => navigation.navigate('RegisterOnboarding')}>
        <Text style={styles.onboardLinkText}>New Teacher? Setup Profile Onboarding Flow</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 30 },
  branding: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#4A90E2', marginBottom: 6 },
  subtext: { fontSize: 14, color: '#747d8c', textAlign: 'center', marginBottom: 30 },
  field: { backgroundColor: '#f1f2f6', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, color: '#2c3e50' },
  cta: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  ctaText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  onboardLink: { marginTop: 25, alignItems: 'center' },
  onboardLinkText: { color: '#4A90E2', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  forgotText: { textAlign: 'center', color: '#a4b0be', marginTop: 15, textDecorationLine: 'underline', fontSize: 13 }
});
