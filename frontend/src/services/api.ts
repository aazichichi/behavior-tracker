import axios from 'axios';
import { User, Student, Session, Behavior, BehaviorEvent } from '../types';

// Replace the top API_URL definition string with this fallback structure:
const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || 'https://mernbehvaiortracker.xyz/api';

// Create an isolated instance of axios for consistent base URL routing
const API = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios interceptor to automatically attach authorization tokens to protected routes
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Authentication Endpoints
  login: async (username: string, password: string): Promise<User | null> => {
    try {
      // Endpoint typically maps to auth controller logins
      const response = await API.post('/auth/login', { login: username, password: password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data.user;
    } catch (error) {
      console.error("Login failure:", error);
      return null;
    }
  },

  registerTeacher: async (userData: any, studentData: any, behaviorsList: any): Promise<User> => {
    const response = await API.post('/auth/register', {
      teacher: userData, // <-- Maps userData directly to the expected camelCase body structure
      student: studentData, 
      behaviorsList: behaviorsList, // <-- Changed from behaviors to behaviorsList to match authController.js
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data.user;
  },

  // Student Endpoints
  getStudents: async (userId: string): Promise<Student[]> => {
    const response = await API.get(`/students?userId=${userId}`);
    return response.data;
  },

  addStudentToTeacher: async (studentData: any) => {
    const response = await API.post('/students', {
      // Stripped all legacy PascalCase lookups; maps flat camelCase properties directly to backend fields
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      gradeLevel: studentData.gradeLevel,
      notes: studentData.notes
    });
    return response.data;
  },

  deleteStudent: async (studentId: string): Promise<boolean> => {
    await API.delete(`/students/${studentId}`);
    return true;
  },

  // Behavior Configuration Endpoints
  getBehaviorsByStudent: async (studentId: string): Promise<Behavior[]> => {
    const response = await API.get(`/students/${studentId}/behaviors`);
    return response.data;
  },

  addOrUpdateBehavior: async (behaviorData: any): Promise<Behavior> => {
    
    const response = await API.post(`/students/${behaviorData.studentId}/behaviors`, behaviorData);
    return response.data;
    
  },

  deleteBehavior: async (behaviorId: string): Promise<boolean> => {
    await API.delete(`/behaviors/${behaviorId}`);
    return true;
  },

  // Session Logging Endpoints
  startSession: async (sessionData: any): Promise<Session> => {
    const response = await API.post(`/students/${sessionData.studentId}/sessions`, sessionData);
    return response.data;
  },

  logBehaviorEvent: async (eventData: any, sessionId: string): Promise<BehaviorEvent> => {
    const response = await API.post(`/sessions/${sessionId}/events`, eventData);
    return response.data;
  },

  endSession: async (id: string, notes: string): Promise<any> => {
    const response = await API.patch(`/sessions/${id}`, { notes: notes, status: 'ended' });
    return response.data;
  },

  // Admin Management Endpoints
  getAllUsersAdmin: async (): Promise<User[]> => {
    const response = await API.get('/admin/users');
    return response.data;
  },

  updateUserAdmin: async (userId: string, updatedFields: Partial<User>): Promise<boolean> => {
    await API.put(`/admin/users/${userId}`, updatedFields);
    return true;
  },

  deleteUserAdmin: async (userId: string): Promise<boolean> => {
    await API.delete(`/admin/users/${userId}`);
    return true;
  }
};

