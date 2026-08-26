import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// Attach JWT to every request
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/api/auth/login', {username, password});

export const changePassword = (newPassword, oldPassword) =>
  api.post('/api/auth/change-password', {newPassword, oldPassword});

// ─── Admin: Departments ───────────────────────────────────────────────────────
export const getDepartments    = () => api.get('/api/admin/departments');
export const createDepartment  = data => api.post('/api/admin/departments', data);
export const updateDepartment  = (id, data) => api.put(`/api/admin/departments/${id}`, data);
export const deleteDepartment  = id => api.delete(`/api/admin/departments/${id}`);

// ─── Admin: Mentors ───────────────────────────────────────────────────────────
export const getMentors       = () => api.get('/api/admin/mentors');
export const getMentor        = id => api.get(`/api/admin/mentors/${id}`);
export const createMentor     = data => api.post('/api/admin/mentors', data);
export const updateMentor     = (id, data) => api.put(`/api/admin/mentors/${id}`, data);
export const deleteMentor     = id => api.delete(`/api/admin/mentors/${id}`);

// ─── Shifts ───────────────────────────────────────────────────────────────────
export const getAdminShifts   = () => api.get('/api/admin/shifts');
export const getMentorShifts  = () => api.get('/api/mentor/shifts');

// ─── Mentor: Interns ──────────────────────────────────────────────────────────
export const getInterns       = () => api.get('/api/mentor/interns');
export const getIntern        = id => api.get(`/api/mentor/interns/${id}`);
export const createIntern     = data => api.post('/api/mentor/interns', data);
export const updateIntern     = (id, data) => api.put(`/api/mentor/interns/${id}`, data);
export const deleteIntern     = id => api.delete(`/api/mentor/interns/${id}`);

// ─── Mentor: Attendance reports ───────────────────────────────────────────────
export const getMentorAttendance = date =>
  api.get('/api/mentor/attendance', {params: date ? {date} : {}});

// ─── Mentor: Departments & Transfer ──────────────────────────────────────────
export const getMentorDepartments = () => api.get('/api/mentor/departments');
export const getMentorsByDepartment = deptId => api.get(`/api/mentor/departments/${deptId}/mentors`);
export const transferIntern = (id, data) => api.post(`/api/mentor/interns/${id}/transfer`, data);

// ─── Intern: Profile & Attendance ────────────────────────────────────────────
export const getInternProfile  = () => api.get('/api/intern/profile');
export const getTodayRecord    = () => api.get('/api/intern/today');
export const getAttendanceHistory = () => api.get('/api/intern/attendance/history');
export const markAttendance    = data => api.post('/api/attendance/mark', data);

// ─── Intern: Face ─────────────────────────────────────────────────────────────
export const registerFace      = faceDescriptor =>
  api.post('/api/intern/face/register', {faceDescriptor});
export const getFaceDescriptor = () => api.get('/api/intern/face/descriptor');

export default api;
