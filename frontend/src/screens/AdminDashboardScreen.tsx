import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';
import { User } from '../types';

export default function AdminDashboardScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formLogin, setFormLogin] = useState('');

  useEffect(() => {
    loadSystemUsers();
  }, []);

  const loadSystemUsers = async () => {
    const list = await apiService.getAllUsersAdmin();
    setUsers(list);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setFormName(user.firstName);
    setFormLogin(user.login);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    // Updated payload parameters to align with backend camelCase schemas
    await apiService.updateUserAdmin(selectedUser._id, { firstName: formName, login: formLogin });
    Alert.alert('System Alert', 'Account profile parameter maps updated.');
    setSelectedUser(null);
    loadSystemUsers();
  };

  const handleDeleteUser = async (id: string) => {
    await apiService.deleteUserAdmin(id);
    loadSystemUsers();
  };

  return (
    <View style={styles.box}>
      <View style={styles.headerRow}>
        <Text style={styles.banner}>Admin Portal Controls</Text>
        <TouchableOpacity style={styles.signOut} onPress={() => navigation.navigate('Login')}><Text style={styles.signOutTxt}>Sign Out</Text></TouchableOpacity>
      </View>

      {selectedUser && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Modify User Portfolio: {selectedUser.login}</Text>
          <TextInput style={styles.field} value={formName} onChangeText={setFormName} placeholder="First Name" />
          <TextInput style={styles.field} value={formLogin} onChangeText={setFormLogin} placeholder="Login Username" />
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}><Text style={styles.saveBtnTxt}>Update Identity Access Mapping</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View>
              <Text style={styles.userName}>{item.firstName} {item.lastName} ({item.role})</Text>
              <Text style={styles.userSub}>ID Access Code Handle: {item.login}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleSelectUser(item)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteUser(item._id)}><Text style={styles.actionText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#f1f2f6', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  banner: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  signOut: { backgroundColor: '#747d8c', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  signOutTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  editCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#4A90E2' },
  editTitle: { fontWeight: 'bold', marginBottom: 10, color: '#2c3e50' },
  field: { backgroundColor: '#f1f2f6', padding: 10, borderRadius: 6, marginBottom: 8 },
  saveBtn: { backgroundColor: '#4A90E2', padding: 12, borderRadius: 6, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold' },
  userCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontWeight: 'bold', fontSize: 15 },
  userSub: { fontSize: 13, color: '#747d8c', marginTop: 2 },
  actions: { flexDirection: 'row' },
  editBtn: { backgroundColor: '#e28743', padding: 8, borderRadius: 5, marginRight: 5 },
  delBtn: { backgroundColor: '#ff4757', padding: 8, borderRadius: 5 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
