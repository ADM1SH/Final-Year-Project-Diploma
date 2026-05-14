import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import ItemCard from '../../components/ItemCard';
import api from '../../api/client';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { items, favorites, toggleFavorite, refreshMarket } = useMarket();
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('My Listings');

  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        try {
          if (user?.id) {
            const res = await api.get(`profiles/${user.id}/`);
            setProfileData(res.data);
          }
        } catch (err) {}
      };
      fetchProfile();
      refreshMarket();
    }, [user])
  );

  const getFilteredItems = () => {
    if (activeTab === 'My Listings') {
      return items.filter(item => item.seller?.username === user?.username && !item.is_sold);
    } else if (activeTab === 'Sold Items') {
      return items.filter(item => item.seller?.username === user?.username && item.is_sold);
    } else if (activeTab === 'Favorites') {
      return items.filter(item => favorites.includes(item.id));
    }
    return [];
  };

  const currentItems = getFilteredItems();
  const trustScore = profileData?.trust_score || 98;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconCircle}><Ionicons name="settings-outline" size={20} color={COLORS.black}/></TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={logout}><Ionicons name="log-out-outline" size={20} color={COLORS.danger}/></TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || 'A'}</Text>
              </View>
              <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={20} color={COLORS.primary}/></View>
            </View>
            <Text style={styles.userName}>{user?.username || 'Adam Anwar'}</Text>
            <View style={styles.trustBadge}>
              <Text style={styles.trustText}>Trust Score: {trustScore}%</Text>
            </View>
            <Text style={styles.bio}>Curating high-quality pre-loved items in Cyberjaya. Sustainable fashion enthusiast.</Text>
            
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray}/>
              <Text style={styles.locationText}>Cyberjaya, Malaysia</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={styles.statValue}>24</Text><Text style={styles.statLabel}>Listings</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>89</Text><Text style={styles.statLabel}>Sold</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>4.9</Text><Text style={styles.statLabel}>Rating</Text></View>
          </View>

          <View style={styles.impactCard}>
            <View style={styles.impactContent}>
              <Ionicons name="leaf" size={24} color={COLORS.white}/>
              <View style={styles.impactTextContainer}>
                <Text style={styles.impactValue}>142kg Carbon Saved</Text>
                <Text style={styles.impactSub}>Your contribution to a greener planet</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tabSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {['My Listings', 'Sold Items', 'Favorites'].map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tab, activeTab === tab && styles.activeTab]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
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
                <Text style={styles.emptyText}>No items found here.</Text>
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
  scrollContent: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 60, alignItems: 'center' },
  topActions: { position: 'absolute', top: 60, right: 20, flexDirection: 'row' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginLeft: 12, elevation: 2 },
  profileSection: { alignItems: 'center', width: '100%', marginTop: 20 },
  avatarContainer: { marginBottom: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 44, fontWeight: 'bold', color: COLORS.white },
  verifiedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'white', borderRadius: 14, elevation: 4 },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#111827', letterSpacing: -0.5 },
  trustBadge: { marginTop: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  trustText: { fontSize: 14, color: '#065F46', fontWeight: 'bold' },
  bio: { fontSize: 15, color: '#4B5563', textAlign: 'center', marginTop: 15, paddingHorizontal: 30, lineHeight: 22 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  locationText: { fontSize: 14, color: COLORS.gray, marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 35, paddingHorizontal: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  impactCard: { marginTop: 35, backgroundColor: '#064E3B', width: '100%', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  impactContent: { flexDirection: 'row', alignItems: 'center' },
  impactTextContainer: { marginLeft: 16 },
  impactValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  impactSub: { fontSize: 13, color: COLORS.white, opacity: 0.8, marginTop: 2 },
  tabSection: { paddingHorizontal: 20, marginTop: 30 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 25 },
  tab: { marginRight: 30, fontSize: 16, color: COLORS.gray, fontWeight: 'bold', paddingBottom: 15 },
  activeTab: { color: '#064E3B', borderBottomWidth: 2, borderBottomColor: '#064E3B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 10 },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 40 },
  emptyText: { color: COLORS.gray }
});
