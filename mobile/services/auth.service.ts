import axios from 'axios';
import { BASE_URL } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  tipo: string;
  clinicaId?: string;
}

/**
 * Busca o CSRF token necessário para o NextAuth
 */
async function getCsrfToken(): Promise<string> {
  const response = await axios.get(`${BASE_URL}/api/auth/csrf`);
  return response.data.csrfToken;
}

/**
 * Realiza login via NextAuth credentials e retorna o token de sessão
 */
const COOKIE_NAME = BASE_URL.startsWith('https')
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

async function login(credentials: LoginCredentials): Promise<string> {
  const csrfToken = await getCsrfToken();

  const response = await axios.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    new URLSearchParams({
      email: credentials.email,
      password: credentials.password,
      csrfToken,
      callbackUrl: '/',
      json: 'true',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: (status) => status < 400,
    }
  );

  // Extrai o cookie de sessão da resposta
  const setCookieHeader =
    response.headers['set-cookie'] ?? [];

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const sessionCookie = cookies.find((c: string) =>
    c.startsWith('__Secure-next-auth.session-token=') ||
    c.startsWith('next-auth.session-token=')
  );

  if (!sessionCookie) {
    throw new Error('Credenciais inválidas');
  }

  // Extrai apenas o valor do cookie (sem os atributos)
  const tokenValue = sessionCookie.split(';')[0].replace(/^(__Secure-)?next-auth\.session-token=/, '');
  return tokenValue;
}

/**
 * Busca os dados da sessão atual
 */
async function getSession(token: string): Promise<SessionUser | null> {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
    });
    return response.data?.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Realiza logout via NextAuth
 */
async function logout(token: string): Promise<void> {
  try {
    const csrfToken = await getCsrfToken();
    await axios.post(
      `${BASE_URL}/api/auth/signout`,
      new URLSearchParams({ csrfToken, callbackUrl: '/', json: 'true' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: `${COOKIE_NAME}=${token}`,
        },
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );
  } catch {
    // ignora erro no logout
  }
}

export const authService = { login, logout, getSession };
