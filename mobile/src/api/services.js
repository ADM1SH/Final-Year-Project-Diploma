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
  logout: async (refreshToken) => {
    const response = await api.post('logout/', { refresh_token: refreshToken });
    return response.data;
  },
  resetPasswordDirect: async (username, newPassword) => {
    const response = await api.post('password-reset/direct/', {
      username,
      new_password: newPassword
    });
    return response.data;
  },
  requestPasswordReset: async (username) => {
    const response = await api.post('password-reset/request/', { username });
    return response.data;
  },
  verifyPasswordReset: async (token, words, newPassword) => {
    const response = await api.post('password-reset/verify/', {
      token,
      words,
      new_password: newPassword,
    });
    return response.data;
  },
};
