import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {login as loginApi} from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    const restore = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('@auth_token');
        const savedUser  = await AsyncStorage.getItem('@auth_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (username, password) => {
    const res = await loginApi(username, password);
    const {token: t, ...userData} = res.data;
    await AsyncStorage.setItem('@auth_token', t);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
    setToken(t);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@auth_user');
    setToken(null);
    setUser(null);
  };

  const updateUserData = async (newData) => {
    const updated = {...user, ...newData};
    await AsyncStorage.setItem('@auth_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{user, token, loading, login, logout, updateUserData}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
