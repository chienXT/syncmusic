import { authApi } from '@/services/auth.api';

export const authService = {
  login: (data: { username?: string; email?: string; password: string }) => authApi.login(data),
  register: (data: { username: string; email: string; password: string }) => authApi.register(data),
  logout: () => authApi.logout(),
  getMe: () => authApi.getMe(),
  updateProfile: (data: { username?: string; bio?: string; avatar?: string }) => authApi.updateProfile(data),
};
