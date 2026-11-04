// frontend/src/screens/StudentDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { apiService } from '../services/api';
import { Student } from '../types';

export default function StudentDashboard({ route, navigation }: any) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTeacherId = 'u1'; // Default linked demo ID matching MOCK_USER container mapping

  useEffect(() => {
    loadData();
  }, [route.params]);

  const loadData = async () => {
    const data = await apiService.getStudents(activeTeacherId);
    setStudents(data);
    setLoading(false);
  };

  const handleDeleteStudentCard = async (id: string) => {
    await apiService.deleteStudent(id);
    loadData();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <TouchableOpacity style={styles.logout} onPress={() => navigation.navigate('Login')}><Text style={styles.controlText}>Sign Out</Text></TouchableOpacity>
        <TouchableOpacity style={styles.addStudentBtn} onPress={() => navigation.navigate('AddStudent', { userId: activeTeacherId })}><Text style={styles.controlText}>+ Add Student</Text></TouchableOpacity>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Updated parameters to match camelCase values from your updated Types schema mapping */}
            <TouchableOpacity style={styles.drillZone} onPress={() => navigation.navigate('Tracker', { studentId: item._id, firstName: item.firstName })}>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.sub}>Grade Level: {item.gradeLevel}</Text>
              <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
            </TouchableOpacity>

            <View style={styles.actionsBar}>
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditBehaviors', { studentId: item._id })}><Text style={styles.btnText}>Edit Behaviors</Text></TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteStudentCard(item._id)}><Text style={styles.btnText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 15 },
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  logout: { backgroundColor: '#747d8c', padding: 12, borderRadius: 8 },
  addStudentBtn: { backgroundColor: '#2ed573', padding: 12, borderRadius: 8 },
  controlText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  drillZone: { marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  sub: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  notes: { fontSize: 12, color: '#95a5a6', fontStyle: 'italic', marginTop: 4 },
  actionsBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f2f6', paddingTop: 10, justifyContent: 'flex-end' },
  editBtn: { backgroundColor: '#4A90E2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  delBtn: { backgroundColor: '#ff4757', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
