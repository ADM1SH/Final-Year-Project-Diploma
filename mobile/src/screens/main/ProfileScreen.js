// ProfileScreen displays the user's or a public member's profile info, including transaction history,
// listings, active bundle deals, cash wallet ledger, trust score details, and verified reviews.
import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, RefreshControl, Linking } from 'react-native';
import AppImage from '../../components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import ItemCard from '../../components/ItemCard';
import { ReviewModal } from '../../components/ReviewModal';
import { EditProfileModal } from '../../components/EditProfileModal';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useProfileData } from '../../hooks/useProfileData';
import { SellerReportModal } from '../../components/modals/SellerReportModal';
import { BundleCreationModal } from '../../components/modals/BundleCreationModal';
import { TrustScoreModal } from '../../components/modals/TrustScoreModal';
import { ReceiptModal } from '../../components/modals/ReceiptModal';
import QRGeneratorModal from '../../components/modals/QRGeneratorModal';
import QRScannerModal from '../../components/modals/QRScannerModal';
import ProfileAnalytics from '../../components/ProfileAnalytics';
import styles from './styles/ProfileScreenStyles';

export const ProfileScreen = ({ navigation, route }) => {
  const { user: currentUser, logout } = useAuth();
  const { items, favorites, toggleFavorite, refreshMarket } = useMarket();
  const { colors, isDarkMode } = useTheme();

  const routeUserId = route.params?.userId;
  const isPublicProfile = !!routeUserId && routeUserId !== currentUser?.id;
  const targetUserId = routeUserId || currentUser?.id;

  const {
    profileData,
    userStats,
    transactions,
    loading,
    refreshing,
    activeTab, setActiveTab,
    stripeBalance,
    bundles,
    showBundleModal, setShowBundleModal,
    bundleName, setBundleName,
    bundlePrice, setBundlePrice,
    selectedBundleItems, setSelectedBundleItems,
    showReviewModal, setShowReviewModal,
    selectedTransaction, setSelectedTransaction,
    showTrustModal, setShowTrustModal,
    showReceiptModal, setShowReceiptModal,
    showReportModal, setShowReportModal,
    reportReason, setReportReason,
    reporting,
    pastReviews,
    showEditModal, setShowEditModal,
    onRefresh,
    handleOpenEditModal,
    handleSaveProfile,
    handleCompleteSale,
    handleReportSeller,
    handleItemLongPress,
    confirmMarkAsSold,
    handleRequestVerification,
    fetchProfileData,
    handleCreateBundle,
    handleDeleteBundle,
    handleBuyBundle,
  } = useProfileData(targetUserId, isPublicProfile, currentUser, refreshMarket, navigation);

  const favoritesSet = React.useMemo(() => new Set(favorites), [favorites]);

  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  const handleStripeOnboard = async () => {
    try {
      setIsStripeLoading(true);
      const res = await api.post('profiles/me/stripe_onboard/');
      if (res.data.url) {
        await Linking.openURL(res.data.url);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not setup Stripe payouts.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  const isTransactionTab = activeTab === 'My Offers' || activeTab === 'Sales';
  const isSingleColumn = isTransactionTab || activeTab === 'Reviews';

  // Sort control for the Sales tab (the seller's own "sold/selling" list).
  // 'newest'/'oldest' order by transaction date; 'price_high'/'price_low' by
  // final sale price — mirrors the sort chips already used on the Home feed.
  const [salesSortBy, setSalesSortBy] = useState('newest');
  const SALES_SORT_OPTIONS = [
      { key: 'newest', label: 'Newest' },
      { key: 'oldest', label: 'Oldest' },
      { key: 'price_high', label: 'Price: High-Low' },
      { key: 'price_low', label: 'Price: Low-High' },
  ];

    // Filter and compute the subset of items/transactions to display based on the active UI sub-tab
    const displayItems = useMemo(() => {
        if (activeTab === 'Reviews') return pastReviews;
        if (isTransactionTab) {
            const filtered = transactions.filter(t => (activeTab === 'Sales' ? t.seller_name === currentUser?.username : t.buyer_name === currentUser?.username));
            if (activeTab !== 'Sales') return filtered;

            const sorted = [...filtered];
            sorted.sort((a, b) => {
                if (salesSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                if (salesSortBy === 'price_high') return parseFloat(b.final_price || 0) - parseFloat(a.final_price || 0);
                if (salesSortBy === 'price_low') return parseFloat(a.final_price || 0) - parseFloat(b.final_price || 0);
                return new Date(b.created_at) - new Date(a.created_at); // newest first (default)
            });
            return sorted;
        }

        if (!profileData?.username && !currentUser?.username) return [];
        const username = profileData?.username || currentUser?.username;

        if (activeTab === 'Listings') {
            return items.filter(item => {
                const sellerName = item.seller?.username || item.seller_name;
                return (sellerName?.toLowerCase() === username.toLowerCase()) && !item.is_sold;
            });
        } else if (activeTab === 'Favorites') {
            return items.filter(item => favoritesSet.has(item.id));
        }
        return [];
    }, [items, favoritesSet, transactions, pastReviews, activeTab, profileData, currentUser, salesSortBy]);

  const displayUsername = profileData?.username || (isPublicProfile ? 'User' : currentUser?.username);

  const pendingSalesCount = transactions.filter(t => t.seller_name === currentUser?.username && t.status === 'PENDING').length;
  const pendingOffersCount = transactions.filter(t => t.buyer_name === currentUser?.username && t.status === 'PENDING').length;


  const renderReviewItem = useCallback(({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
      <View style={styles.reviewHeader}>
        <Text style={[styles.reviewerName, { color: colors.black }]}>{item.reviewer_name}</Text>
        <View style={styles.ratingRow}>
          {[1,2,3,4,5].map(s => (
            <Ionicons key={s} name="star" size={14} color={s <= item.rating ? "#FBBF24" : colors.lightGray} />
          ))}
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: colors.black, opacity: 0.8 }]}>{item.comment}</Text>
      <Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  ), [colors]);

  const renderHeader = () => (
    <View style={{ backgroundColor: colors.background }}>
      <LinearGradient
        colors={[isDarkMode ? '#0d1f14' : COLORS.primary, isDarkMode ? '#060e0a' : '#00421e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.topActions}>
          {isPublicProfile ? (
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.primary}/>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconCircle} onPress={handleOpenEditModal}>
              <Ionicons name="create-outline" size={20} color={colors.primary}/>
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />

          {!isPublicProfile && (
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('PriceAlerts')}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary}/>
            </TouchableOpacity>
          )}

          {isPublicProfile && (
             <TouchableOpacity
             style={[styles.iconCircle, { backgroundColor: COLORS.danger + '15' }]}
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
              {profileData?.profile_picture ? (
                <AppImage source={{ uri: profileData.profile_picture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{displayUsername?.[0]?.toUpperCase() || '?'}</Text>
              )}
            </View>
            {profileData?.is_verified && (
              <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={20} color="#10B981"/></View>
            )}
          </View>
          <Text style={styles.userName}>{displayUsername}</Text>
          {profileData?.response_time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'center' }}>
              <Ionicons name="time-outline" size={12} color="#A7F3D0" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: '#A7F3D0', fontWeight: 'bold' }}>{profileData.response_time}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.trustBadge} onPress={() => setShowTrustModal(true)}>
            <Text style={styles.trustText}>ABI Trust Score: {userStats?.trust_score || profileData?.trust_score || 0}%</Text>
            <Ionicons name="information-circle-outline" size={14} color="#A7F3D0" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {!profileData?.is_verified && !isPublicProfile && (
            <TouchableOpacity style={styles.requestVerifyBtn} onPress={handleRequestVerification}>
              <Ionicons name="shield-checkmark-outline" size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.requestVerifyBtnText}>Request Verification</Text>
            </TouchableOpacity>
          )}

          {!isPublicProfile && (
            <TouchableOpacity 
              style={[styles.requestVerifyBtn, { backgroundColor: profileData?.stripe_account_id ? '#306A43' : '#6366f1', marginTop: 8 }]} 
              onPress={profileData?.stripe_account_id ? null : handleStripeOnboard}
              disabled={isStripeLoading || !!profileData?.stripe_account_id}
            >
              <Ionicons name={profileData?.stripe_account_id ? "checkmark-circle-outline" : "card-outline"} size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.requestVerifyBtnText}>
                {isStripeLoading ? 'Loading...' : (profileData?.stripe_account_id ? 'Payouts Active' : 'Setup Stripe Payouts')}
              </Text>
            </TouchableOpacity>
          )}

          {}
          {profileData?.bio ? (
            <Text style={styles.bioText}>{profileData.bio}</Text>
          ) : (
            !isPublicProfile && <Text style={styles.bioPlaceholderText}>No biography set. Tap the Edit icon above to add one!</Text>
          )}

          {}
          {(profileData?.location || profileData?.phone_number) ? (
            <View style={styles.infoRowInline}>
              {profileData?.location ? (
                <View style={styles.infoBadgeInline}>
                  <Ionicons name="location-outline" size={12} color="#A7F3D0" style={{ marginRight: 4 }} />
                  <Text style={styles.infoBadgeTextInline}>{profileData.location}</Text>
                </View>
              ) : null}
              {profileData?.phone_number ? (
                <View style={[styles.infoBadgeInline, profileData?.location && { marginLeft: 10 }]}>
                  <Ionicons name="call-outline" size={12} color="#A7F3D0" style={{ marginRight: 4 }} />
                  <Text style={styles.infoBadgeTextInline}>{profileData.phone_number}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.mainContentContainer}>
        {!isPublicProfile && (
          <View style={[styles.stripeBalanceCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
            <View style={styles.stripeBalanceHeader}>
              <Ionicons name="card" size={24} color="#6366f1" />
              <Text style={[styles.stripeBalanceTitle, { color: colors.black }]}>Seller Balance</Text>
            </View>
            <View style={styles.stripeBalanceAmounts}>
              <View style={styles.stripeBalanceColumn}>
                <Text style={styles.stripeBalanceLabel}>Available to Payout</Text>
                <Text style={[styles.stripeBalanceValue, { color: colors.primary }]}>
                  RM {(stripeBalance?.available || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.stripeBalanceDivider} />
              <View style={styles.stripeBalanceColumn}>
                <Text style={styles.stripeBalanceLabel}>Pending</Text>
                <Text style={[styles.stripeBalanceValue, { color: colors.gray }]}>
                  RM {(stripeBalance?.pending || 0).toFixed(2)}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.stripeDashboardBtn, { backgroundColor: '#6366f1' }]} 
              onPress={handleStripeOnboard}
              disabled={isStripeLoading}
            >
              <Text style={styles.stripeDashboardText}>
                {isStripeLoading ? 'Loading...' : (profileData?.stripe_account_id ? 'View Stripe Dashboard' : 'Setup Payouts')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.black }]}>{userStats?.live_listings || '0'}</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Listings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.black }]}>{userStats?.items_sold || '0'}</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Sold</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.black }]}>{userStats?.avg_rating?.toFixed(1) || '0.0'}</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Rating</Text>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabs}>
              {([
                'Listings',
                'Reviews',
                !isPublicProfile ? 'Sales' : null,
                !isPublicProfile ? 'My Offers' : null,
                !isPublicProfile ? 'Favorites' : null
              ].filter(Boolean)).map(tab => {
                let badge = 0;
                if (tab === 'Sales') badge = pendingSalesCount;
                if (tab === 'My Offers') badge = pendingOffersCount;

                return (
                  <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                    <View style={styles.tabContent}>
                      <Text style={[styles.tab, activeTab === tab ? { color: colors.primary } : { color: colors.gray }]}>{tab}</Text>
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

        {activeTab === 'Listings' && !isPublicProfile && (
          <TouchableOpacity
            style={[styles.createBundleBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowBundleModal(true)}
          >
            <Ionicons name="gift-outline" size={16} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.createBundleBtnText}>Create Bundle Deal</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'Listings' && bundles.length > 0 && (
          <View style={styles.bundlesSection}>
            <Text style={[styles.bundlesTitle, { color: colors.black }]}>🎁 Bundle Deals ({bundles.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bundlesScroll}>
              {bundles.map(bundle => (
                <View key={bundle.id} style={[styles.bundleCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
                  <Text style={[styles.bundleName, { color: colors.black }]} numberOfLines={1}>{bundle.name}</Text>
                  <Text style={styles.bundlePrice}>RM {parseFloat(bundle.price).toFixed(2)}</Text>
                  <Text style={[styles.bundleMeta, { color: colors.gray }]}>{bundle.item_details?.length || 0} items grouped</Text>
                  <View style={styles.bundleImagesRow}>
                    {bundle.item_details?.map(item => (
                      <AppImage
                        key={item.id}
                        source={{ uri: item.display_image }}
                        style={styles.bundleMiniImage}
                      />
                    ))}
                  </View>
                  {!isPublicProfile ? (
                    <TouchableOpacity
                      style={styles.deleteBundleBtn}
                      onPress={() => handleDeleteBundle(bundle.id)}
                    >
                      <Text style={styles.deleteBundleText}>Delete Deal</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.buyBundleBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleBuyBundle(bundle)}
                    >
                      <Text style={styles.buyBundleText}>Buy Bundle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {activeTab === 'Reviews' && (
          <View style={styles.reviewsSummaryBanner}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryAvgRating}>
                {userStats?.avg_rating?.toFixed(1) || '0.0'}
              </Text>
              <View style={styles.summaryStarsRow}>
                {[1, 2, 3, 4, 5].map(s => {
                  const rating = userStats?.avg_rating || 0;
                  let iconName = 'star';
                  if (s > Math.ceil(rating)) {
                    iconName = 'star-outline';
                  } else if (s > rating && s - rating >= 0.5) {
                    iconName = 'star-half';
                  }
                  return <Ionicons key={s} name={iconName} size={16} color="#FBBF24" style={{ marginRight: 2 }} />;
                })}
              </View>
              <Text style={styles.summaryTotalCount}>
                {pastReviews.length} Verified {pastReviews.length === 1 ? 'Review' : 'Reviews'}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              {[5, 4, 3, 2, 1].map(stars => {
                  // Compute ratio and occurrences of each specific star count rating to populate graphs
                  const count = pastReviews.filter(r => Math.round(r.rating) === stars).length;
                  const pct = pastReviews.length > 0 ? (count / pastReviews.length) * 100 : 0;
                return (
                  <View key={stars} style={styles.breakdownRow}>
                    <Text style={styles.breakdownStarsText}>{stars}★</Text>
                    <View style={styles.breakdownProgressTrack}>
                      <View style={[styles.breakdownProgressFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.breakdownCountText}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderTransactionItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.transactionCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
      onPress={() => {
        const targetId = item.item_id || item.item;
        navigation.navigate('ItemDetail', { itemId: targetId });
      }}
    >
      <View style={styles.transactionHeader}>
        <AppImage
          source={{ uri: item.item_display_image || 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop' }}
          style={styles.transactionImage}
        />
        <View style={styles.transactionMeta}>
          <Text style={[styles.transactionTitle, { color: colors.black }]} numberOfLines={1}>{item.item_name}</Text>
          <Text style={styles.transactionSeller}>
            {activeTab === 'Sales' ? `Buyer: ${item.buyer_name}` : `Seller: ${item.seller_name}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (item.status === 'COMPLETED' || item.status === 'PAID') ? '#D1FAE5' : (item.status === 'CANCELLED' ? '#FEE2E2' : '#FEF3C7') }]}>
          <Text style={[styles.statusText, { color: (item.status === 'COMPLETED' || item.status === 'PAID') ? '#065F46' : (item.status === 'CANCELLED' ? '#B91C1C' : '#92400E') }]}>
            {item.status === 'COMPLETED' ? 'COMPLETED' : (item.status === 'PAID' ? 'PAID (ESCROW)' : (item.status === 'CANCELLED' ? 'DECLINED' : 'PENDING'))}
          </Text>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <View>
          <Text style={[styles.transactionPrice, { color: colors.primary }]}>RM {parseFloat(item.final_price || 0).toFixed(2)}</Text>
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

          {activeTab === 'My Offers' && item.status === 'PAID' && (
            <TouchableOpacity
              style={[styles.completeBtn, { marginLeft: 8, backgroundColor: '#10B981' }]}
              onPress={() => {
                Alert.alert(
                  "Confirm Receipt",
                  "Are you sure you received the item? This will release funds to the seller.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", onPress: () => handleCompleteSale(item.id) }
                  ]
                );
              }}
            >
              <Ionicons name="checkmark-done" size={16} color={COLORS.white} style={{ marginRight: 5 }} />
              <Text style={styles.completeBtnText}>Confirm Receipt</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'My Offers' && item.status === 'COMPLETED' && (
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
  ), [activeTab, colors, handleCompleteSale, navigation, setSelectedTransaction, setShowQRGenerator, setShowQRScanner, setShowReceiptModal, setShowReviewModal]);

  const renderListingItem = useCallback(({ item }) => (
    <ItemCard
      item={item}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      onLongPress={() => handleItemLongPress(item)}
      isFavorite={favorites?.includes(item.id)}
      onToggleFavorite={() => toggleFavorite(item.id)}
      // Only the owner's own Listings tab gets the one-tap Sold button —
      // reuses the same confirm dialog the long-press menu already used.
      onMarkSold={activeTab === 'Listings' && !isPublicProfile ? confirmMarkAsSold : undefined}
    />
  ), [favorites, handleItemLongPress, navigation, toggleFavorite, activeTab, isPublicProfile, confirmMarkAsSold]);

  const renderListHeader = () => (
    <>
      {renderHeader()}
      {activeTab === 'Sales' && !isPublicProfile && (
        <>
          <ProfileAnalytics transactions={transactions.filter(t => t.seller_name === currentUser?.username)} />
          <View style={styles.sortContainer}>
            <Text style={[styles.sortTitle, { color: colors.gray }]}>Sort:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortList}>
              {SALES_SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortChip, salesSortBy === opt.key && styles.activeSortChip]}
                  onPress={() => setSalesSortBy(opt.key)}
                >
                  <Text style={[styles.sortChipText, salesSortBy === opt.key && styles.activeSortChipText]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </>
  );

  if (loading && !profileData) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={displayItems}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        renderItem={
          activeTab === 'Reviews'
            ? renderReviewItem
            : (isTransactionTab
                ? renderTransactionItem
                : renderListingItem
              )
        }
        keyExtractor={item => (isTransactionTab || activeTab === 'Reviews' ? `t-${item.id}` : `i-${item.id}`)}
        numColumns={isSingleColumn ? 1 : 2}
        key={isSingleColumn ? 'list' : 'grid'}
        columnWrapperStyle={isSingleColumn ? null : styles.columnWrapper}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items found.</Text>
          </View>
        }
      />

      {/* Report Modal */}
      <SellerReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportReason={reportReason}
        setReportReason={setReportReason}
        onSubmit={handleReportSeller}
        reporting={reporting}
        username={profileData?.username}
      />

      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        transaction={selectedTransaction}
        onSuccess={fetchProfileData}
      />

      <BundleCreationModal
        visible={showBundleModal}
        onClose={() => setShowBundleModal(false)}
        bundleName={bundleName}
        setBundleName={setBundleName}
        bundlePrice={bundlePrice}
        setBundlePrice={setBundlePrice}
        items={items}
        currentUser={currentUser}
        selectedBundleItems={selectedBundleItems}
        setSelectedBundleItems={setSelectedBundleItems}
        onCreate={handleCreateBundle}
      />

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleSaveProfile}
        initialLocation={profileData?.location}
        initialPhone={profileData?.phone_number}
        initialBio={profileData?.bio}
      />

      {/* ABI Trust Score Breakdown Modal */}
      <TrustScoreModal
        visible={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        userStats={userStats}
        profileData={profileData}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        selectedReceipt={selectedTransaction}
      />

      <QRGeneratorModal
        visible={showQRGenerator}
        onClose={() => setShowQRGenerator(false)}
        transaction={selectedTransaction}
      />

      <QRScannerModal
        visible={showQRScanner}
        transaction={selectedTransaction}
        onScanSuccess={async (scannedTransactionId) => {
          setShowQRScanner(false);
          await handleCompleteSale(scannedTransactionId);
        }}
      />

    </View>
  );
};
