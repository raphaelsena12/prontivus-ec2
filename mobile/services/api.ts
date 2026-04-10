import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string })?.apiBaseUrl ??
  'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
