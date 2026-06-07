import api from '@/lib/axios';

export type LoginPayload = {
  username?: string;
  email?: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export const authApi = {
  login: (payload: LoginPayload) => api.post('/auth/login', payload),
  register: (payload: RegisterPayload) => api.post('/auth/register', payload),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (payload: { username?: string; bio?: string; avatar?: string }) =>
    api.put('/auth/profile', payload),
};
