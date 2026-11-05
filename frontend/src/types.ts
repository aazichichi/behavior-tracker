// frontend/src/types.ts

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  login: string;
  role: 'teacher' | 'admin' | string;
  isVerified: boolean;
  verificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface Student {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  notes: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface Session {
  _id: string;
  userId: string;
  studentId: string;
  startTime: string;
  endTime: string | null;
  intervalSeconds: number;
  status: 'active' | 'ended' | string;
  notes: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface Behavior {
  _id: string;
  studentId: string;
  userId: string;
  name: string;
  code: string;
  description: string;
  color: string;
  isArchived: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface BehaviorEvent {
  _id: string;
  sessionId: string;
  studentId: string;
  behaviorId: string;
  userId: string;
  timestamp: string;
  intervalIndex: number;
}
