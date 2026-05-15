import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import ItemCard from '../../components/ItemCard';
import api from '../../api/client';

export const ProfileScreen = ({ navigation, route }) => {
  const { user: currentUser, logout } = useAuth();
  const { items, favorites, toggleFavorite, refreshMarket } = useMarket();
  
  // Use userId from route params if available (public profile), otherwise use current user's ID
  const routeUserId = route.params?.userId;
  const isPublicProfile = !!routeUserId && routeUserId !== currentUser?.id;
  const targetUserId = routeUserId || currentUser?.id;

  const [profileData, setProfileData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Listings');

  const fetchProfileData = async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        api.get(`profiles/${targetUserId}/`),
        api.get(`profiles/${targetUserId}/user_stats/`)
      ]);
      setProfileData(profileRes.data);
      setUserStats(statsRes.data);
    } catch (err) {
      console.error('Fetch Profile Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      refreshMarket();
    }, [targetUserId])
  );

  const getFilteredItems = () => {
    const username = profileData?.username;
    if (activeTab === 'Listings') {
      return items.filter(item => (item.seller?.username === username || item.seller_name === username) && !item.is_sold);
    } else if (activeTab === 'Favorites') {
      return items.filter(item => favorites.includes(item.id));
    }
    return [];
  };

  const currentItems = getFilteredItems();
  const displayUsername = profileData?.username || (isPublicProfile ? 'User' : currentUser?.username);

  if (loading && !profileData) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.topActions}>
            {isPublicProfile ? (
              <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color={COLORS.black}/>
              </TouchableOpacity>
            ) : null}
            
            <View style={{ flex: 1 }} />

            {!isPublicProfile && currentUser?.username === 'superadmin' && (
              <TouchableOpacity 
                style={[styles.iconCircle, { backgroundColor: COLORS.danger }]}
                onPress={() => navigation.navigate('AdminDashboard')}
              >
                <Ionicons name="shield-half" size={20} color="white"/>
              </TouchableOpacity>
            )}
            {!isPublicProfile && (
              <TouchableOpacity style={styles.iconCircle} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger}/>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayUsername?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              {profileData?.is_verified && (
                <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={20} color={COLORS.primary}/></View>
              )}
            </View>
            <Text style={styles.userName}>{displayUsername}</Text>
            <View style={styles.trustBadge}>
              <Text style={styles.trustText}>ABI Trust Score: {userStats?.trust_score || profileData?.trust_score || 0}%</Text>
            </View>
            
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray}/>
              <Text style={styles.locationText}>Cyberjaya, Malaysia</Text>
            </View>

            {isPublicProfile && (
              <TouchableOpacity 
                style={styles.chatActionBtn}
                onPress={() => navigation.navigate('ChatDetail', { userName: displayUsername })}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="white" />
                <Text style={styles.chatActionText}>Chat with Seller</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats?.live_listings || '0'}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats?.items_sold || '0'}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats?.avg_rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.impactCard}>
            <View style={styles.impactContent}>
              <Ionicons name="leaf" size={24} color={COLORS.white}/>
              <View style={styles.impactTextContainer}>
                <Text style={styles.impactValue}>{userStats?.carbon_saved?.toFixed(1) || '0'}kg Carbon Saved</Text>
                <Text style={styles.impactSub}>{isPublicProfile ? "Seller's eco contribution" : "Your real-time eco impact"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tabSection}>
          <View style={styles.tabs}>
            {['Listings', !isPublicProfile && 'Favorites'].filter(Boolean).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tab, activeTab === tab && styles.activeTab]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.grid}>
            {currentItems.length > 0 ? (
              currentItems.map(item => (
                <View key={item.id} style={styles.gridItem}>
                  <ItemCard 
                    item={item} 
                    onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} 
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.includes(item.id)}
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items found.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 60, alignItems: 'center' },
  topActions: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  profileSection: { alignItems: 'center', width: '100%', marginTop: 10 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.white },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: 12, elevation: 4 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  trustBadge: { marginTop: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  trustText: { fontSize: 13, color: '#065F46', fontWeight: 'bold' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  locationText: { fontSize: 13, color: COLORS.gray, marginLeft: 5 },
  chatActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 20 },
  chatActionText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 30 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  impactCard: { marginTop: 30, backgroundColor: '#064E3B', width: '100%', borderRadius: 20, padding: 20 },
  impactContent: { flexDirection: 'row', alignItems: 'center' },
  impactTextContainer: { marginLeft: 15 },
  impactValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  impactSub: { fontSize: 12, color: COLORS.white, opacity: 0.8, marginTop: 2 },
  tabSection: { paddingHorizontal: 20, marginTop: 25 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 20 },
  tab: { marginRight: 25, fontSize: 15, color: COLORS.gray, fontWeight: 'bold', paddingBottom: 10 },
  activeTab: { color: '#064E3B', borderBottomWidth: 2, borderBottomColor: '#064E3B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 10 },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 30 },
  emptyText: { color: COLORS.gray }
});
