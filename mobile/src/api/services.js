import api from './client';

export const AuthService = {
  login: async (username, password) => {
    const response = await api.post('login/', { username, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('register/', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      password_confirm: userData.confirmPassword
    });
    return response.data;
  },
};
