import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import GradeBadge from '../../components/GradeBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user: currentUser } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState(false);

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

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!item) return <View style={styles.centered}><Text>Item not found.</Text></View>;

  const mainImage = item.display_image || (item.images && item.images.length > 0 ? item.images[0].image : null);
  const sellerName = item.seller?.username || item.seller_name || 'Anonymous';
  const firstInitial = sellerName.charAt(0).toUpperCase();
  
  const isSeller = item.seller === currentUser?.id || item.seller_name === currentUser?.username;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {mainImage ? <Image source={{ uri: mainImage }} style={styles.image}/> : <View style={styles.placeholderImage}><Ionicons name="image-outline" size={60} color={COLORS.gray}/></View>}
          
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.black}/>
            </TouchableOpacity>
            <View style={styles.rightControls}>
              <TouchableOpacity style={styles.iconButton}><Ionicons name="share-social-outline" size={24} color={COLORS.black}/></TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}><Ionicons name="heart-outline" size={24} color={COLORS.black}/></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.name}</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>RM {item.price}</Text>
            <View style={styles.gradeBadgeContainer}>
              <GradeBadge grade={item.calculated_grade}/>
              <TouchableOpacity style={styles.infoIcon}><Ionicons name="information-circle-outline" size={16} color={COLORS.primary}/></TouchableOpacity>
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
              <Text style={styles.avatarText}>{firstInitial}</Text>
              <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={14} color={COLORS.primary}/></View>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              <Text style={styles.sellerTag}>Conscious Neighbor</Text>
            </View>
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScore}>{item.seller_trust_score || 0}%</Text>
              <Text style={styles.salesCount}>{item.seller_sales_count || 0} Sales</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>DESCRIPTION</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </ScrollView>

      {!isSeller && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => navigation.navigate('ChatDetail', { 
              userName: sellerName, 
              userId: item.seller || item.seller_id 
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 120 },
  imageContainer: { height: 400, width: '100%' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
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
  infoSection: { padding: 20, marginTop: -20, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', flex: 1, letterSpacing: -0.5 },
  negotiableBadgeDetail: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  negotiableTextDetail: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#064E3B',
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#0D9488' },
  gradeBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 10 },
  infoIcon: { marginLeft: 8 },
  ecoBanner: { backgroundColor: '#ECFDF5', padding: 18, borderRadius: 16, marginTop: 25, borderWidth: 1, borderColor: '#D1FAE5' },
  ecoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ecoTitle: { fontSize: 16, fontWeight: 'bold', color: '#065F46', marginLeft: 8 },
  ecoText: { fontSize: 14, color: '#065F46', lineHeight: 20 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginTop: 10 },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
  sellerInfo: { flex: 1, marginLeft: 16 },
  sellerName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  sellerTag: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  trustScoreContainer: { alignItems: 'flex-end' },
  trustScore: { fontSize: 16, fontWeight: 'bold', color: '#0D9488' },
  salesCount: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#6B7280', marginTop: 30, marginBottom: 12, letterSpacing: 1 },
  description: { fontSize: 16, color: '#4B5563', lineHeight: 26 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 45, backgroundColor: 'white', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10 },
  chatButton: { flex: 0.8, height: 56, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#064E3B', borderRadius: 16, marginRight: 12, flexDirection: 'row' },
  chatButtonText: { color: '#064E3B', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  buyButton: { flex: 1.2, height: 56, justifyContent: 'center', alignItems: 'center', backgroundColor: '#064E3B', borderRadius: 16 },
  buyButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
