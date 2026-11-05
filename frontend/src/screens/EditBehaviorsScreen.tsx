import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';
import { Behavior } from '../types';

export default function EditBehaviorsScreen({ route, navigation }: any) {
  const { studentId } = route.params;
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [form, setForm] = useState({ name: '', code: '', description: '', color: '#4A90E2' });

  useEffect(() => {
    loadBehaviors();
  }, []);

  const loadBehaviors = async () => {
    const list = await apiService.getBehaviorsByStudent(studentId);
    setBehaviors(list);
  };

  const handleAddOrUpdate = async () => {
    if (!form.name || !form.code) return Alert.alert('Validation Check Failed', 'Fields are mandatory.');
    // Updated data keys to align with backend camelCase schemas
    await apiService.addOrUpdateBehavior({ ...form, studentId: studentId, userId: 'u1' });
    setForm({ name: '', code: '', description: '', color: '#4A90E2' });
    loadBehaviors();
  };

  const handleDelete = async (id: string) => {
    await apiService.deleteBehavior(id);
    loadBehaviors();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Add Behaviors</Text>
      <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#a4b0be" value={form.name} onChangeText={t => setForm({...form, name: t})} />
      <TextInput style={styles.input} placeholder="Code" placeholderTextColor="#a4b0be" value={form.code} onChangeText={t => setForm({...form, code: t})} />
      <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#a4b0be" value={form.description} onChangeText={t => setForm({...form, description: t})} />
      
      <TouchableOpacity style={styles.save} onPress={handleAddOrUpdate}><Text style={styles.saveTxt}>Save Changes</Text></TouchableOpacity>

      <FlatList
        data={behaviors}
        keyExtractor={(item) => item._id}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={{ fontWeight: 'bold', color: item.color }}>[{item.code}] {item.name}</Text>
              <Text style={{ fontSize: 12, color: '#57606f' }}>{item.description}</Text>
            </View>
            <TouchableOpacity style={styles.del} onPress={() => handleDelete(item._id)}>
              <Text style={styles.delTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 15 },
  input: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 8, marginBottom: 10 },
  save: { backgroundColor: '#4A90E2', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  del: { backgroundColor: '#ff4757', padding: 8, borderRadius: 4 },
  delTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
