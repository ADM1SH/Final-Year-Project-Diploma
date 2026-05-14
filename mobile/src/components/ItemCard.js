import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import GradeBadge from './GradeBadge';
import EcoMetric from './EcoMetric';

const ItemCard = ({ item, onPress, onToggleFavorite, isFavorite }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!item) return null;
  const mainImage = item.display_image || (item.images && item.images.length > 0 ? item.images[0].image : null);

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.imageContainer}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={30} color={COLORS.gray} />
            </View>
          )}
          
          <View style={styles.topBadges}>
            <TouchableOpacity 
              style={styles.favoriteCircle} 
              onPress={() => onToggleFavorite && onToggleFavorite(item.id)}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={18} 
                color={isFavorite ? COLORS.danger : COLORS.black} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBadges}>
            {item.is_sold ? (
              <View style={styles.soldBadge}><Text style={styles.soldText}>SOLD</Text></View>
            ) : (
              <GradeBadge grade={item.calculated_grade} />
            )}
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.price}>${item.price || '0'}</Text>
          </View>
          <View style={styles.ecoRow}>
            <EcoMetric value={ecoImpact} label="kg CO2 saved" />
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
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden'
  },
  imageContainer: {
    height: 160,
    backgroundColor: COLORS.lightGray,
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
  topBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  favoriteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  bottomBadges: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 10,
  },
  soldBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soldText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D9488',
  },
  ecoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ecoText: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: 4,
  },
});

export default ItemCard;
