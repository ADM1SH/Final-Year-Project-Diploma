import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import api from '../api/client';

const MarketContext = createContext();

const INITIAL_ITEMS = [
  { 
    id: 1, name: 'Vintage Leather Satchel', price: '85.00', calculated_grade: 'A', 
    display_image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
    eco_impact: 12.4, seller: { username: 'Ahmad Zaki' }, description: 'Beg kulit vintaj yang dijaga rapi. Lokasi: Shah Alam.'
  },
  { 
    id: 2, name: 'Denim Trucker Jacket', price: '120.00', calculated_grade: 'B', 
    display_image: 'https://images.unsplash.com/photo-1576995853123-5a103055b1c0?q=80&w=800&auto=format&fit=crop',
    eco_impact: 8.2, seller: { username: 'Nurul Izzah' }, description: 'Jaket denim klasik. Lokasi: Bangi.'
  },
  { 
    id: 3, name: 'Fujifilm X-T3 Camera', price: '2850.00', calculated_grade: 'A', 
    display_image: 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
    eco_impact: 45.0, seller: { username: 'Farhan Rosli' }, description: 'Kamera digital mirrorless. Lokasi: Kuala Lumpur.'
  }
];

export const MarketProvider = ({ children }) => {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [favorites, setFavorites] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: 'Men' }, { id: 2, name: 'Women' }, { id: 3, name: 'Tech' }, { id: 4, name: 'Books' }
  ]);

  const refreshMarket = async () => {
    try {
      console.log('Refreshing market from API...');
      const [catRes, itemRes, favRes] = await Promise.all([
        api.get('categories/'), 
        api.get('items/'),
        api.get('favorites/')
      ]);
      
      const cats = catRes.data.results || catRes.data;
      const itemsData = itemRes.data.results || itemRes.data;
      const favsData = favRes.data.results || favRes.data;

      if (cats && cats.length > 0) setCategories(cats);
      if (itemsData && itemsData.length > 0) setItems(itemsData);
      if (favsData) setFavorites(favsData.map(f => f.item));
      
      console.log('Market refreshed successfully.');
    } catch (e) {
      console.error('Refresh Market Error:', e.message);
    }
  };

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
      category: formData.category,
      calculated_grade: formData.calculated_grade || 'A',
      display_image: localImages.length > 0 ? localImages[0] : null,
      images: localImages.map(uri => ({ image: uri })),
      eco_impact: (parseFloat(formData.price || 0) * 0.15).toFixed(1),
      seller: { username: 'adamanwar' },
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
    <MarketContext.Provider value={{ items, categories, favorites, refreshMarket, addItem, toggleFavorite }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
