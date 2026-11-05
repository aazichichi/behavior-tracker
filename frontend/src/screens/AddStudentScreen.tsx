import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { apiService } from '../services/api';

export default function AddStudentScreen({ route, navigation }: any) {
  const currentUserId = route.params?.userId || 'u1';
  const [student, setStudent] = useState({ firstName: '', lastName: '', gradeLevel: '', notes: '' });
  const [behavior, setBehavior] = useState({ name: '', code: '', description: '', color: '#4A90E2' });
  const [behaviors, setBehaviors] = useState<any[]>([]);

  const handlePushBehavior = () => {
    if (!behavior.name || !behavior.code) return Alert.alert('Error', 'Ensure tracking values match.');
    setBehaviors([...behaviors, behavior]);
    setBehavior({ name: '', code: '', description: '', color: '#4A90E2' });
  };

  const handleSaveStudent = async () => {
    // If validation is needed, check student.firstName now
    // if (!student.firstName) return Alert.alert('Error', 'Name is a mandatory property field.');
    
    // Aligned to match apiService.addStudentToTeacher(studentData) definition from api.ts
    await apiService.addStudentToTeacher(student);
    Alert.alert('Success', 'Student file setup added to workspace directory maps.');
    navigation.navigate('Dashboard', { refresh: true });
  };

  return (
    <ScrollView contentContainerStyle={styles.box}>
      <Text style={styles.section}>Student Information</Text>
      <TextInput style={styles.field} placeholder="First Name" placeholderTextColor="#a4b0be" value={student.firstName} onChangeText={t => setStudent({...student, firstName: t})} />
      <TextInput style={styles.field} placeholder="Last Name" placeholderTextColor="#a4b0be" value={student.lastName} onChangeText={t => setStudent({...student, lastName: t})} />
      <TextInput style={styles.field} placeholder="Grade Level" placeholderTextColor="#a4b0be" value={student.gradeLevel} onChangeText={t => setStudent({...student, gradeLevel: t})} />
      <TextInput style={styles.field} placeholder="Observations notes..." placeholderTextColor="#a4b0be" value={student.notes} onChangeText={t => setStudent({...student, notes: t})} />

      <Text style={styles.section}>Behavior Information</Text>
      <TextInput style={styles.field} placeholder="Behavior Name" placeholderTextColor="#a4b0be" value={behavior.name} onChangeText={t => setBehavior({...behavior, name: t})} />
      <TextInput style={styles.field} placeholder="Behavior Letter Code" placeholderTextColor="#a4b0be" value={behavior.code} onChangeText={t => setBehavior({...behavior, code: t})} />
      <TextInput style={styles.field} placeholder="Behavior Description" placeholderTextColor="#a4b0be" value={behavior.description} onChangeText={t => setBehavior({...behavior, description: t})} />
      
      <TouchableOpacity style={styles.addBtn} onPress={handlePushBehavior}><Text style={styles.addBtnTxt}>+ Add Behavior</Text></TouchableOpacity>

      {behaviors.map((b, idx) => (
        <Text key={idx} style={styles.tag}>• [{b.code}] {b.name}</Text>
      ))}

      <TouchableOpacity style={styles.commit} onPress={handleSaveStudent}><Text style={styles.commitTxt}>Save Student</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 20, backgroundColor: '#fff' },
  section: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', color: '#747d8c', marginVertical: 12, letterSpacing: 0.5 },
  field: { backgroundColor: '#f1f2f6', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10 },
  addBtn: { borderWidth: 1, borderColor: '#4A90E2', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  addBtnTxt: { color: '#4A90E2', fontWeight: 'bold' },
  tag: { fontSize: 14, color: '#2c3e50', paddingVertical: 2 },
  commit: { backgroundColor: '#2ed573', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  commitTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
