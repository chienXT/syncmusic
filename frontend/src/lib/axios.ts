import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const getPersistedAuthToken = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = Cookies.get('token') || getPersistedAuthToken();
  if (token) {
    config.headers = {
      ...(config.headers as any),
      Authorization: `Bearer ${token}`,
    } as any;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isPublicAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password');
    const hadAuthHeader = Boolean((error.config?.headers as any)?.Authorization);

    if (status === 401 && hadAuthHeader && !isPublicAuthRequest) {
      Cookies.remove('token', { path: '/' });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
