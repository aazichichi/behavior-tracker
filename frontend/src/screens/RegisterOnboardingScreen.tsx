import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { apiService } from '../services/api';

export default function RegisterOnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [teacher, setTeacher] = useState({ firstName: '', lastName: '', email: '', username: '', password: '' });
  const [student, setStudent] = useState({ firstName: '', lastName: '', gradeLevel: '', notes: '' });
  const [behavior, setBehavior] = useState({ name: '', code: '', description: '', color: '#E4572E' });
  const [behaviorsList, setBehaviorsList] = useState<any[]>([
    { name: 'Elopement', code: 'E', description: 'Leaves seat space', color: '#E4572E' }
  ]);

  const addBehaviorItem = () => {
    if (!behavior.name || !behavior.code) return Alert.alert('Required Fields Missing', 'Please fill in Name and Code flags.');
    setBehaviorsList([...behaviorsList, behavior]);
    setBehavior({ name: '', code: '', description: '', color: '#2EC4B6' });
  };

  const handleFinalSubmit = async () => {
    try {
      const freshUser = await apiService.registerTeacher(teacher, student, behaviorsList);
      Alert.alert('Success', 'Account created successfully! Directing to live monitoring deck.');
      navigation.navigate('Dashboard', { user: freshUser });
    } catch (error: any) {
      console.error("API Registration Error Caught:", error);
      
      const serverErrorMessage = error.response?.data?.error 
        || error.message 
        || 'Server rejected registration';
        
      Alert.alert('Registration Failed', serverErrorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {step === 1 && (
        <View>
          <Text style={styles.title}>Step 1: Teacher Identity Registration</Text>
          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#a4b0be" value={teacher.firstName} onChangeText={t => setTeacher({...teacher, firstName: t})} />
          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#a4b0be" value={teacher.lastName} onChangeText={t => setTeacher({...teacher, lastName: t})} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#a4b0be" value={teacher.email} onChangeText={t => setTeacher({...teacher, email: t})} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#a4b0be" value={teacher.username} onChangeText={t => setTeacher({...teacher, username: t})} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#a4b0be" value={teacher.password} onChangeText={t => setTeacher({...teacher, password: t})} secureTextEntry={true} autoCapitalize="none"/>
          <TouchableOpacity style={styles.btn} onPress={handleFinalSubmit}><Text style={styles.btnTxt}>Register Account</Text></TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.title}>Step 2: Add Initial Special Needs Student</Text>
          <TextInput style={styles.input} placeholder="Student First Name" placeholderTextColor="#a4b0be" value={student.firstName} onChangeText={s => setStudent({...student, firstName: s})} />
          <TextInput style={styles.input} placeholder="Student Last Name" placeholderTextColor="#a4b0be" value={student.lastName} onChangeText={s => setStudent({...student, lastName: s})} />
          <TextInput style={styles.input} placeholder="Grade Level (e.g. 2, 4)" placeholderTextColor="#a4b0be" value={student.gradeLevel} onChangeText={s => setStudent({...student, gradeLevel: s})} />
          <TextInput style={styles.input} placeholder="Observations / Special Accommodations Notes" placeholderTextColor="#a4b0be" value={student.notes} onChangeText={s => setStudent({...student, notes: s})} />
          <TouchableOpacity style={styles.btn} onPress={() => setStep(3)}><Text style={styles.btnTxt}>Next Step: Define Target Behaviors</Text></TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.title}>Step 3: Define Student Behaviors</Text>
          <TextInput style={styles.input} placeholder="Behavior Name (e.g. Out of Seat)" placeholderTextColor="#a4b0be" value={behavior.name} onChangeText={b => setBehavior({...behavior, name: b})} />
          <TextInput style={styles.input} placeholder="Behavior Letter Code (e.g. OS)" placeholderTextColor="#a4b0be" value={behavior.code} onChangeText={b => setBehavior({...behavior, code: b})} />
          <TextInput style={styles.input} placeholder="Behavior Description" placeholderTextColor="#a4b0be" value={behavior.description} onChangeText={b => setBehavior({...behavior, description: b})} />
          <TextInput style={styles.input} placeholder="Hex Style Color (e.g. #FF0000)" placeholderTextColor="#a4b0be" value={behavior.color} onChangeText={b => setBehavior({...behavior, color: b})} />
          
          <TouchableOpacity style={styles.secondaryBtn} onPress={addBehaviorItem}><Text style={styles.secBtnTxt}>+ Register This Behavior</Text></TouchableOpacity>
          
          <Text style={styles.listHeader}>Currently Managed Track Elements:</Text>
          {behaviorsList.map((b, i) => (
            <Text key={i} style={styles.listItem}>• [{b.code}] {b.name} - {b.description}</Text>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={handleFinalSubmit}><Text style={styles.btnTxt}>Save and Complete</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#f1f2f6', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12 },
  btn: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  secondaryBtn: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 10, alignItems: 'center', marginVertical: 8, borderWidth: 1, borderColor: '#4A90E2' },
  submitBtn: { backgroundColor: '#2ed573', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secBtnTxt: { color: '#4A90E2', fontWeight: 'bold' },
  listHeader: { fontWeight: '700', marginTop: 15, color: '#747d8c', fontSize: 13, textTransform: 'uppercase' },
  listItem: { fontSize: 14, color: '#2c3e50', marginVertical: 4, paddingLeft: 5 }
});
