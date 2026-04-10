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
  avatar?: string | null;
}

const COOKIE_NAME = BASE_URL.startsWith('https')
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

/**
 * Busca o CSRF token necessário para o NextAuth
 */
async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/csrf`, { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

/**
 * Realiza login via NextAuth credentials.
 * Usa fetch nativo para que o React Native gerencie os cookies automaticamente.
 */
async function login(credentials: LoginCredentials): Promise<SessionUser> {
  const csrfToken = await getCsrfToken();

  // POST credentials — o RN armazena o cookie de sessão automaticamente
  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: credentials.email,
      password: credentials.password,
      csrfToken,
      callbackUrl: '/',
      json: 'true',
    }).toString(),
    credentials: 'include',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error('Credenciais inválidas');
  }

  // Verificar se o login funcionou buscando a sessão (cookie nativo)
  const session = await getSession();
  if (!session) {
    throw new Error('Credenciais inválidas');
  }

  return session;
}

/**
 * Resolve avatar S3 key para URL assinada
 */
async function resolveAvatarUrl(avatar: string | null | undefined): Promise<string | null> {
  if (!avatar) return null;

  // Se já é uma URL completa (https ou base64), usar direto
  if (avatar.startsWith('http') || avatar.startsWith('data:')) {
    return avatar;
  }

  // Se é uma key do S3 (ex: usuarios/xxx), buscar URL assinada
  if (avatar.startsWith('usuarios/')) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/usuarios/avatar-url?key=${encodeURIComponent(avatar)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        return data.url ?? null;
      }
    } catch {
      // ignora erro
    }
  }

  return null;
}

/**
 * Busca os dados da sessão atual usando cookies nativos
 */
async function getSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      credentials: 'include',
    });
    const data = await res.json();
    const user = data?.user ?? null;
    if (user) {
      user.avatar = await resolveAvatarUrl(user.avatar);
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Realiza logout via NextAuth
 */
async function logout(): Promise<void> {
  try {
    const csrfToken = await getCsrfToken();
    await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: '/', json: 'true' }).toString(),
      credentials: 'include',
    });
  } catch {
    // ignora erro no logout
  }
}

export const authService = { login, logout, getSession };
