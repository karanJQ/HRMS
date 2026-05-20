import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/endpoints';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hrms_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data.data))
        .catch(() => { localStorage.removeItem('hrms_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: t, user: u } = res.data.data;
    localStorage.setItem('hrms_token', t);
    localStorage.setItem('hrms_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    setToken(null);
    setUser(null);
  };

  const can = (...roles) => user && roles.includes(user.role);
  const isMin = (role) => {
    const levels = { super_admin:5, hr_manager:4, dept_head:3, hr_staff:2, employee:1 };
    return user && (levels[user.role]||0) >= (levels[role]||0);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, can, isMin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);