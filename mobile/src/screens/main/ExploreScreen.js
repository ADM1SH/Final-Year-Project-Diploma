import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import CategoryChip from '../../components/CategoryChip';
import ItemCard from '../../components/ItemCard';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';

export const ExploreScreen = ({ navigation }) => {
  const { items, categories, favorites, refreshMarket, toggleFavorite } = useMarket();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshMarket();
    }, [])
  );

  const filteredItems = items.filter(item => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Selamat Datang,</Text>
            <Text style={styles.userName}>{user?.username || 'Adam Anwar'} 👋</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('For You')}>
              <Ionicons name="person-outline" size={22} color={COLORS.black}/>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Cari barangan pre-loved..." 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          <CategoryChip 
            name="Semua" 
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
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={({ item }) => (
          <ItemCard 
            item={item} 
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} 
            onToggleFavorite={toggleFavorite}
            isFavorite={favorites.includes(item.id)}
          />
        )}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.itemList}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Hasil carian untuk "${searchQuery}"` : 'Pilihan Untuk Anda'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {filteredItems.length} barangan ditemui
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Tiada barangan dijumpai.</Text>
            <TouchableOpacity onPress={() => {setSearchQuery(''); setSelectedCategory(null);}} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset Carian</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: 'white' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  filterBtn: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#064E3B', marginLeft: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  categoryContainer: { paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryList: { paddingHorizontal: 20 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  itemList: { paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { color: COLORS.gray, marginTop: 15, fontSize: 16, textAlign: 'center' },
  resetBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.lightGray },
  resetText: { color: COLORS.primary, fontWeight: 'bold' }
});
