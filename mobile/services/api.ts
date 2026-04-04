import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const SESSION_TOKEN_KEY = 'nextauth_session_token';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string })?.apiBaseUrl ??
  'http://localhost:3000';

const COOKIE_NAME = BASE_URL.startsWith('https')
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injeta o cookie de sessão em cada request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  if (token) {
    config.headers['Cookie'] = `${COOKIE_NAME}=${token}`;
  }
  return config;
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
