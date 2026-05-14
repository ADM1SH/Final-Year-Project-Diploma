import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../api/services';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userData');
        if (savedToken) {
          setToken(savedToken);
          if (savedUser) setUser(JSON.parse(savedUser));
        }
      } catch (e) {} finally {
        setIsLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const enterDemoMode = () => {
    const demoUser = { id: 1, username: 'Adam Anwar', email: 'adam@example.com' };
    const demoToken = 'demo-token';
    setToken(demoToken);
    setUser(demoUser);
    return { success: true };
  };

  const login = async (username, password, isDemo = false) => {
    if (isDemo) return enterDemoMode();
    try {
      const data = await AuthService.login(username, password);
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      console.error('Login Error:', e.message);
      if (e.response) console.error('Response data:', e.response.data);
      throw e; // RETHROW SO UI SHOWS ERROR
    }
  };

  const register = async (userData) => {
    try {
      const data = await AuthService.register(userData);
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      console.error('Register Error:', e.message);
      if (e.response) console.error('Response data:', e.response.data);
      throw e; // RETHROW SO UI SHOWS ERROR
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setToken(null);
    setUser(null);
  };

  const value = { user, token, isLoading, login, register, logout, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
