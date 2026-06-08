import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const AdminItemManagementScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await api.get('items/');
      setItems(res.data.results || res.data);
    } catch (err) {
      console.error('Fetch Items Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const deleteItem = (itemId, name) => {
    Alert.alert(
      "Confirm Delete",
      `Remove "${name}" from the marketplace?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`items/${itemId}/`);
              setItems(items.filter(i => i.id !== itemId));
              Alert.alert("Success", "Listing removed.");
            } catch (err) {
              Alert.alert("Error", "Could not remove listing.");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.display_image }} style={styles.thumbnail} />
      <View style={styles.itemInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.price}>RM {parseFloat(item.price || 0).toFixed(2)}</Text>
        <Text style={styles.seller}>By: {item.seller_name}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(item.id, item.name)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory Control</Text>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.background
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginLeft: 15, 
    flex: 1, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  list: { padding: 20 },
  itemCard: { 
    backgroundColor: COLORS.white, 
    padding: 14, 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  thumbnail: { width: 50, height: 50, borderRadius: 8, backgroundColor: COLORS.lightGray },
  itemInfo: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  price: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  seller: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  deleteBtn: { padding: 10 }
});
