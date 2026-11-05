import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');

  const handleReset = () => {
    Alert.alert('Reset Verification Request Sent', `A recovery link has been dispatched to ${email || 'your email'}.`);
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Account Password Recovery</Text>
      <Text style={styles.desc}>Provide the email conntected to your registered account:</Text>
      <TextInput style={styles.field} placeholder="Enter your email address" placeholderTextColor="#a4b0be" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TouchableOpacity style={styles.btn} onPress={handleReset}>
        <Text style={styles.btnText}>Send Reset Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  desc: { fontSize: 14, color: '#57606f', marginBottom: 20, lineHeight: 20 },
  field: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 15, marginBottom: 15 },
  btn: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
