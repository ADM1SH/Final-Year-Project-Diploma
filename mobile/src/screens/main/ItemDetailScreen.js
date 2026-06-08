/**
 * File: ItemDetailScreen.js
 * Description: Interactive details screen displaying listing images, seller trust score, grading checklist, and buy button.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology (DIT)
 * Module: Final Year Project (FYP) - DIT3004 / DIT3102
 * Developer: Adam Anwar & DIT Team
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Dimensions, Share, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADING_CONFIG } from '../../utils/constants';
import GradeBadge from '../../components/GradeBadge';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import api from '../../api/client';
import { ScamReportModal } from '../../components/ScamReportModal';
import { DetailsSkeleton } from '../../components/SkeletonLoader';

export const ItemDetailScreen = ({ route, navigation }) => {
  const { user: currentUser } = useAuth();
  const routeItemId = route.params?.itemId;
  const itemId = routeItemId ? parseInt(routeItemId) : null;
  const { favorites, toggleFavorite, refreshMarket } = useMarket();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleMarkAsSold = async () => {
    Alert.alert(
      "Mark as Sold",
      "Are you sure you want to mark this item as sold? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Mark as Sold", 
          onPress: async () => {
            try {
              setOffering(true);
              await api.patch(`items/${itemId}/`, { is_sold: true });
              setItem(prev => ({ ...prev, is_sold: true }));
              refreshMarket();
              Alert.alert("Success", "Listing marked as sold.");
            } catch (err) {
              Alert.alert("Error", "Could not update listing.");
            } finally {
              setOffering(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteListing = async () => {
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
              setOffering(true);
              await api.delete(`items/${itemId}/`);
              refreshMarket();
              Alert.alert("Success", "Listing deleted.", [
                { text: "OK", onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              Alert.alert("Error", "Could not delete listing.");
            } finally {
              setOffering(false);
            }
          }
        }
      ]
    );
  };

  const isFavorited = favorites.includes(itemId);

  const handleMakeOffer = () => {
    navigation.navigate('Checkout', { item });
  };

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`items/${itemId}/`);
        setItem(res.data);
      } catch (e) {
        console.error('Fetch Item Error:', e.message);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [itemId]);

  if (loading) return <DetailsSkeleton />;
  if (!item) return <View style={styles.centered}><Text>Item not found.</Text></View>;

  const mainImage = item.display_image || (item.images && item.images.length > 0 ? item.images[0].image : null);
  const sellerName = item.seller?.username || item.seller_name || 'Anonymous';
  const firstInitial = sellerName.charAt(0).toUpperCase();
  
  const isSeller = item.seller === currentUser?.id || item.seller_name === currentUser?.username;

  const renderConditionSurvey = () => {
    const catName = item.category_name || 'Others';
    const rules = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];
    
    const passed = [];
    const failed = [];
    
    rules.forEach(rule => {
      const isPassed = item[rule.key];
      if (isPassed) {
        passed.push(rule.label);
      } else {
        failed.push(rule.label);
      }
    });

    return (
      <View style={styles.disclosureCard}>
        <View style={styles.disclosureHeader}>
          <View style={styles.disclosureTitleRow}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.disclosureTitle}>Seller's Disclosure Report</Text>
          </View>
          <View style={[styles.gradeBadgeContainer, { backgroundColor: COLORS.eco }]}>
            <Text style={styles.gradeBadgeText}>Grade {item.calculated_grade || 'A'}</Text>
          </View>
        </View>

        {item.flaw_disclosure ? (
          <View style={styles.disclosureNotesBox}>
            <Text style={styles.disclosureNotesTitle}>Seller's Notes:</Text>
            <Text style={styles.disclosureNotesText}>"{item.flaw_disclosure}"</Text>
          </View>
        ) : (
          <View style={styles.disclosureNotesBox}>
            <Text style={styles.disclosureNotesTitle}>Seller's Notes:</Text>
            <Text style={[styles.disclosureNotesText, { fontStyle: 'italic', color: COLORS.gray }]}>
              "No specific flaws or damages disclosed by the seller."
            </Text>
          </View>
        )}

        <View style={styles.snapshotContainer}>
          <Text style={styles.snapshotSectionTitle}>Condition Snapshot</Text>
          
          <View style={styles.snapshotSplit}>
            <View style={styles.snapshotColumn}>
              <View style={styles.snapshotColumnHeader}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={{ marginRight: 4 }} />
                <Text style={[styles.snapshotColumnTitle, { color: COLORS.success }]}>Passed</Text>
              </View>
              {passed.length > 0 ? (
                passed.map((lbl, i) => (
                  <View key={`pass-${i}`} style={styles.snapshotItemRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.snapshotItemText}>{lbl}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.snapshotEmptyText}>None</Text>
              )}
            </View>

            <View style={styles.snapshotColumn}>
              <View style={styles.snapshotColumnHeader}>
                <Ionicons name="close-circle" size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
                <Text style={[styles.snapshotColumnTitle, { color: COLORS.danger }]}>Flaws/Missing</Text>
              </View>
              {failed.length > 0 ? (
                failed.map((lbl, i) => (
                  <View key={`fail-${i}`} style={styles.snapshotItemRow}>
                    <Text style={[styles.bulletDot, { color: COLORS.danger }]}>•</Text>
                    <Text style={[styles.snapshotItemText, styles.failedText]}>{lbl}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.snapshotEmptyText, { color: COLORS.success, fontWeight: 'bold' }]}>No Flaws Disclosed</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleShare = async () => {
    try {
      const message = `Check out this great secondhand find on MyPreLove!\n\n📦 Item: ${item.name}\n💰 Price: RM ${parseFloat(item.price || 0).toFixed(2)}\n🌱 Eco-Impact: Saves ${item.eco_impact || 10}kg of CO2!\n\nView listing: myprelove://item/${item.id}`;
      await Share.share({
        message,
        title: item.name
      });
    } catch (error) {
      console.log('Error sharing item:', error.message);
    }
  };

  const handleSetPriceAlert = async () => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid price threshold.");
      return;
    }
    try {
      await api.post('price-alerts/', {
        item: item.id,
        target_price: parseFloat(targetPrice)
      });
      Alert.alert("Price Alert Set", `We'll notify you if this item's price drops to or below RM ${parseFloat(targetPrice).toFixed(2)}.`);
      setShowPriceAlertModal(false);
      setTargetPrice('');
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not set price alert. Check if you already set one for this item.");
    }
  };

  const handleBlockSeller = () => {
    const sellerId = item.seller?.id || item.seller;
    Alert.alert(
      "Block Seller",
      `Are you sure you want to block ${sellerName}? Their listings will no longer appear in your feed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post('blocks/', { blocked: sellerId });
              Alert.alert("Blocked", `${sellerName} has been blocked.`);
              navigation.navigate('MainTabs', { screen: 'For You' });
              refreshMarket();
            } catch (err) {
              Alert.alert("Error", "Could not block user. They might be blocked already.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <View style={{ width: '100%', height: '100%' }}>
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const slideSize = event.nativeEvent.layoutMeasurement.width;
                  const offset = event.nativeEvent.contentOffset.x;
                  if (slideSize > 0) {
                    const activeIndex = Math.round(offset / slideSize);
                    setCurrentImageIndex(activeIndex);
                  }
                }}
                scrollEventThrottle={16}
              >
                {item.images.map((imgObj, index) => {
                  const imgUri = imgObj.image_url || imgObj.image;
                  return (
                    <Image 
                      key={imgObj.id || index} 
                      source={{ uri: imgUri }} 
                      style={styles.carouselImage}
                    />
                  );
                })}
              </ScrollView>
              
              {/* Pagination Dots Indicator */}
              {item.images.length > 1 && (
                <View style={styles.paginationDotsContainer}>
                  {item.images.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.paginationDot, 
                        currentImageIndex === idx && styles.activePaginationDot
                      ]} 
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            mainImage ? (
              <Image source={{ uri: mainImage }} style={styles.image}/>
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={60} color={COLORS.gray}/>
              </View>
            )
          )}
          
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.black}/>
            </TouchableOpacity>
            <View style={styles.rightControls}>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color={COLORS.black}/>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => toggleFavorite(item.id)}
              >
                <Ionicons 
                   name={isFavorited ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorited ? COLORS.danger : COLORS.black}
                />
              </TouchableOpacity>
              {!isSeller && (
                <>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => setShowPriceAlertModal(true)}
                  >
                    <Ionicons name="notifications-outline" size={24} color={COLORS.primary}/>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={handleBlockSeller}
                  >
                    <Ionicons name="ban-outline" size={24} color={COLORS.danger}/>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => setShowReportModal(true)}
                  >
                    <Ionicons name="flag-outline" size={24} color={COLORS.danger}/>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.name}</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>RM {parseFloat(item.price || 0).toFixed(2)}</Text>
            <View style={styles.gradeBadgeContainer}>
              <GradeBadge grade={item.calculated_grade}/>
              <TouchableOpacity style={styles.infoIcon}><Ionicons name="information-circle-outline" size={16} color={COLORS.primary}/></TouchableOpacity>
            </View>
          </View>

          <View style={styles.socialProofRow}>
            <View style={styles.viewCountBadge}>
              <Ionicons name="eye-outline" size={14} color={COLORS.gray} style={{ marginRight: 4 }} />
              <Text style={styles.viewCountText}>{item.view_count || 1} { (item.view_count || 1) === 1 ? 'view' : 'views'}</Text>
            </View>
            <View style={[styles.viewCountBadge, { marginLeft: 10 }]}>
              <Ionicons name="leaf-outline" size={14} color={COLORS.success} style={{ marginRight: 4 }} />
              <Text style={[styles.viewCountText, { color: COLORS.success }]}>Eco-Impact Verified</Text>
            </View>
          </View>

          <View style={styles.ecoBanner}>
            <View style={styles.ecoHeader}>
              <Ionicons name="leaf" size={20} color={COLORS.ecoText}/>
              <Text style={styles.ecoTitle}>Sustainable Choice</Text>
            </View>
            <Text style={styles.ecoText}>Buying this saved approximately {item.eco_impact || 10}kg of CO2.</Text>
          </View>

          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              {item.seller_profile_picture ? (
                <Image source={{ uri: item.seller_profile_picture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{firstInitial}</Text>
              )}
              <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={14} color={COLORS.primary}/></View>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              {item.seller_location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="location-outline" size={12} color={COLORS.gray} style={{ marginRight: 3 }} />
                  <Text style={styles.sellerTag}>{item.seller_location}</Text>
                </View>
              ) : (
                <Text style={styles.sellerTag}>Conscious Neighbor</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Ionicons name="time-outline" size={12} color={COLORS.gray} style={{ marginRight: 3 }} />
                <Text style={styles.sellerTag}>{item.seller_response_time || 'Usually replies within 2 hours'}</Text>
              </View>
            </View>
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScore}>{item.seller_trust_score || 0}%</Text>
              <Text style={styles.salesCount}>{item.seller_sales_count || 0} Sales</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>CONDITION DISCLOSURE REPORT</Text>
          {renderConditionSurvey()}

          <Text style={styles.sectionHeader}>DESCRIPTION</Text>
          <Text style={styles.description}>{item.description}</Text>

          {!isSeller && (
            <TouchableOpacity 
              style={styles.reportListingContainer} 
              onPress={() => setShowReportModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={14} color={COLORS.danger} style={{ marginRight: 6 }} />
              <Text style={styles.reportListingText}>Report listing as suspicious/scam</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {!isSeller && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => navigation.navigate('ChatDetail', { 
              userName: sellerName, 
              userId: item.seller || item.seller_id,
              item: item
            })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary}/>
            <Text style={styles.chatButtonText}>Chat with Seller</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.buyButton, (offering || item.is_sold) && { opacity: 0.7 }]}
            onPress={handleMakeOffer}
            disabled={offering || item.is_sold}
          >
            {offering ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buyButtonText}>
                {item.is_sold ? 'Already Sold' : 'Make Offer'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isSeller && (
        <View style={styles.footer}>
          {!item.is_sold ? (
            <TouchableOpacity 
              style={[styles.soldButton, offering && { opacity: 0.7 }]} 
              onPress={handleMarkAsSold}
              disabled={offering}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.soldButtonText}>Sold</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-done" size={18} color={COLORS.success} style={{ marginRight: 4 }} />
              <Text style={styles.soldBannerText}>Sold</Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editButton, offering && { opacity: 0.7 }]} 
            onPress={() => navigation.navigate('EditItem', { item: item })}
            disabled={offering}
          >
            <Ionicons name="create-outline" size={18} color="white" style={{ marginRight: 4 }} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.deleteButton, offering && { opacity: 0.7 }]} 
            onPress={handleDeleteListing}
            disabled={offering}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScamReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        item={item}
        sellerId={item.seller || item.seller_id}
        sellerName={sellerName}
      />

      <Modal visible={showPriceAlertModal} animationType="slide" transparent>
        <View style={styles.priceOverlay}>
          <View style={styles.priceModalContent}>
            <View style={styles.priceModalHeader}>
              <Text style={styles.priceModalTitle}>Set Price Alert</Text>
              <TouchableOpacity onPress={() => setShowPriceAlertModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceModalLabel}>Get notified when '{item.name}' drops below your target price:</Text>
            <View style={styles.priceAlertInputContainer}>
              <Text style={styles.priceAlertCurrency}>RM</Text>
              <TextInput 
                style={styles.priceAlertInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 75.00"
                value={targetPrice}
                onChangeText={setTargetPrice}
              />
            </View>
            <TouchableOpacity style={styles.priceAlertSubmitBtn} onPress={handleSetPriceAlert}>
              <Text style={styles.priceAlertSubmitBtnText}>Enable Alert</Text>
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
  scrollContent: { paddingBottom: 120 },
  imageContainer: { height: 400, width: '100%' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  carouselImage: { width: Dimensions.get('window').width, height: 400, resizeMode: 'cover' },
  paginationDotsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4
  },
  activePaginationDot: {
    width: 20,
    backgroundColor: '#FFFFFF'
  },
  topControls: { 
    position: 'absolute', 
    top: 50, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    zIndex: 10,
  },
  rightControls: { flexDirection: 'row' },
  iconButton: { backgroundColor: 'white', padding: 10, borderRadius: 25, elevation: 5, marginLeft: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  infoSection: { padding: 20, marginTop: -20, backgroundColor: COLORS.background, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 },
  title: { 
    fontSize: 28, 
    fontWeight: '600', 
    color: COLORS.black, 
    flex: 1, 
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  negotiableBadgeDetail: {
    backgroundColor: COLORS.eco,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  negotiableTextDetail: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif'
  },
  gradeBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, padding: 4, borderRadius: 10 },
  infoIcon: { marginLeft: 8 },
  ecoBanner: { 
    backgroundColor: COLORS.eco, 
    padding: 18, 
    borderRadius: 16, 
    marginTop: 25, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 4, 
    elevation: 1 
  },
  ecoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ecoTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.ecoText, marginLeft: 8 },
  ecoText: { fontSize: 14, color: COLORS.ecoText, lineHeight: 20 },
  sellerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    marginTop: 20,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
  sellerInfo: { flex: 1, marginLeft: 16 },
  sellerName: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  sellerTag: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  trustScoreContainer: { alignItems: 'flex-end' },
  trustScore: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  salesCount: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: COLORS.gray, marginTop: 30, marginBottom: 12, letterSpacing: 1 },
  description: { fontSize: 16, color: COLORS.black, lineHeight: 26, opacity: 0.8 },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 35 : 20, 
    backgroundColor: COLORS.white, 
    flexDirection: 'row', 
    borderTopWidth: 1, 
    borderTopColor: COLORS.lightGray, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -10 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10,
    elevation: 5
  },
  chatButton: { 
    flex: 0.8, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.primary, 
    borderRadius: 28, 
    marginRight: 12, 
    flexDirection: 'row' 
  },
  chatButtonText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  buyButton: { 
    flex: 1.2, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.secondary, 
    borderRadius: 28 
  },
  buyButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  surveyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  surveyGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  surveyGridLabel: {
    fontSize: 13,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  surveyGridLabelDisabled: {
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  timelineContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.lightGray,
    marginTop: 4,
    marginBottom: -16,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineLabel: {
    fontSize: 14,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  timelineStatus: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  priceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  priceModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  priceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  priceModalLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
  },
  priceAlertInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  priceAlertCurrency: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginRight: 6,
  },
  priceAlertInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  priceAlertSubmitBtn: {
    backgroundColor: '#064E3B',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceAlertSubmitBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  reportListingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
  },
  reportListingText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  soldButton: {
    flex: 1.2,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  soldButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  editButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  deleteButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  soldBanner: {
    flex: 1.2,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.eco,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  soldBannerText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    resizeMode: 'cover',
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  viewCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewCountText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  flawBox: {
    backgroundColor: '#FFFBEB', // Light amber background
    borderWidth: 1,
    borderColor: '#FDE68A', // Amber border
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  flawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  flawTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B45309', // Dark amber text
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  flawText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  disclosureCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  disclosureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 12,
    marginBottom: 15,
  },
  disclosureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclosureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  gradeBadgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  disclosureNotesBox: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 12,
    marginBottom: 18,
  },
  disclosureNotesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disclosureNotesText: {
    fontSize: 14,
    color: COLORS.black,
    lineHeight: 20,
  },
  snapshotContainer: {
    marginTop: 5,
  },
  snapshotSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  snapshotSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  snapshotColumn: {
    width: '48%',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  snapshotColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 6,
    marginBottom: 8,
  },
  snapshotColumnTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  snapshotItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 12,
    color: COLORS.success,
    marginRight: 4,
    lineHeight: 18,
  },
  snapshotItemText: {
    fontSize: 12,
    color: COLORS.black,
    flex: 1,
    lineHeight: 18,
  },
  failedText: {
    color: COLORS.danger,
  },
  snapshotEmptyText: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});
