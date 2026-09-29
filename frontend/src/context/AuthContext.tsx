import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { AuthResponse, RegisterData } from '../types';
import { AuthContext } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('campusflow_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campusflow_token');
    localStorage.removeItem('campusflow_user');
  }, []);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('campusflow_user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, [token, logout]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('campusflow:auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('campusflow:auth:expired', handleAuthExpired);
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    setToken(res.data.access_token);
    setUser(res.data.user);
    localStorage.setItem('campusflow_token', res.data.access_token);
    localStorage.setItem('campusflow_user', JSON.stringify(res.data.user));
  };

  const register = async (userData: RegisterData) => {
    const res = await api.post<AuthResponse>('/auth/register', userData);
    setToken(res.data.access_token);
    setUser(res.data.user);
    localStorage.setItem('campusflow_token', res.data.access_token);
    localStorage.setItem('campusflow_user', JSON.stringify(res.data.user));
  };

  const switchDemoRole = async (email: string) => {
    await login(email, "password123");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
