import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { setAuthToken, setUnauthorizedHandler } from '../api/authToken';
import { loadApiUrl } from '../config';
import { ensureServer } from '../api/discovery';
import type { AuthUser } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  serverFound: boolean;
  searchingServer: boolean;
  searchServer: () => Promise<boolean>;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: (message?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverFound, setServerFound] = useState(false);
  const [searchingServer, setSearchingServer] = useState(false);

  const searchServer = async () => {
    setSearchingServer(true);
    try {
      const ok = await ensureServer();
      setServerFound(ok);
      return ok;
    } finally {
      setSearchingServer(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          loadApiUrl(),
        ]);
        if (token && storedUser) {
          setAuthToken(token);
          setUser(JSON.parse(storedUser));
        }
        await searchServer();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { access_token, user: loggedUser } = res.data;
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedUser));
      setAuthToken(access_token);
      setUser(loggedUser);
    } catch (e: any) {
      const message = e?.response?.data?.message || 'No se pudo iniciar sesión. Verifica tus datos y la conexión.';
      setError(message);
      throw e;
    }
  };

  const logout = async (message?: string) => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setAuthToken(null);
    setUser(null);
    if (message) setError(message);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout('Tu sesión expiró. Inicia sesión de nuevo.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, serverFound, searchingServer, searchServer, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
