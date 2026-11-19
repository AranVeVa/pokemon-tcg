import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setAuthToken, getAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);

  // Cargar usuario con el token guardado
  const refreshUser = async () => {
    try {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await apiRequest('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn('Error al verificar sesión:', err.message);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (emailOrUsername, password) => {
    const data = await apiRequest('/auth/login', 'POST', { emailOrUsername, password });
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    const data = await apiRequest('/auth/register', 'POST', { username, email, password });
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
