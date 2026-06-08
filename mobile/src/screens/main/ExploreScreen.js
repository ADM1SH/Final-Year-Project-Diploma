/**
 * File: ExploreScreen.js
 * Description: Main marketplace feed displaying category chips and listing cards.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';
import CategoryChip from '../../components/CategoryChip';
import ItemCard from '../../components/ItemCard';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { FeedCardSkeleton, SellerRowSkeleton } from '../../components/SkeletonLoader';
import EmptyState from '../../components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ExploreScreen = ({ navigation }) => {
  const { items, categories, favorites, refreshMarket, toggleFavorite, loading: loadingItems } = useMarket();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Items'); // 'Items' or 'Users'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locations = ['All', 'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Melaka', 'Sarawak', 'Sabah'];
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [tempLocation, setTempLocation] = useState('All');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  
  const [userResults, setUserResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price_asc', 'price_desc', 'trusted_seller'
  const [showEcoLeaderboard, setShowEcoLeaderboard] = useState(false);
  const [ecoLeaderboardData, setEcoLeaderboardData] = useState([]);
  const [loadingEco, setLoadingEco] = useState(false);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (showLocationModal) {
      setTempLocation(selectedLocation);
      setMinPriceInput(minPrice);
      setMaxPriceInput(maxPrice);
    }
  }, [showLocationModal]);

  const handleApplyFilters = () => {
    setSelectedLocation(tempLocation);
    setMinPrice(minPriceInput);
    setMaxPrice(maxPriceInput);
    setShowLocationModal(false);
  };

  const handleResetFilters = () => {
    setTempLocation('All');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSelectedLocation('All');
    setMinPrice('');
    setMaxPrice('');
    setShowLocationModal(false);
  };

  const handleOpenEcoLeaderboard = async () => {
    setShowEcoLeaderboard(true);
    setLoadingEco(true);
    try {
      const res = await api.get('profiles/eco_leaderboard/');
      setEcoLeaderboardData(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not load ECO Leaderboard.");
    } finally {
      setLoadingEco(false);
    }
  };

  const saveSearchQuery = async (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    try {
      let searches = [...recentSearches];
      searches = searches.filter(s => s !== trimmed);
      searches.unshift(trimmed);
      if (searches.length > 5) searches = searches.slice(0, 5);
      setRecentSearches(searches);
      await AsyncStorage.setItem('recent_searches', JSON.stringify(searches));
    } catch (e) {}
  };

  const removeRecentSearch = async (query) => {
    try {
      const searches = recentSearches.filter(s => s !== query);
      setRecentSearches(searches);
      await AsyncStorage.setItem('recent_searches', JSON.stringify(searches));
    } catch (e) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMarket();
    if (activeTab === 'Users') {
      try {
        const res = await api.get(`profiles/?search=${searchQuery}`);
        setUserResults(res.data.results || res.data);
      } catch (err) {}
    }
    setRefreshing(false);
  };

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
    // Only show items that are NOT sold
    if (item.is_sold) return false;
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
                         
    // DIPLOMA FYP COMMENT:
    // Filtering listings client-side by location for optimal responsiveness.
    // If the user selected a location (e.g. Kuala Lumpur), we check if the item's
    // seller_location field matches the selection.
    const matchesLocation = selectedLocation === 'All' || 
                           (item.seller_location && item.seller_location.toLowerCase().includes(selectedLocation.toLowerCase()));
    
    const matchesMinPrice = !minPrice || parseFloat(item.price) >= parseFloat(minPrice);
    const matchesMaxPrice = !maxPrice || parseFloat(item.price) <= parseFloat(maxPrice);
                           
    return matchesCategory && matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      return priceA - priceB;
    }
    if (sortBy === 'price_desc') {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      return priceB - priceA;
    }
    if (sortBy === 'trusted_seller') {
      const scoreA = parseFloat(a.seller_trust_score) || (a.seller && a.seller.trust_score) || 0;
      const scoreB = parseFloat(b.seller_trust_score) || (b.seller && b.seller.trust_score) || 0;
      return scoreB - scoreA;
    }
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    // Fallback to 0 if the date string is invalid (e.g. optimistic update)
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const renderUserItem = ({ item }) => {
    const isHighlyTrusted = item.trust_score >= 80;
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.user || item.id })}
      >
        <View>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>{item.username?.[0]?.toUpperCase()}</Text>
          </View>
          {/* Note: Misleading green 'online' activeDot removed as there is no real-time presence system */}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.usernameText}>{item.username}</Text>
          <View style={styles.userMeta}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
            <Text style={styles.trustScoreText}>Trust Score: {item.trust_score}%</Text>
            {isHighlyTrusted && (
              <View style={styles.trustedBadge}>
                <Text style={styles.trustedBadgeText}>Trusted</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.primary, '#00421e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{(() => {
              const hr = new Date().getHours();
              if (hr < 12) return 'Good morning';
              if (hr < 17) return 'Good afternoon';
              if (hr < 22) return 'Good evening';
              return 'Happy night hunting';
            })()},</Text>
            <Text style={styles.logoText}>MyPreLove</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.iconCircle, { marginRight: 8, backgroundColor: '#D1FAE5' }]} onPress={handleOpenEcoLeaderboard}>
              <Ionicons name="leaf" size={20} color="#10B981"/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('For You')}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary}/>
            </TouchableOpacity>
          </View>
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
              onSubmitEditing={() => saveSearchQuery(searchQuery)}
              returnKeyType="search"
            />
          </View>
        </View>
      </LinearGradient>

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

        {activeTab === 'Items' && (
          <TouchableOpacity 
            style={[styles.toggleBtn, (selectedLocation !== 'All' || minPrice || maxPrice) && styles.activeToggle, { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={14} color={(selectedLocation !== 'All' || minPrice || maxPrice) ? 'white' : COLORS.gray} style={{ marginRight: 4 }} />
            <Text style={[styles.toggleText, (selectedLocation !== 'All' || minPrice || maxPrice) && styles.activeToggleText]}>
              {(selectedLocation !== 'All' || minPrice || maxPrice) ? 'Filters Active' : 'Filters'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Searches Row */}
      {recentSearches.length > 0 && !searchQuery && (
        <View style={styles.recentSearchesContainer}>
          <Text style={styles.recentTitle}>Recent:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
            {recentSearches.map((s, idx) => (
              <View key={idx} style={styles.recentChip}>
                <TouchableOpacity onPress={() => setSearchQuery(s)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={12} color={COLORS.gray} style={{ marginRight: 4 }} />
                  <Text style={styles.recentChipText}>{s}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeRecentSearch(s)} style={{ marginLeft: 6, paddingHorizontal: 2 }}>
                  <Ionicons name="close" size={14} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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
                  icon={cat.icon_name}
                  active={selectedCategory === cat.id} 
                  onPress={() => setSelectedCategory(cat.id)} 
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.sortContainer}>
            <Text style={styles.sortTitle}>Sort:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortList}>
              <TouchableOpacity 
                style={[styles.sortChip, sortBy === 'newest' && styles.activeSortChip]}
                onPress={() => setSortBy('newest')}
              >
                <Text style={[styles.sortChipText, sortBy === 'newest' && styles.activeSortChipText]}>Newest</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortChip, sortBy === 'price_asc' && styles.activeSortChip]}
                onPress={() => setSortBy('price_asc')}
              >
                <Text style={[styles.sortChipText, sortBy === 'price_asc' && styles.activeSortChipText]}>Price: Low - High</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortChip, sortBy === 'price_desc' && styles.activeSortChip]}
                onPress={() => setSortBy('price_desc')}
              >
                <Text style={[styles.sortChipText, sortBy === 'price_desc' && styles.activeSortChipText]}>Price: High - Low</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortChip, sortBy === 'trusted_seller' && styles.activeSortChip]}
                onPress={() => setSortBy('trusted_seller')}
              >
                <Text style={[styles.sortChipText, sortBy === 'trusted_seller' && styles.activeSortChipText]}>Trusted Seller</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {loadingItems ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 15 }}>
              <FeedCardSkeleton />
              <FeedCardSkeleton />
              <FeedCardSkeleton />
              <FeedCardSkeleton />
              <FeedCardSkeleton />
              <FeedCardSkeleton />
            </View>
          ) : (
            <FlatList
              data={sortedItems}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
              }
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
              initialNumToRender={6}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {searchQuery ? `Search results for "${searchQuery}"` : 'Curated For You'}
                  </Text>
                  <Text style={styles.sectionSubtitle}>{sortedItems.length} items found</Text>
                </View>
              }
              ListEmptyComponent={
                <EmptyState 
                  icon="search-outline"
                  title="No Listings Found"
                  description="We couldn't find any items matching your filters or search query. Try resetting your search."
                  actionText="Clear All Filters"
                  onActionPress={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                    setSelectedLocation('All');
                  }}
                />
              }
            />
          )}
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingUsers ? (
            <View style={{ paddingHorizontal: 20 }}>
              <SellerRowSkeleton />
              <SellerRowSkeleton />
              <SellerRowSkeleton />
              <SellerRowSkeleton />
            </View>
          ) : (
            <FlatList
              data={userResults}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
              }
              renderItem={renderUserItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.userList}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Marketplace Community</Text>
                  <Text style={styles.sectionSubtitle}>{userResults.length} members found</Text>
                </View>
              }
              ListEmptyComponent={
                <EmptyState 
                  icon="people-outline"
                  title="All Quiet in the Community"
                  description="No sellers match your search query. Try checking again with a different name."
                  actionText="Clear Search"
                  onActionPress={() => setSearchQuery('')}
                />
              }
            />
          )}
        </View>
      )}

      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>Search Filters</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.locationModalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.locationListScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.locationGrid}>
                {locations.map((loc) => {
                  const isSelected = tempLocation === loc;
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[styles.locationChip, isSelected && styles.locationChipSelected]}
                      onPress={() => setTempLocation(loc)}
                    >
                      <Text style={[styles.locationChipText, isSelected && styles.locationChipTextSelected]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Price Range (RM)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.filterPriceInput}
                  placeholder="Min"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                  value={minPriceInput}
                  onChangeText={setMinPriceInput}
                />
                <Text style={{ marginHorizontal: 10, color: COLORS.black }}>to</Text>
                <TextInput
                  style={styles.filterPriceInput}
                  placeholder="Max"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                  value={maxPriceInput}
                  onChangeText={setMaxPriceInput}
                />
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.filterResetBtn} onPress={handleResetFilters}>
                <Text style={styles.filterResetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyBtn} onPress={handleApplyFilters}>
                <Text style={styles.filterApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEcoLeaderboard}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEcoLeaderboard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.leaderboardModalContent}>
            <View style={styles.leaderboardHeader}>
              <Ionicons name="leaf" size={22} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.leaderboardTitle}>CO₂ Eco Contributors</Text>
              <TouchableOpacity onPress={() => setShowEcoLeaderboard(false)} style={{ marginLeft: 'auto' }}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            {loadingEco ? (
              <ActivityIndicator color="#10B981" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ marginTop: 15 }} showsVerticalScrollIndicator={false}>
                {ecoLeaderboardData.map((user, index) => {
                  const isTop3 = index < 3;
                  const medalColors = ['#FBBF24', '#94A3B8', '#D97706']; // Gold, Silver, Bronze
                  return (
                    <View key={user.user_id || index} style={styles.leaderboardRow}>
                      <View style={styles.rankBadge}>
                        {isTop3 ? (
                          <Ionicons name="trophy" size={16} color={medalColors[index]} />
                        ) : (
                          <Text style={styles.rankText}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.leaderboardUserInfo}>
                        <Text style={styles.leaderboardUsername}>{user.username}</Text>
                        <Text style={styles.leaderboardTrust}>Trust: {user.trust_score}%</Text>
                      </View>
                      <View style={styles.leaderboardImpact}>
                        <Text style={styles.leaderboardCO2}>{user.total_eco_saved?.toFixed(1) || '0'} kg</Text>
                        <Text style={styles.leaderboardImpactSub}>CO₂ Saved</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 52 : 44, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  greeting: { 
    fontSize: 11, 
    color: 'rgba(255, 255, 255, 0.75)', 
    letterSpacing: 1.5, 
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-SemiBold'
  },
  logoText: { 
    fontSize: 28, 
    color: '#FFFFFF', 
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'PlayfairDisplay-Bold'
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  searchContainer: { marginBottom: 0 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 22, paddingHorizontal: 15, height: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular'
  },
  tabToggle: { flexDirection: 'row', backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginRight: 10, backgroundColor: COLORS.lightGray },
  activeToggle: { backgroundColor: COLORS.primary },
  toggleText: { 
    fontSize: 13, 
    color: COLORS.gray,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold'
  },
  activeToggleText: { color: 'white' },
  categoryContainer: { paddingVertical: 15, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  categoryList: { paddingHorizontal: 20 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { 
    fontSize: 20, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'PlayfairDisplay-SemiBold'
  },
  sectionSubtitle: { 
    fontSize: 13, 
    color: COLORS.gray, 
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular'
  },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray + '20' },
  activeFilterChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { 
    fontSize: 12, 
    color: COLORS.primary, 
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-SemiBold'
  },
  activeFilterChipText: { color: 'white' },
  itemList: { paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  userList: { paddingBottom: 100 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  userInitial: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 15 },
  usernameText: { 
    fontSize: 16, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold'
  },
  userMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trustScoreText: { 
    fontSize: 12, 
    color: COLORS.primary, 
    marginLeft: 5, 
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-SemiBold'
  },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { color: COLORS.gray, marginTop: 15, fontSize: 16, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular' },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
  },
  trustedBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  trustedBadgeText: {
    color: '#0369A1',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  locationModalCloseBtn: {
    padding: 4,
  },
  locationListScroll: {
    marginTop: 10,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  locationChipSelected: {
    backgroundColor: '#064E3B15',
    borderColor: '#064E3B',
  },
  locationChipText: {
    fontSize: 13,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  locationChipTextSelected: {
    color: '#064E3B',
    fontWeight: 'bold',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  filterPriceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.black,
    backgroundColor: '#F8FAFC',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 16,
    marginTop: 16,
  },
  filterResetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterResetBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  filterApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterApplyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  leaderboardModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '75%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  leaderboardTrust: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  leaderboardImpact: {
    alignItems: 'flex-end',
  },
  leaderboardCO2: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  leaderboardImpactSub: {
    fontSize: 10,
    color: COLORS.gray,
  },
  recentSearchesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  recentList: {
    alignItems: 'center',
    paddingRight: 20,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 12,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  sortTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  sortList: {
    alignItems: 'center',
    paddingRight: 20,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeSortChip: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '30',
  },
  sortChipText: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  activeSortChipText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
