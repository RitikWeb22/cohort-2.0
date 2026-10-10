import { create } from 'zustand';
import { api } from '../lib/api';
import { useCurrencyStore } from './useCurrencyStore';

const getToken = () => localStorage.getItem('floorly_token') || localStorage.getItem('freelanceos_token');
const setToken = (token) => {
  localStorage.setItem('floorly_token', token);
  localStorage.setItem('freelanceos_token', token); // For backward compatibility
};
const clearToken = () => {
  localStorage.removeItem('floorly_token');
  localStorage.removeItem('freelanceos_token');
};

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getToken() || null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  fetchUser: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const res = await api.getMe();
      if (res?.user) {
        set({ user: res.user, isAuthenticated: true });
        if (res.user.currency) {
          useCurrencyStore.getState().setCurrency(res.user.currency, false);
        }
      } else {
        clearToken();
        set({ user: null, token: null, isAuthenticated: false });
      }
    } catch (err) {
      clearToken();
      set({ user: null, token: null, isAuthenticated: false, error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.login({ email, password });
      if (res?.token && res?.user) {
        setToken(res.token);
        set({ user: res.user, token: res.token, isAuthenticated: true });
        if (res.user.currency) {
          useCurrencyStore.getState().setCurrency(res.user.currency, false);
        }
        return { success: true };
      }
      throw new Error(res.error || 'Login failed');
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.register(payload);
      if (res?.token && res?.user) {
        setToken(res.token);
        set({ user: res.user, token: res.token, isAuthenticated: true });
        if (res.user.currency) {
          useCurrencyStore.getState().setCurrency(res.user.currency, false);
        }
        return { success: true };
      }
      throw new Error(res.error || 'Registration failed');
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user });
    if (user?.currency) {
      useCurrencyStore.getState().setCurrency(user.currency, false);
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
}));
