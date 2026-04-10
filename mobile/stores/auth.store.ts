import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/auth.service';

const LOGGED_IN_KEY = 'session_active';

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  clinicaId?: string;
  avatar?: string | null;
}

interface AuthState {
  token: string | null; // mantém compatibilidade — agora é flag "1" ou null
  user: AuthUser | null;
  isLoading: boolean;
  setLoggedIn: (user: AuthUser) => Promise<void>;
  setUser: (user: AuthUser) => void;
  loadToken: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setLoggedIn: async (user: AuthUser) => {
    await SecureStore.setItemAsync(LOGGED_IN_KEY, '1');
    set({ token: '1', user });
  },

  setUser: (user: AuthUser) => {
    set({ user });
  },

  loadToken: async () => {
    try {
      const flag = await SecureStore.getItemAsync(LOGGED_IN_KEY);
      if (flag) {
        // Verificar se a sessão ainda é válida chamando o endpoint
        const session = await authService.getSession();
        if (session) {
          set({
            token: '1',
            user: {
              id: session.id,
              nome: session.name,
              email: session.email,
              clinicaId: session.clinicaId,
              avatar: session.avatar,
            },
            isLoading: false,
          });
          return;
        }
      }
      // Sessão inválida ou sem flag
      await SecureStore.deleteItemAsync(LOGGED_IN_KEY);
      set({ token: null, user: null, isLoading: false });
    } catch {
      set({ token: null, user: null, isLoading: false });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(LOGGED_IN_KEY);
    set({ token: null, user: null });
  },
}));
