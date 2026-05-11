import api from './client';

export const AuthService = {
  login: async (username, password) => {
    const response = await api.post('login/', { username, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('register/', userData);
    return response.data;
  },
};

export const ItemService = {
  getItems: async (params) => {
    const response = await api.get('items/', { params });
    return response.data;
  },
  getItemDetails: async (id) => {
    const response = await api.get(`items/${id}/`);
    return response.data;
  },
  createItem: async (formData) => {
    const response = await api.post('items/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const ProfileService = {
  getProfile: async (id) => {
    const response = await api.get(`profiles/${id}/`);
    return response.data;
  },
};
