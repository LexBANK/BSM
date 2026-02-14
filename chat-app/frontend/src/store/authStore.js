import { create } from 'zustand';
import api from '../services/api.js';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  async login(payload) {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },
  logout() {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  }
}));
