import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('localfix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('localfix_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('localfix_token');
      if (storedToken) {
        try {
          const res = await API.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('localfix_user', JSON.stringify(res.data.user));
            connectSocket(storedToken);
          }
        } catch (err) {
          console.error("Auth check failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token, user } = res.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('localfix_token', token);
      localStorage.setItem('localfix_user', JSON.stringify(user));
      connectSocket(token);
    }
    return res.data;
  };

  const register = async (userData) => {
    const res = await API.post('/auth/register', userData);
    if (res.data.success && res.data.token && res.data.user) {
      const { token, user } = res.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('localfix_token', token);
      localStorage.setItem('localfix_user', JSON.stringify(user));
      connectSocket(token);
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('localfix_token');
    localStorage.removeItem('localfix_user');
    disconnectSocket();
  };

  const updateProfile = async (data) => {
    const res = await API.put('/auth/profile', data);
    if (res.data.success) {
      setUser(res.data.user);
      localStorage.setItem('localfix_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

