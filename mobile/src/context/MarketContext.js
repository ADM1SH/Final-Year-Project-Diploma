import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import api from '../api/client';
import { useAuth } from './AuthContext';

const MarketContext = createContext();

export const MarketProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshMarket = async () => {
    try {
      const [catRes, itemRes, favRes] = await Promise.all([
        api.get('categories/'), 
        api.get('items/'),
        api.get('favorites/')
      ]);
      
      const cats = catRes.data.results || catRes.data;
      const itemsData = itemRes.data.results || itemRes.data;
      const favsData = favRes.data.results || favRes.data;

      if (cats) setCategories(cats);
      if (itemsData) setItems(itemsData);
      if (favsData) setFavorites(favsData.map(f => f.item));
      
    } catch (e) {
      console.error('Refresh Market Error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMarket();
    // Real-time Background Polling: Refresh market every 10 seconds
    const interval = setInterval(refreshMarket, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleFavorite = async (itemId) => {
    try {
      const isFav = favorites.includes(itemId);
      if (isFav) {
        setFavorites(favorites.filter(id => id !== itemId));
      } else {
        setFavorites([...favorites, itemId]);
      }
      await api.post(`items/${itemId}/toggle_favorite/`);
    } catch (e) {
      console.error('Toggle Favorite Error:', e.message);
    }
  };

  const addItem = async (formData, localImages) => {
    const newItem = {
      id: Date.now(),
      name: formData.name,
      price: formData.price,
      weight: formData.weight || 0,
      category: formData.category,
      calculated_grade: formData.calculated_grade || 'A',
      display_image: localImages.length > 0 ? localImages[0] : null,
      images: localImages.map(uri => ({ image: uri })),
      eco_impact: (parseFloat(formData.weight || 0) * 2.5).toFixed(1),
      seller: { username: user?.username || 'adamanwar' },
      description: formData.description
    };
    
    setItems([newItem, ...items]);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          let value = formData[key];
          if (typeof value === 'boolean') {
            value = value ? 'true' : 'false';
          }
          if (key === 'price') {
            value = value.toString().replace(/[^0-9.]/g, '');
            if (value === '') value = '0';
          }
          data.append(key, value);
        }
      });
      localImages.forEach((uri, index) => {
        const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
        data.append('uploaded_images', {
          uri: Platform.OS === 'android' && !cleanUri.startsWith('file://') ? `file://${cleanUri}` : cleanUri,
          name: `photo_${index}.jpg`,
          type: 'image/jpeg',
        });
      });
      await api.post('items/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (e) {
      console.error('Sync Error:', e.message);
    }
  };

  return (
    <MarketContext.Provider value={{ items, categories, favorites, refreshMarket, addItem, toggleFavorite, loading }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
