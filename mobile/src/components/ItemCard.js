/**
 * File: ItemCard.js
 * Description: UI Card component to display listings on the Explore Screen.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar & DIT Team
 */
import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';
import GradeBadge from './GradeBadge';
import EcoMetric from './EcoMetric';

const ItemCard = ({ item, onPress, onLongPress, onToggleFavorite, isFavorite }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!item) return null;
  const mainImage = item.display_image || (item.images && item.images.length > 0 ? item.images[0].image : null);
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop';
  const [imageUri, setImageUri] = React.useState(mainImage);

  React.useEffect(() => {
    setImageUri(mainImage);
  }, [mainImage]);

  const getEcoImpact = () => {
    const impact = item.eco_impact || 12;
    const val = typeof impact === 'string' ? parseFloat(impact) : impact;
    return isNaN(val) ? "12" : val.toFixed(0);
  };
  const ecoImpact = getEcoImpact();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={onPress} 
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.image} 
              onError={() => setImageUri(FALLBACK_IMAGE)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={30} color={COLORS.gray} />
            </View>
          )}

          {/* Top Left: Grade Badge */}
          <View style={styles.topLeftBadge}>
            <GradeBadge grade={item.calculated_grade} />
            {item.is_negotiable && (
              <View style={styles.negoBadge}>
                <Text style={styles.negoBadgeText}>NEGO</Text>
              </View>
            )}
          </View>

          {/* Top Right: Favorite Circle */}
          <TouchableOpacity 
            style={styles.favoriteCircle} 
            onPress={() => onToggleFavorite && onToggleFavorite(item.id)}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={16} 
              color={isFavorite ? COLORS.danger : COLORS.black} 
            />
          </TouchableOpacity>

          {/* Sold Overlay */}
          {item.is_sold && (
            <View style={styles.soldOverlay}>
              <Text style={styles.soldOverlayText}>SOLD</Text>
            </View>
          )}

          {/* Bottom Gradient Overlay (Price & Trust Score) */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.85)']}
            style={styles.imageGradient}
          >
            <View style={styles.gradientRow}>
              <Text style={styles.gradientPrice}>RM {parseFloat(item.price || 0).toFixed(0)}</Text>
              <View style={styles.trustBadge}>
                <Ionicons name="shield-checkmark" size={10} color="white" style={{ marginRight: 2 }} />
                <Text style={styles.trustText}>{item.seller_trust_score || 0}%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <View style={styles.detailsRow}>
            <EcoMetric value={ecoImpact} label="kg CO2" />
            {item.seller_location ? (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={11} color={COLORS.gray} style={{ marginRight: 2 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.seller_location.split(',')[0]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  imageContainer: {
    height: 170,
    backgroundColor: COLORS.lightGray,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLeftBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  favoriteCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  soldOverlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 55,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
    zIndex: 8,
  },
  gradientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradientPrice: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trustText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'PlayfairDisplay-SemiBold',
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  locationText: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  negoBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  negoBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
});

export default ItemCard;
