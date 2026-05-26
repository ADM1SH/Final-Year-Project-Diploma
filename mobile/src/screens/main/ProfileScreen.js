import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, RefreshControl, Modal, TextInput } from 'react-native';
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
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Listings');
  const [walletHistory, setWalletHistory] = useState([]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfileData(), refreshMarket()]);
    setRefreshing(false);
  };

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Trust Score Modal State
  const [showTrustModal, setShowTrustModal] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // New States for Reports and Reviews
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [pastReviews, setPastReviews] = useState([]);

  // Wallet States
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [submittingWallet, setSubmittingWallet] = useState(false);

  const handleTopUp = async () => {
    const amountNum = parseFloat(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid amount greater than 0.");
      return;
    }
    
    setSubmittingWallet(true);
    try {
      const response = await api.post('profiles/me/top_up/', { amount: amountNum });
      if (response.data.success) {
        Alert.alert("Success", `Topped up RM ${amountNum.toFixed(2)} successfully!`);
        setShowWalletModal(false);
        setTopupAmount('');
        fetchProfileData();
      }
    } catch (e) {
      console.error('Top Up Error:', e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not complete top up.");
    } finally {
      setSubmittingWallet(false);
    }
  };

  const handleCompleteSale = async (transactionId) => {
    try {
      await api.patch(`transactions/${transactionId}/`, { status: 'COMPLETED' });
      Alert.alert("Success", "Sale completed! Your trust score has been updated.");
      fetchProfileData(); 
    } catch (e) {
      console.error('Complete Sale Error:', e.message);
      const errorMsg = e.response?.data?.status?.[0] || e.response?.data?.non_field_errors?.[0] || e.response?.data?.error || "Could not update transaction.";
      Alert.alert("Error", errorMsg);
    }
  };

  const handleReportSeller = async () => {
    if (!reportReason) return Alert.alert("Error", "Please provide a reason.");
    
    setReporting(true);
    try {
      await api.post('scam-reports/', {
        reported_user: targetUserId,
        reason: reportReason
      });
      Alert.alert("Report Filed", "Thank you for helping keep MyPreLove safe. Our admins will review this.");
      setShowReportModal(false);
      setReportReason('');
    } catch (e) {
      console.error('Report Error Details:', e.message);
      Alert.alert("Error", "Could not file report. Please try again.");
    } finally {
      setReporting(false);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const profileUrl = isPublicProfile ? `profiles/${targetUserId}/` : `profiles/me/`;
      const statsUrl = isPublicProfile ? `profiles/${targetUserId}/user_stats/` : `profiles/me/user_stats/`;

      const [profileRes, statsRes, transRes, reviewRes, walletRes] = await Promise.all([
        api.get(profileUrl),
        api.get(statsUrl),
        isPublicProfile ? Promise.resolve({ data: [] }) : api.get('transactions/'),
        api.get(`reviews/?seller=${targetUserId}`),
        isPublicProfile ? Promise.resolve({ data: [] }) : api.get('profiles/me/wallet_history/')
      ]);
      setProfileData(profileRes.data);
      setUserStats(statsRes.data);
      setTransactions(transRes.data.results || transRes.data);
      setPastReviews(reviewRes.data.results || reviewRes.data);
      setWalletHistory(walletRes.data || []);
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

      const interval = setInterval(() => {
        fetchProfileData();
        refreshMarket();
      }, 10000); // 10-second background polling for live feel

      return () => clearInterval(interval);
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
    } else if (activeTab === 'Reviews') {
      return pastReviews;
    }
    return [];
  };

  const currentItems = getFilteredItems();
  const displayUsername = profileData?.username || (isPublicProfile ? 'User' : currentUser?.username);

  const pendingSalesCount = transactions.filter(t => t.seller_name === currentUser?.username && t.status === 'PENDING').length;
  const pendingPurchasesCount = transactions.filter(t => t.buyer_name === currentUser?.username && t.status === 'PENDING').length;

  if (loading && !profileData) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const renderWalletTransactionItem = ({ item }) => {
    let typeColor = '#EF4444'; // default red
    let prefix = '-';
    let icon = 'arrow-down-circle-outline';

    if (item.tx_type === 'TOP_UP') {
      typeColor = '#10B981'; // green
      prefix = '+';
      icon = 'add-circle-outline';
    } else if (item.tx_type === 'SALE') {
      typeColor = '#10B981'; // green
      prefix = '+';
      icon = 'arrow-up-circle-outline';
    } else if (item.tx_type === 'PURCHASE') {
      prefix = '-';
      icon = 'cart-outline';
    }

    return (
      <View style={styles.ledgerCard}>
        <View style={styles.ledgerHeader}>
          <View style={[styles.ledgerIconContainer, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={icon} size={20} color={typeColor} />
          </View>
          <View style={styles.ledgerMeta}>
            <Text style={styles.ledgerTitle}>{item.description}</Text>
            <Text style={styles.ledgerDate}>
              {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.ledgerAmount, { color: typeColor }]}>
            {prefix}RM {parseFloat(item.amount || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.reviewer_name}</Text>
        <View style={styles.ratingRow}>
          {[1,2,3,4,5].map(s => (
            <Ionicons key={s} name="star" size={14} color={s <= item.rating ? "#FBBF24" : COLORS.lightGray} />
          ))}
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.topActions}>
        {isPublicProfile ? (
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.black}/>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconCircle} onPress={() => Alert.alert("Edit Profile", "Profile editing feature: Use the Admin Dashboard to manage users, or update your profile picture in the mobile settings soon!")}>
            <Ionicons name="create-outline" size={20} color={COLORS.black}/>
          </TouchableOpacity>
        )}
        
        <View style={{ flex: 1 }} />

        {isPublicProfile && (
           <TouchableOpacity 
           style={[styles.iconCircle, { backgroundColor: COLORS.danger + '10' }]} 
           onPress={() => setShowReportModal(true)}
         >
           <Ionicons name="flag-outline" size={20} color={COLORS.danger}/>
         </TouchableOpacity>
        )}

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
        <TouchableOpacity style={styles.trustBadge} onPress={() => setShowTrustModal(true)}>
          <Text style={styles.trustText}>ABI Trust Score: {userStats?.trust_score || profileData?.trust_score || 0}%</Text>
          <Ionicons name="information-circle-outline" size={14} color="#065F46" style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {isPublicProfile ? (
          <TouchableOpacity 
            style={styles.chatActionBtn}
            onPress={() => navigation.navigate('ChatDetail', { userName: displayUsername, userId: targetUserId })}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="white" />
            <Text style={styles.chatActionText}>Chat with Seller</Text>
          </TouchableOpacity>
        ) : null}
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

      {/* Wallet Section for Own Profile */}
      {!isPublicProfile && (
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="wallet-outline" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.walletTitle}>MyPreLove Cash Wallet</Text>
                <Text style={styles.walletSub} numberOfLines={1}>Use for seamless in-app local purchases</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.topupBtn} onPress={() => setShowWalletModal(true)}>
              <Ionicons name="add-circle-outline" size={14} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.topupText}>Top Up</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.walletBalance}>
            RM {parseFloat(profileData?.wallet_balance || 0.00).toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.tabSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {([
              'Listings', 
              'Reviews',
              !isPublicProfile ? 'Sales' : null,
              !isPublicProfile ? 'Purchases' : null, 
              !isPublicProfile ? 'Favorites' : null,
              !isPublicProfile ? 'Wallet History' : null
            ].filter(Boolean)).map(tab => {
              let badge = 0;
              if (tab === 'Sales') badge = pendingSalesCount;
              if (tab === 'Purchases') badge = pendingPurchasesCount;

              return (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                  <View style={styles.tabContent}>
                    <Text style={[styles.tab, activeTab === tab && styles.activeTab]}>{tab}</Text>
                    {badge > 0 && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{badge}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
          <Text style={styles.transactionPrice}>RM {parseFloat(item.final_price || 0).toFixed(2)}</Text>
          <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.status === 'COMPLETED' && (
            <TouchableOpacity 
              style={styles.receiptBtn}
              onPress={() => {
                setSelectedTransaction(item);
                setShowReceiptModal(true);
              }}
            >
              <Ionicons name="receipt-outline" size={14} color="#065F46" style={{ marginRight: 4 }} />
              <Text style={styles.receiptBtnText}>Receipt</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'Sales' && item.status === 'PENDING' && (
            <TouchableOpacity 
              style={[styles.completeBtn, { marginLeft: 8 }]}
              onPress={() => handleCompleteSale(item.id)}
            >
              <Text style={styles.completeBtnText}>Complete Sale</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'Purchases' && item.status === 'COMPLETED' && (
            <TouchableOpacity 
              style={[styles.reviewBtn, { marginLeft: 8 }]}
              onPress={() => {
                setSelectedTransaction(item);
                setShowReviewModal(true);
              }}
            >
              <Text style={styles.reviewBtnText}>Review Seller</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const isTransactionTab = activeTab === 'Purchases' || activeTab === 'Sales';
  const isSingleColumn = isTransactionTab || activeTab === 'Reviews' || activeTab === 'Wallet History';

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTab === 'Wallet History' ? walletHistory : currentItems}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        renderItem={
          activeTab === 'Wallet History' 
            ? renderWalletTransactionItem 
            : (activeTab === 'Reviews' 
                ? renderReviewItem 
                : (isTransactionTab 
                    ? renderTransactionItem 
                    : ({ item }) => (
                        <ItemCard 
                          item={item} 
                          onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} 
                          onToggleFavorite={toggleFavorite}
                          isFavorite={favorites.includes(item.id)}
                          onSellerPress={() => {
                            const sellerId = item.seller?.id || item.seller;
                            if (sellerId) {
                              navigation.push('UserProfile', { userId: sellerId });
                            }
                          }}
                        />
                      )
                  )
              )
        }
        keyExtractor={item => (activeTab === 'Wallet History' ? `w-${item.id}` : (isTransactionTab || activeTab === 'Reviews' ? `t-${item.id}` : `i-${item.id}`))}
        numColumns={isSingleColumn ? 1 : 2}
        key={isSingleColumn ? 'list' : 'grid'}
        columnWrapperStyle={isSingleColumn ? null : styles.columnWrapper}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'Wallet History' ? 'No wallet transactions found.' : 'No items found.'}
            </Text>
          </View>
        }
      />
      
      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Seller</Text>
            <Text style={styles.modalSub}>Why are you reporting {displayUsername}?</Text>
            <TextInput 
              style={styles.reportInput} 
              placeholder="e.g. Fraudulent behavior, misleading items..."
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportSubmitBtn} onPress={handleReportSeller} disabled={reporting}>
                {reporting ? <ActivityIndicator color="white" /> : <Text style={styles.reportSubmitText}>Submit Report</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReviewModal 
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        transaction={selectedTransaction}
        onSuccess={fetchProfileData}
      />

      {/* Wallet Top Up Modal */}
      <Modal visible={showWalletModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="wallet-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
            </View>
            <Text style={styles.modalSub}>Add virtual cash to your MyPreLove Wallet for instant buying.</Text>
            
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencyPrefix}>RM</Text>
              <TextInput 
                style={styles.amountInput} 
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={topupAmount}
                onChangeText={setTopupAmount}
                autoFocus
              />
            </View>
            
            <View style={styles.quickAmounts}>
              {['50', '100', '200', '500'].map(val => (
                <TouchableOpacity 
                  key={val} 
                  style={styles.quickAmountBtn}
                  onPress={() => setTopupAmount(val)}
                >
                  <Text style={styles.quickAmountText}>+RM {val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowWalletModal(false); setTopupAmount(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletSubmitBtn} onPress={handleTopUp} disabled={submittingWallet}>
                {submittingWallet ? <ActivityIndicator color="white" /> : <Text style={styles.walletSubmitText}>Confirm Top Up</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ABI Trust Score Breakdown Modal */}
      <Modal visible={showTrustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.trustModalHeader}>
              <View style={styles.trustHeaderTitleRow}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Trust Score Breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTrustModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.trustOverallContainer}>
              <Text style={styles.trustOverallLabel}>Overall Trust Level</Text>
              <View style={styles.trustOverallValueRow}>
                <Text style={styles.trustOverallValue}>
                  {userStats?.trust_score || profileData?.trust_score || 0}%
                </Text>
                <Text style={styles.trustOverallGrade}>
                  {(() => {
                    const score = userStats?.trust_score || profileData?.trust_score || 0;
                    if (score >= 90) return 'Excellent';
                    if (score >= 70) return 'Good';
                    if (score >= 50) return 'Fair';
                    return 'Needs Improvement';
                  })()}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.trustBreakdownScroll} showsVerticalScrollIndicator={false}>
              {/* Integrity Section (20 Points) */}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Integrity</Text>
                    <Text style={styles.abiWeight}> (20 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {profileData?.is_verified ? '20' : '0'} / 20
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: profileData?.is_verified ? '100%' : '0%',
                        backgroundColor: '#059669' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.abiDescription}>
                  {profileData?.is_verified 
                    ? "✓ User is verified by Admin (+20 points)." 
                    : "✗ User is not verified yet (0 points). Admin verification is required."}
                </Text>
              </View>

              {/* Ability Section (30 Points) */}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Ability</Text>
                    <Text style={styles.abiWeight}> (30 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {Math.min(30, (userStats?.items_sold || 0) * 3)} / 30
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${(Math.min(30, (userStats?.items_sold || 0) * 3) / 30) * 100}%`,
                        backgroundColor: '#2563EB' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.abiDescription}>
                  Earn 3 points per successful sale (up to 30). Completed sales: {userStats?.items_sold || 0}.
                </Text>
              </View>

              {/* Benevolence Section (50 Points) */}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Benevolence</Text>
                    <Text style={styles.abiWeight}> (50 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {((userStats?.avg_rating || 0.0) * 10).toFixed(1)} / 50
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${((userStats?.avg_rating || 0.0) * 10 / 50) * 100}%`,
                        backgroundColor: '#D97706' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.abiDescription}>
                  Calculated as Average Buyer Rating × 10. Current Average Rating: {userStats?.avg_rating?.toFixed(1) || '0.0'} / 5.0.
                </Text>
              </View>

              {/* Educational info card */}
              <View style={styles.trustInfoCard}>
                <Ionicons name="information-circle" size={20} color="#065F46" style={{ marginRight: 8 }} />
                <Text style={styles.trustInfoText}>
                  The ABI (Integrity, Ability, Benevolence) model calculates trust based on identity verification, completed transactions, and community feedback.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Digital Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptPaper}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptSuccessIcon}>
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
              <Text style={styles.receiptMerchant}>MYPRELOVE OFFICIAL RECEIPT</Text>
              <Text style={styles.receiptMerchantSub}>Love it again. Sustainable Secondhand.</Text>
            </View>

            <View style={styles.receiptStampContainer}>
              <View style={styles.receiptStamp}>
                <Text style={styles.receiptStampText}>PAID</Text>
              </View>
            </View>

            <View style={styles.receiptDashedLine} />

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt No</Text>
                <Text style={styles.receiptValue}>MPL-TX-{selectedTransaction?.id || '0000'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date & Time</Text>
                <Text style={styles.receiptValue}>
                  {selectedTransaction ? new Date(selectedTransaction.created_at).toLocaleString() : ''}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Buyer</Text>
                <Text style={styles.receiptValue}>{selectedTransaction?.buyer_name || 'N/A'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Seller</Text>
                <Text style={styles.receiptValue}>{selectedTransaction?.seller_name || 'N/A'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment Method</Text>
                <Text style={styles.receiptValue}>
                  {(() => {
                    const method = selectedTransaction?.payment_method;
                    if (method === 'WALLET') return 'MyPreLove Cash Wallet';
                    if (method === 'CASH') return 'Cash on Delivery';
                    if (method === 'TRANSFER') return 'Bank Transfer';
                    return method || 'N/A';
                  })()}
                </Text>
              </View>
            </View>

            <View style={styles.receiptDashedLine} />

            <View style={styles.receiptItems}>
              <View style={styles.receiptItemRow}>
                <Text style={styles.receiptItemName}>{selectedTransaction?.item_name || 'Item Name'}</Text>
                <Text style={styles.receiptItemPrice}>
                  RM {parseFloat(selectedTransaction?.final_price || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.receiptDashedLine} />

            <View style={styles.receiptPricing}>
              <View style={styles.receiptPriceRow}>
                <Text style={styles.receiptPriceLabel}>Subtotal</Text>
                <Text style={styles.receiptPriceVal}>
                  RM {parseFloat(selectedTransaction?.final_price || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.receiptPriceRow}>
                <Text style={styles.receiptPriceLabel}>Discount</Text>
                <Text style={styles.receiptPriceVal}>RM 0.00</Text>
              </View>
              <View style={[styles.receiptPriceRow, { marginTop: 8 }]}>
                <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                <Text style={styles.receiptTotalVal}>
                  RM {parseFloat(selectedTransaction?.final_price || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.receiptDashedLine} />

            <View style={styles.receiptFooter}>
              <Ionicons name="barcode-outline" size={40} color={COLORS.black} style={{ alignSelf: 'center', marginBottom: 4 }} />
              <Text style={styles.receiptFooterCode}>*MPL-TX-{selectedTransaction?.id || '0000'}*</Text>
              <View style={styles.receiptEcoBanner}>
                <Ionicons name="leaf" size={14} color="#047857" style={{ marginRight: 6 }} />
                <Text style={styles.receiptEcoText}>
                  Eco-Impact: This secondhand transaction saved approx. 2.5kg of CO2!
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.receiptCloseBtn} 
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.receiptCloseBtnText}>Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  trustBadge: { marginTop: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
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
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabs: { flexDirection: 'row', paddingBottom: 10 },
  tabItem: { marginRight: 25 },
  tabContent: { flexDirection: 'row', alignItems: 'center' },
  tab: { fontSize: 15, color: COLORS.gray, fontWeight: 'bold' },
  activeTab: { color: '#064E3B' },
  tabBadge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 30 },
  emptyText: { color: COLORS.gray },
  reviewCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontWeight: 'bold', fontSize: 15, color: '#111827' },
  ratingRow: { flexDirection: 'row' },
  reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  reviewDate: { fontSize: 11, color: COLORS.gray, marginTop: 10 },
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
  reviewBtnText: { color: COLORS.black, fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalSub: { fontSize: 14, color: COLORS.gray, marginTop: 5, marginBottom: 20 },
  reportInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, fontSize: 15, height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  reportSubmitBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10 },
  reportSubmitText: { color: 'white', fontWeight: 'bold' },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
  cancelText: { color: COLORS.gray, fontWeight: 'bold' },
  
  // Wallet Styles
  walletCard: { marginTop: 20, backgroundColor: '#ECFDF5', width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletTitle: { fontSize: 15, fontWeight: 'bold', color: '#064E3B' },
  walletSub: { fontSize: 11, color: '#047857', opacity: 0.8 },
  topupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  topupText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  walletBalance: { fontSize: 26, fontWeight: 'bold', color: '#064E3B' },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#064E3B', marginVertical: 15, paddingBottom: 5 },
  currencyPrefix: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginRight: 5 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', color: '#111827', padding: 0 },
  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, width: '100%' },
  quickAmountBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  quickAmountText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  walletSubmitBtn: { backgroundColor: '#064E3B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10, flexDirection: 'row', alignItems: 'center' },
  walletSubmitText: { color: 'white', fontWeight: 'bold' },
  
  // Trust Modal Styles
  trustModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  trustHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalCloseBtn: { padding: 4 },
  trustOverallContainer: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#DCFCE7' },
  trustOverallLabel: { fontSize: 12, color: '#166534', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  trustOverallValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  trustOverallValue: { fontSize: 28, fontWeight: 'bold', color: '#14532D' },
  trustOverallGrade: { fontSize: 16, fontWeight: 'bold', color: '#15803D' },
  trustBreakdownScroll: { maxHeight: 350 },
  abiSection: { marginBottom: 20 },
  abiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  abiName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  abiWeight: { fontSize: 12, color: COLORS.gray },
  abiScore: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  progressBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  abiDescription: { fontSize: 12, color: '#4B5563', lineHeight: 16 },
  trustInfoCard: { flexDirection: 'row', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'flex-start' },
  trustInfoText: { flex: 1, fontSize: 11, color: '#065F46', lineHeight: 16 },
  
  // Ledger Styles
  ledgerCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
  ledgerHeader: { flexDirection: 'row', alignItems: 'center' },
  ledgerIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ledgerMeta: { flex: 1 },
  ledgerTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  ledgerDate: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  ledgerAmount: { fontSize: 15, fontWeight: 'bold' },

  // Receipt Styles
  receiptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  receiptBtnText: { color: '#065F46', fontSize: 12, fontWeight: 'bold' },
  receiptPaper: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, width: '100%', maxWidth: 340, alignSelf: 'center' },
  receiptMerchant: { fontSize: 13, fontWeight: 'bold', color: '#374151', letterSpacing: 1, textAlign: 'center' },
  receiptMerchantSub: { fontSize: 10, color: COLORS.gray, marginTop: 2, textAlign: 'center' },
  receiptStampContainer: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  receiptStamp: { borderWidth: 2, borderColor: '#10B981', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-15deg' }] },
  receiptStampText: { color: '#10B981', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  receiptDashedLine: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1, marginVertical: 15, overflow: 'hidden' },
  receiptDetails: { marginVertical: 5 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptLabel: { fontSize: 12, color: COLORS.gray },
  receiptValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  receiptItems: { marginVertical: 5 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptItemName: { fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 },
  receiptItemPrice: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginLeft: 10 },
  receiptPricing: { marginVertical: 5 },
  receiptPriceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptPriceLabel: { fontSize: 12, color: COLORS.gray },
  receiptPriceVal: { fontSize: 12, color: '#374151' },
  receiptTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  receiptTotalVal: { fontSize: 16, fontWeight: 'bold', color: '#064E3B' },
  receiptFooter: { alignItems: 'center', marginTop: 5, marginBottom: 15 },
  receiptFooterCode: { fontSize: 9, color: COLORS.gray, letterSpacing: 2, marginTop: 2 },
  receiptEcoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 8, padding: 8, marginTop: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  receiptEcoText: { flex: 1, fontSize: 10, color: '#047857', lineHeight: 14, fontWeight: '500' },
  receiptCloseBtn: { backgroundColor: '#064E3B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', width: '100%', marginTop: 5 },
  receiptCloseBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
