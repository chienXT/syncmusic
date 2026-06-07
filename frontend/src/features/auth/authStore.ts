import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authService } from './auth.service';

interface User {
  _id?: string;
  username: string;
  email: string;
  avatar?: string;
  status: string;
  bio?: string;
  role?: 'user' | 'moderator' | 'admin';
  friends?: any[];
  currentRoom?: any;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    autoPlay?: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  fetchUser: () => Promise<void>;
}

const normalizeUser = (user: any) => {
  if (!user) return null;
  return {
    ...user,
    _id: user._id || user.id || user?._id || undefined,
  };
};

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,
      
      setUser: (user) => set({ user: normalizeUser(user), isAuthenticated: !!user }),
      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
        if (token) {
          Cookies.set('token', token, { expires: 7, path: '/' });
        } else {
          Cookies.remove('token', { path: '/' });
        }
      },
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      
      login: async (usernameOrEmail, password) => {
        set({ isLoading: true });
        try {
          // Xác định xem là username hay email
          const identifier = usernameOrEmail.trim();
          const isEmail = identifier.includes('@');
          const loginData: any = { password };
          
          if (isEmail) {
            loginData.email = identifier;
          } else {
            loginData.username = identifier;
          }
          
          const response = await authService.login(loginData);
          const { user, token } = response.data.data;
          get().setUser(normalizeUser(user));
          get().setToken(token);
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
          set({ isLoading: false });
        }
      },
      
      register: async (username, email, password) => {
        set({ isLoading: true });
        try {
          const response = await authService.register({ username, email, password });
          const { user, token } = response.data.data;
          get().setUser(normalizeUser(user));
          get().setToken(token);
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Registration failed');
        } finally {
          set({ isLoading: false });
        }
      },
      
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().setUser(null);
          get().setToken(null);
        }
      },
      
      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authService.updateProfile(data);
          get().setUser(response.data.data.user);
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Update failed');
        } finally {
          set({ isLoading: false });
        }
      },
      
      fetchUser: async () => {
        const persistedToken = get().token || getPersistedAuthToken();
        let token: string | null = Cookies.get('token') || null;

        if (!token && persistedToken) {
          token = String(persistedToken);
          Cookies.set('token', token, { expires: 7, path: '/' });
        }

        if (!token) {
          get().setUser(null);
          get().setToken(null);
          set({ isInitialized: true });
          return;
        }
        
        set({ isLoading: true });
        try {
          const response = await authService.getMe();
          get().setUser(normalizeUser(response.data.data.user));
          get().setToken(token);
        } catch (error: any) {
          if (error.response?.status === 401) {
            get().setUser(null);
            get().setToken(null);
          }
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      version: 2,
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version) => {
        // v2: ensure role field exists, force re-fetch if missing
        if (version < 2 && persistedState?.user && !persistedState.user.role) {
          persistedState.user = null;
          persistedState.isAuthenticated = false;
        }
        return persistedState;
      },
    }
  )
);