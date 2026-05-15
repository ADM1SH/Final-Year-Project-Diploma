import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import CategoryChip from '../../components/CategoryChip';
import ItemCard from '../../components/ItemCard';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const ExploreScreen = ({ navigation }) => {
  const { items, categories, favorites, refreshMarket, toggleFavorite } = useMarket();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Items'); // 'Items' or 'Users'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userResults, setUserResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMarket();
    }, [])
  );

  // Debounced user search
  useEffect(() => {
    if (activeTab === 'Users') {
      const searchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await api.get(`profiles/?search=${searchQuery}`);
          setUserResults(res.data.results || res.data);
        } catch (err) {
          console.error('User Search Error:', err.message);
        } finally {
          setLoadingUsers(false);
        }
      };
      const timeoutId = setTimeout(searchUsers, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, activeTab]);

  const filteredItems = items.filter(item => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userInitial}>{item.username?.[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.usernameText}>{item.username}</Text>
        <div style={styles.userMeta}>
          <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
          <Text style={styles.trustScoreText}>Trust Score: {item.trust_score}%</Text>
        </div>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.logoText}>MyPreLove</Text>
          </View>
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('For You')}>
            <Ionicons name="person-outline" size={22} color={COLORS.black}/>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder={activeTab === 'Items' ? "Search items..." : "Search usernames..."} 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>
        </View>
      </View>

      <View style={styles.tabToggle}>
        <TouchableOpacity 
          style={[styles.toggleBtn, activeTab === 'Items' && styles.activeToggle]}
          onPress={() => {setActiveTab('Items'); setSearchQuery('');}}
        >
          <Text style={[styles.toggleText, activeTab === 'Items' && styles.activeToggleText]}>Items</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, activeTab === 'Users' && styles.activeToggle]}
          onPress={() => {setActiveTab('Users'); setSearchQuery('');}}
        >
          <Text style={[styles.toggleText, activeTab === 'Users' && styles.activeToggleText]}>Sellers</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Items' ? (
        <>
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
                  {searchQuery ? `Search results for "${searchQuery}"` : 'Curated For You'}
                </Text>
                <Text style={styles.sectionSubtitle}>{filteredItems.length} items found</Text>
              </View>
            }
          />
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingUsers ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={userResults}
              renderItem={renderUserItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.userList}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Sellers in Cyberjaya</Text>
                  <Text style={styles.sectionSubtitle}>{userResults.length} community members found</Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={60} color={COLORS.lightGray} />
                  <Text style={styles.emptyText}>No sellers found.</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, backgroundColor: 'white' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: COLORS.gray, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#064E3B', marginTop: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { marginBottom: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  tabToggle: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 20, paddingBottom: 15 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#F3F4F6' },
  activeToggle: { backgroundColor: '#064E3B' },
  toggleText: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray },
  activeToggleText: { color: 'white' },
  categoryContainer: { paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryList: { paddingHorizontal: 20 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  itemList: { paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  userList: { paddingBottom: 100 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, borderRadius: 16, elevation: 2 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  userInitial: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 15 },
  usernameText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  userMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trustScoreText: { fontSize: 12, color: COLORS.primary, marginLeft: 5, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { color: COLORS.gray, marginTop: 15, fontSize: 16, textAlign: 'center' }
});
