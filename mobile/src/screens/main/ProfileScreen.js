/**
 * File: ProfileScreen.js
 * Description: User profile screen displaying seller stats, ABI trust score,
 *              active listings, transaction history, wallet, bundles, and verification.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, RefreshControl, Modal, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import ItemCard from '../../components/ItemCard';
import { ReviewModal } from '../../components/ReviewModal';
import { WalletModal } from '../../components/WalletModal';
import { EditProfileModal } from '../../components/EditProfileModal';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

export const ProfileScreen = ({ navigation, route }) => {
  const { user: currentUser, logout } = useAuth();
  const { items, favorites, toggleFavorite, refreshMarket } = useMarket();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
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
  const [bundles, setBundles] = useState([]);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [selectedBundleItems, setSelectedBundleItems] = useState([]);
  const promptedReviews = useRef(new Set());

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

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);

  const handleOpenEditModal = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async (location, phone, bio, profilePicture) => {
    try {
      const data = new FormData();
      data.append('bio', bio);
      data.append('location', location);
      data.append('phone_number', phone);

      if (profilePicture) {
        const cleanUri = Platform.OS === 'ios' ? profilePicture.replace('file://', '') : profilePicture;
        data.append('profile_picture', {
          uri: Platform.OS === 'android' && !cleanUri.startsWith('file://') ? `file://${cleanUri}` : cleanUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await api.patch('profiles/me/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setProfileData(res.data);
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
      fetchProfileData();
    } catch (e) {
      console.error('Save Profile Error:', e.message);
      Alert.alert("Error", "Could not update profile. Please try again.");
    }
  };

  const handleTopUp = async (amount, onSuccessCallback) => {
    const amountNum = parseFloat(amount);
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
        if (onSuccessCallback) onSuccessCallback();
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

  const handleItemLongPress = (item) => {
    if (isPublicProfile) return; // Can't manage other user's listings

    Alert.alert(
      "Manage Listing",
      `Choose an option for "${item.name}":`,
      [
        { text: "Cancel", style: "cancel" },
        !item.is_sold ? {
          text: "Edit Listing",
          onPress: () => navigation.navigate('Sell', { item })
        } : null,
        !item.is_sold ? {
          text: "Mark as Sold",
          onPress: () => confirmMarkAsSold(item.id)
        } : null,
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: () => confirmDeleteListing(item.id)
        }
      ].filter(Boolean)
    );
  };

  const confirmMarkAsSold = (itemId) => {
    Alert.alert(
      "Mark as Sold",
      "Are you sure you want to mark this item as sold? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Mark as Sold", 
          onPress: async () => {
            try {
              await api.patch(`items/${itemId}/`, { is_sold: true });
              Alert.alert("Success", "Listing marked as sold.");
              refreshMarket();
              fetchProfileData();
            } catch (err) {
              Alert.alert("Error", "Could not update listing.");
            }
          }
        }
      ]
    );
  };

  const confirmDeleteListing = (itemId) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`items/${itemId}/`);
              Alert.alert("Success", "Listing deleted.");
              refreshMarket();
              fetchProfileData();
            } catch (err) {
              Alert.alert("Error", "Could not delete listing.");
            }
          }
        }
      ]
    );
  };

  const handleRequestVerification = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need camera roll permissions to upload your document!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const docUri = result.assets[0].uri;
        const data = new FormData();
        const cleanUri = Platform.OS === 'ios' ? docUri.replace('file://', '') : docUri;
        data.append('verification_document', {
          uri: Platform.OS === 'android' && !cleanUri.startsWith('file://') ? `file://${cleanUri}` : cleanUri,
          name: 'verification_doc.jpg',
          type: 'image/jpeg',
        });

        Alert.alert("Uploading", "Uploading verification document...");
        await api.post('profiles/me/request_verification/', data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert("Request Submitted", "Your request for profile verification has been submitted successfully!");
      }
    } catch (e) {
      console.error("Verification Request Error:", e.message);
      Alert.alert("Error", "Could not submit verification request. Please try again.");
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const profileUrl = isPublicProfile ? `profiles/${targetUserId}/` : `profiles/me/`;
      const statsUrl = isPublicProfile ? `profiles/${targetUserId}/user_stats/` : `profiles/me/user_stats/`;

      const [profileRes, statsRes, transRes, reviewRes, walletRes, bundlesRes] = await Promise.all([
        api.get(profileUrl),
        api.get(statsUrl),
        isPublicProfile ? Promise.resolve({ data: [] }) : api.get('transactions/'),
        api.get(`reviews/?seller=${targetUserId}`),
        isPublicProfile ? Promise.resolve({ data: [] }) : api.get('profiles/me/wallet_history/'),
        api.get(`bundles/?seller_id=${targetUserId}`)
      ]);
      setProfileData(profileRes.data);
      setUserStats(statsRes.data);
      setTransactions(transRes.data.results || transRes.data);
      setPastReviews(reviewRes.data.results || reviewRes.data);
      setWalletHistory(walletRes.data || []);
      setBundles(bundlesRes.data || []);

      // Auto review prompt after purchase logic
      if (!isPublicProfile && currentUser) {
        const transList = transRes.data.results || transRes.data || [];
        const completedUnprompted = transList.find(t => 
          t.buyer_name?.toLowerCase() === currentUser.username?.toLowerCase() && 
          t.status === 'COMPLETED' && 
          !promptedReviews.current.has(t.id)
        );
        if (completedUnprompted) {
          promptedReviews.current.add(completedUnprompted.id);
          Alert.alert(
            "Transaction Completed!",
            `Would you like to write a review for ${completedUnprompted.seller_name}?`,
            [
              { text: "No", style: "cancel" },
              { 
                text: "Write Review", 
                onPress: () => {
                  setSelectedTransaction(completedUnprompted);
                  setShowReviewModal(true);
                } 
              }
            ]
          );
        }
      }
    } catch (err) {
      console.error('Fetch Profile Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBundle = async () => {
    if (!bundleName.trim() || !bundlePrice.trim() || selectedBundleItems.length < 2) {
      Alert.alert("Invalid Input", "Please provide a name, price, and select at least 2 items.");
      return;
    }
    try {
      setLoading(true);
      await api.post('bundles/', {
        name: bundleName,
        price: parseFloat(bundlePrice),
        items: selectedBundleItems
      });
      Alert.alert("Success", "Bundle Deal created successfully!");
      setShowBundleModal(false);
      setBundleName('');
      setBundlePrice('');
      setSelectedBundleItems([]);
      fetchProfileData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not create bundle deal.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBundle = async (bundleId) => {
    Alert.alert(
      "Delete Bundle Deal",
      "Are you sure you want to delete this bundle deal? The individual items will remain listed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`bundles/${bundleId}/`);
              Alert.alert("Success", "Bundle Deal deleted.");
              fetchProfileData();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Could not delete bundle deal.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBuyBundle = async (bundle) => {
    Alert.alert(
      "Confirm Purchase",
      `Would you like to buy the bundle "${bundle.name}" for RM ${parseFloat(bundle.price).toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Buy Now", 
          onPress: async () => {
            try {
              setLoading(true);
              const pricePerItem = (parseFloat(bundle.price) / bundle.items.length).toFixed(2);
              for (const itemId of bundle.items) {
                await api.post('transactions/', {
                  item: itemId,
                  offer_price: parseFloat(pricePerItem),
                  payment_method: 'WALLET' // default wallet for quick demo
                });
              }
              Alert.alert("Success", "Bundle Deal purchased! Offers sent to the seller.");
              fetchProfileData();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.response?.data?.error || "Could not complete bundle purchase. Check your wallet balance.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleSelectBundleItem = (itemId) => {
    if (selectedBundleItems.includes(itemId)) {
      setSelectedBundleItems(prev => prev.filter(id => id !== itemId));
    } else {
      setSelectedBundleItems(prev => [...prev, itemId]);
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
    } else if (activeTab === 'My Offers') {
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
  const pendingOffersCount = transactions.filter(t => t.buyer_name === currentUser?.username && t.status === 'PENDING').length;

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
      <View style={[styles.ledgerCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
        <View style={styles.ledgerHeader}>
          <View style={[styles.ledgerIconContainer, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={icon} size={20} color={typeColor} />
          </View>
          <View style={styles.ledgerMeta}>
            <Text style={[styles.ledgerTitle, { color: colors.black }]}>{item.description}</Text>
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
  );

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
            <TouchableOpacity style={styles.iconCircle} onPress={toggleTheme}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : colors.primary}/>
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
                <Image source={{ uri: profileData.profile_picture }} style={styles.avatarImage} />
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

          {/* Bio Section */}
          {profileData?.bio ? (
            <Text style={styles.bioText}>{profileData.bio}</Text>
          ) : (
            !isPublicProfile && <Text style={styles.bioPlaceholderText}>No biography set. Tap the Edit icon above to add one!</Text>
          )}

          {/* Location & Contact Info */}
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

        {/* Wallet Section for Own Profile */}
        {!isPublicProfile && (
          <View style={[styles.walletCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
            <View style={styles.walletHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="wallet-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.walletTitle, { color: colors.primary }]}>MyPreLove Cash Wallet</Text>
                  <Text style={[styles.walletSub, { color: colors.gray }]} numberOfLines={1}>Use for seamless in-app local purchases</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.topupBtn} onPress={() => setShowWalletModal(true)}>
                <Ionicons name="add-circle-outline" size={14} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.topupText}>Top Up</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.walletBalance, { color: colors.primary }]}>
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
                !isPublicProfile ? 'My Offers' : null, 
                !isPublicProfile ? 'Favorites' : null,
                !isPublicProfile ? 'Wallet History' : null
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
                      <Image 
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

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.transactionCard, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
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
          <Text style={[styles.transactionTitle, { color: colors.black }]} numberOfLines={1}>{item.item_name}</Text>
          <Text style={styles.transactionSeller}>
            {activeTab === 'Sales' ? `Buyer: ${item.buyer_name}` : `Seller: ${item.seller_name}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#D1FAE5' : (item.status === 'CANCELLED' ? '#FEE2E2' : '#FEF3C7') }]}>
          <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#065F46' : (item.status === 'CANCELLED' ? '#B91C1C' : '#92400E') }]}>
            {item.status === 'COMPLETED' ? 'ACCEPTED' : (item.status === 'CANCELLED' ? 'DECLINED' : 'PENDING')}
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

          {activeTab === 'Sales' && item.status === 'PENDING' && (
            <TouchableOpacity 
              style={[styles.completeBtn, { marginLeft: 8 }]}
              onPress={() => handleCompleteSale(item.id)}
            >
              <Text style={styles.completeBtnText}>Complete Sale</Text>
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
  );

  const isTransactionTab = activeTab === 'My Offers' || activeTab === 'Sales';
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
                          onLongPress={() => handleItemLongPress(item)}
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

      <Modal visible={showBundleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bundleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Bundle Deal</Text>
              <TouchableOpacity onPress={() => setShowBundleModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bundleFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Bundle Name</Text>
              <TextInput 
                style={styles.bundleInput}
                placeholder="e.g. Eco Summer Outfit Pack"
                value={bundleName}
                onChangeText={setBundleName}
              />

              <Text style={styles.inputLabel}>Discounted Bundle Price (RM)</Text>
              <TextInput 
                style={styles.bundleInput}
                placeholder="e.g. 80.00"
                keyboardType="decimal-pad"
                value={bundlePrice}
                onChangeText={setBundlePrice}
              />

              <Text style={styles.inputLabel}>Select Items to Include (Select at least 2)</Text>
              {(() => {
                const myUnsoldItems = items.filter(item => {
                  const sellerId = item.seller?.id || item.seller;
                  return sellerId === currentUser?.id && !item.is_sold;
                });

                if (myUnsoldItems.length === 0) {
                  return <Text style={styles.noItemsText}>You have no unsold listings to bundle.</Text>;
                }

                return myUnsoldItems.map(item => {
                  const isSelected = selectedBundleItems.includes(item.id);
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.bundleItemSelect, isSelected && styles.bundleItemSelectActive]}
                      onPress={() => toggleSelectBundleItem(item.id)}
                    >
                      <Image source={{ uri: item.display_image }} style={styles.bundleItemThumbnail} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.bundleItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.bundleItemPrice}>RM {parseFloat(item.price).toFixed(2)}</Text>
                      </View>
                      <Ionicons 
                        name={isSelected ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={isSelected ? COLORS.primary : COLORS.gray} 
                      />
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.createBundleSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateBundle}
            >
              <Text style={styles.createBundleSubmitText}>Create Bundle Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WalletModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSubmit={handleTopUp}
        submitting={submittingWallet}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  gradientHeader: { padding: 20, paddingTop: 60, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  mainContentContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  topActions: { 
    width: '100%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10,
    zIndex: 10
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', justifyContent: 'center', alignItems: 'center', marginLeft: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  profileSection: { alignItems: 'center', width: '100%', marginTop: 10 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.2)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50, resizeMode: 'cover' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: 12, elevation: 4 },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  trustBadge: { marginTop: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  trustText: { fontSize: 13, color: '#A7F3D0', fontWeight: 'bold' },
  chatActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, marginTop: 10 },
  chatActionText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 25 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  impactCard: { marginTop: 30, backgroundColor: COLORS.primary, width: '100%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  impactContent: { flexDirection: 'row', alignItems: 'center' },
  impactTextContainer: { marginLeft: 15 },
  impactValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  impactSub: { fontSize: 12, color: COLORS.white, opacity: 0.8, marginTop: 2 },
  tabSection: { width: '100%', marginTop: 25 },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  tabs: { flexDirection: 'row', paddingBottom: 10 },
  tabItem: { marginRight: 25 },
  tabContent: { flexDirection: 'row', alignItems: 'center' },
  tab: { fontSize: 15, color: COLORS.gray, fontWeight: 'bold' },
  activeTab: { color: COLORS.primary },
  tabBadge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 30 },
  emptyText: { color: COLORS.gray },
  reviewCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontWeight: 'bold', fontSize: 15, color: COLORS.black },
  ratingRow: { flexDirection: 'row' },
  reviewComment: { fontSize: 14, color: COLORS.black, opacity: 0.8, lineHeight: 20 },
  reviewDate: { fontSize: 11, color: COLORS.gray, marginTop: 10 },
  transactionCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  transactionMeta: { flex: 1, marginLeft: 12 },
  transactionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  transactionSeller: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  transactionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 12 },
  transactionPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  transactionDate: { fontSize: 12, color: COLORS.gray },
  transactionImage: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  completeBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  completeBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  reviewBtn: { backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  reviewBtnText: { color: COLORS.black, fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
  modalSub: { fontSize: 14, color: COLORS.gray, marginTop: 5, marginBottom: 20 },
  reportInput: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 15, fontSize: 15, height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  reportSubmitBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10 },
  reportSubmitText: { color: 'white', fontWeight: 'bold' },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
  cancelText: { color: COLORS.gray, fontWeight: 'bold' },
  
  // Wallet Styles
  walletCard: { marginTop: 20, backgroundColor: COLORS.white, width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.lightGray, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  walletSub: { fontSize: 11, color: COLORS.gray, opacity: 0.8 },
  topupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24 },
  topupText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  walletBalance: { fontSize: 26, fontWeight: 'bold', color: COLORS.primary },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginVertical: 15, paddingBottom: 5 },
  currencyPrefix: { fontSize: 20, fontWeight: 'bold', color: COLORS.black, marginRight: 5 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', color: COLORS.black, padding: 0 },
  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, width: '100%' },
  quickAmountBtn: { backgroundColor: COLORS.lightGray, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  quickAmountText: { fontSize: 12, fontWeight: 'bold', color: COLORS.black },
  walletSubmitBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10, flexDirection: 'row', alignItems: 'center' },
  walletSubmitText: { color: 'white', fontWeight: 'bold' },
  
  // Trust Modal Styles
  trustModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  trustHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalCloseBtn: { padding: 4 },
  trustOverallContainer: { backgroundColor: COLORS.eco, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: COLORS.lightGray },
  trustOverallLabel: { fontSize: 12, color: COLORS.success, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  trustOverallValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  trustOverallValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  trustOverallGrade: { fontSize: 16, fontWeight: 'bold', color: COLORS.success },
  trustBreakdownScroll: { maxHeight: 350 },
  abiSection: { marginBottom: 20 },
  abiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  abiName: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  abiWeight: { fontSize: 12, color: COLORS.gray },
  abiScore: { fontSize: 15, fontWeight: 'bold', color: COLORS.black },
  progressBarTrack: { height: 8, backgroundColor: COLORS.lightGray, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  abiDescription: { fontSize: 12, color: COLORS.gray, lineHeight: 16 },
  trustInfoCard: { flexDirection: 'row', backgroundColor: COLORS.eco, borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.lightGray, alignItems: 'flex-start' },
  trustInfoText: { flex: 1, fontSize: 11, color: COLORS.success, lineHeight: 16 },
  
  // Ledger Styles
  ledgerCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  ledgerHeader: { flexDirection: 'row', alignItems: 'center' },
  ledgerIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ledgerMeta: { flex: 1 },
  ledgerTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.black },
  ledgerDate: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  ledgerAmount: { fontSize: 15, fontWeight: 'bold' },
 
  // Receipt Styles
  receiptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.eco, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: COLORS.lightGray },
  receiptBtnText: { color: COLORS.success, fontSize: 12, fontWeight: 'bold' },
  receiptPaper: { backgroundColor: COLORS.white, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, width: '100%', maxWidth: 340, alignSelf: 'center' },
  receiptMerchant: { fontSize: 13, fontWeight: 'bold', color: COLORS.black, letterSpacing: 1, textAlign: 'center' },
  receiptMerchantSub: { fontSize: 10, color: COLORS.gray, marginTop: 2, textAlign: 'center' },
  receiptStampContainer: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  receiptStamp: { borderWidth: 2, borderColor: COLORS.success, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-15deg' }] },
  receiptStampText: { color: COLORS.success, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  receiptDashedLine: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 1, marginVertical: 15, overflow: 'hidden' },
  receiptDetails: { marginVertical: 5 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptLabel: { fontSize: 12, color: COLORS.gray },
  receiptValue: { fontSize: 12, fontWeight: '600', color: COLORS.black },
  receiptItems: { marginVertical: 5 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptItemName: { fontSize: 14, fontWeight: 'bold', color: COLORS.black, flex: 1 },
  receiptItemPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.black, marginLeft: 10 },
  receiptPricing: { marginVertical: 5 },
  receiptPriceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptPriceLabel: { fontSize: 12, color: COLORS.gray },
  receiptPriceVal: { fontSize: 12, color: COLORS.black, opacity: 0.8 },
  receiptTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.black },
  receiptTotalVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  receiptFooter: { alignItems: 'center', marginTop: 5, marginBottom: 15 },
  receiptFooterCode: { fontSize: 9, color: COLORS.gray, letterSpacing: 2, marginTop: 2 },
  receiptEcoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.eco, borderRadius: 8, padding: 8, marginTop: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  receiptEcoText: { flex: 1, fontSize: 10, color: COLORS.success, lineHeight: 14, fontWeight: '500' },
  receiptCloseBtn: { backgroundColor: COLORS.primary, borderRadius: 24, paddingVertical: 12, alignItems: 'center', width: '100%', marginTop: 5 },
  receiptCloseBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  // Edit Profile Styles
  bioText: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 30, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular', lineHeight: 20 },
  bioPlaceholderText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, textAlign: 'center', marginTop: 10, paddingHorizontal: 30, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular', fontStyle: 'italic' },
  infoRowInline: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, width: '100%', flexWrap: 'wrap' },
  infoBadgeInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 5 },
  infoBadgeTextInline: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-SemiBold' },
  fieldLabel: { fontSize: 13, color: COLORS.gray, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  singleLineInput: { backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, color: COLORS.black, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular' },
  bioInput: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 15, fontSize: 15, color: COLORS.black, height: 80, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular' },

  // Reviews Summary Banner Styles
  reviewsSummaryBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  summaryLeft: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.lightGray,
    paddingRight: 10,
  },
  summaryAvgRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryStarsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  summaryTotalCount: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },
  summaryRight: {
    flex: 0.55,
    paddingLeft: 15,
    justifyContent: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownStarsText: {
    fontSize: 10,
    color: COLORS.gray,
    width: 18,
    textAlign: 'right',
    marginRight: 6,
    fontWeight: '600',
  },
  breakdownProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownProgressFill: {
    height: '100%',
    backgroundColor: '#FBBF24',
    borderRadius: 3,
  },
  breakdownCountText: {
    fontSize: 10,
    color: COLORS.gray,
    width: 16,
    textAlign: 'left',
    marginLeft: 6,
    fontWeight: '600',
  },
  requestVerifyBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  requestVerifyBtnText: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  createBundleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBundleBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bundlesSection: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  bundlesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bundlesScroll: {
    paddingRight: 20,
  },
  bundleCard: {
    width: 200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
  },
  bundleName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bundlePrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  bundleMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  bundleImagesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bundleMiniImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteBundleBtn: {
    backgroundColor: '#EF444415',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBundleText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  buyBundleBtn: {
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyBundleText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bundleModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  bundleFormScroll: {
    marginVertical: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 6,
  },
  bundleInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  bundleItemSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 8,
  },
  bundleItemSelectActive: {
    borderColor: '#064E3B',
    backgroundColor: '#064E3B05',
  },
  bundleItemThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  bundleItemName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  bundleItemPrice: {
    fontSize: 12,
    color: COLORS.gray,
  },
  createBundleSubmitBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  createBundleSubmitText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noItemsText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: 20,
  },
});
