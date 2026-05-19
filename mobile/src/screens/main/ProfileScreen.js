import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import ItemCard from '../../components/ItemCard';
import { ReviewModal } from '../../components/ReviewModal';
import api from '../../api/client';

export const ProfileScreen = ({ navigation, route }) => {
  const { user: currentUser, logout } = useAuth();
  const { items, favorites, toggleFavorite, refreshMarket } = useMarket();
  
  const routeUserId = route.params?.userId;
  const isPublicProfile = !!routeUserId && routeUserId !== currentUser?.id;
  const targetUserId = routeUserId || currentUser?.id;

  const [profileData, setProfileData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Listings');

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const handleCompleteSale = async (transactionId) => {
    try {
      await api.patch(`transactions/${transactionId}/`, { status: 'COMPLETED' });
      Alert.alert("Success", "Sale completed! Your trust score has been updated.");
      fetchProfileData(); 
    } catch (e) {
      console.error('Complete Sale Error:', e.message);
      Alert.alert("Error", "Could not update transaction.");
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      let profileUrl = isPublicProfile ? `profiles/${targetUserId}/` : `profiles/me/`;
      let statsUrl = isPublicProfile ? `profiles/${targetUserId}/user_stats/` : `profiles/me/user_stats/`;

      const [profileRes, statsRes, transRes] = await Promise.all([
        api.get(profileUrl),
        api.get(statsUrl),
        api.get('transactions/')
      ]);
      setProfileData(profileRes.data);
      setUserStats(statsRes.data);
      setTransactions(transRes.data.results || transRes.data);
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
    const username = profileData?.username || currentUser?.username;
    if (!username) return [];

    if (activeTab === 'Listings') {
      return items.filter(item => {
        const sellerName = item.seller?.username || item.seller_name;
        return (sellerName?.toLowerCase() === username.toLowerCase()) && !item.is_sold;
      });
    } else if (activeTab === 'Favorites') {
      return items.filter(item => favorites.includes(item.id));
    } else if (activeTab === 'Purchases') {
      return transactions.filter(t => t.buyer_name?.toLowerCase() === username.toLowerCase());
    } else if (activeTab === 'Sales') {
      return transactions.filter(t => t.seller_name?.toLowerCase() === username.toLowerCase());
    }
    return [];
  };

  const currentItems = getFilteredItems();
  const displayUsername = profileData?.username || (isPublicProfile ? 'User' : currentUser?.username);

  if (loading && !profileData) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const renderHeader = () => (
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

      <View style={styles.tabSection}>
        <View style={styles.tabs}>
          {[
            'Listings', 
            !isPublicProfile && 'Sales',
            !isPublicProfile && 'Purchases', 
            !isPublicProfile && 'Favorites'
          ].filter(Boolean).map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tab, activeTab === tab && styles.activeTab]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.transactionCard}
      onPress={() => {
        const targetId = item.item_id || item.item;
        navigation.navigate('ItemDetail', { itemId: targetId });
      }}
    >
      <View style={styles.transactionHeader}>
        <Image 
          source={{ uri: item.item_display_image || 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop' }} 
          style={styles.transactionImage} 
        />
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionTitle} numberOfLines={1}>{item.item_name}</Text>
          <Text style={styles.transactionSeller}>
            {activeTab === 'Sales' ? `Buyer: ${item.buyer_name}` : `Seller: ${item.seller_name}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#065F46' : '#92400E' }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <View>
          <Text style={styles.transactionPrice}>RM {item.final_price}</Text>
          <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>

        {activeTab === 'Sales' && item.status === 'PENDING' && (
          <TouchableOpacity 
            style={styles.completeBtn}
            onPress={() => handleCompleteSale(item.id)}
          >
            <Text style={styles.completeBtnText}>Complete Sale</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'Purchases' && item.status === 'COMPLETED' && (
          <TouchableOpacity 
            style={styles.reviewBtn}
            onPress={() => {
              setSelectedTransaction(item);
              setShowReviewModal(true);
            }}
          >
            <Text style={styles.reviewBtnText}>Review Seller</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const isTransactionTab = activeTab === 'Purchases' || activeTab === 'Sales';

  return (
    <View style={styles.container}>
      <FlatList
        data={currentItems}
        renderItem={isTransactionTab ? renderTransactionItem : ({ item }) => (
          <ItemCard 
            item={item} 
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} 
            onToggleFavorite={toggleFavorite}
            isFavorite={favorites.includes(item.id)}
          />
        )}
        keyExtractor={item => (isTransactionTab ? `t-${item.id}` : `i-${item.id}`)}
        numColumns={isTransactionTab ? 1 : 2}
        key={isTransactionTab ? 'list' : 'grid'}
        columnWrapperStyle={isTransactionTab ? null : styles.columnWrapper}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items found.</Text>
          </View>
        }
      />
      <ReviewModal 
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        transaction={selectedTransaction}
        onSuccess={fetchProfileData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 60, alignItems: 'center' },
  topActions: { 
    width: '100%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10,
    zIndex: 10
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  profileSection: { alignItems: 'center', width: '100%', marginTop: 10 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.white },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: 12, elevation: 4 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  trustBadge: { marginTop: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  trustText: { fontSize: 13, color: '#065F46', fontWeight: 'bold' },
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
  tabSection: { width: '100%', marginTop: 25 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 20 },
  tab: { marginRight: 25, fontSize: 15, color: COLORS.gray, fontWeight: 'bold', paddingBottom: 10 },
  activeTab: { color: '#064E3B', borderBottomWidth: 2, borderBottomColor: '#064E3B' },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 30 },
  emptyText: { color: COLORS.gray },
  transactionCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  transactionMeta: { flex: 1, marginLeft: 12 },
  transactionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  transactionSeller: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  transactionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  transactionPrice: { fontSize: 16, fontWeight: 'bold', color: '#0D9488' },
  transactionDate: { fontSize: 12, color: COLORS.gray },
  transactionImage: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  completeBtn: { backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  completeBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  reviewBtn: { backgroundColor: '#FBBF24', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  reviewBtnText: { color: COLORS.black, fontSize: 12, fontWeight: 'bold' }
});
