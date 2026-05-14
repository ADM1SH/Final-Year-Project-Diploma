import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import CategoryChip from '../../components/CategoryChip';
import ItemCard from '../../components/ItemCard';
import { useMarket } from '../../context/MarketContext';

export const ExploreScreen = ({ navigation }) => {
  const { items, categories, refreshMarket } = useMarket();
  const [selectedCategory, setSelectedCategory] = useState(null);

  useFocusEffect(
    useCallback(() => {
      refreshMarket();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logoText}>MyPreLove</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="search-outline" size={24} color={'#064E3B'}/></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="camera-outline" size={24} color={'#064E3B'}/></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('For You')}><Ionicons name="person-circle-outline" size={28} color={'#064E3B'}/></TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          <CategoryChip 
            name="All" 
            active={selectedCategory === null} 
            onPress={() => setSelectedCategory(null)} 
          />
          {categories.map(cat => (
            <CategoryChip 
              key={cat.id} 
              name={cat.name} 
              active={selectedCategory === cat.id} 
              onPress={() => setSelectedCategory(cat.id)} 
            />
          ))}
          <CategoryChip name="Other" active={false} onPress={() => {}} />
        </ScrollView>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Curated For You</Text>
          <Text style={styles.sectionSubtitle}>Quality pre-loved items from your conscious neighbors.</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items.filter(item => !selectedCategory || item.category === selectedCategory)}
        renderItem={({ item }) => (
          <ItemCard 
            item={item} 
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} 
          />
        )}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.itemList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#064E3B', letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 15 },
  categoryContainer: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryList: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2, width: '80%' },
  viewAll: { color: '#064E3B', fontWeight: '600', fontSize: 14 },
  itemList: { paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 }
});
