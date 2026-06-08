import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Track Eco-Impact',
    description: 'Track and showcase your environmental contribution. Save carbon emissions (CO2) with every pre-loved purchase and listing.',
    icon: 'leaf',
    color: COLORS.primary,
  },
  {
    id: '2',
    title: 'Trust-First Ecosystem',
    description: 'Transact with confidence. Our automated ABI Trust Model rates sellers based on verified status, sales history, and user reviews.',
    icon: 'shield-checkmark',
    color: COLORS.secondary,
  },
  {
    id: '3',
    title: 'Guaranteed Quality',
    description: "No surprise defects. Browse detailed condition checkpoints for tech, fashion, and books. Know exactly what you're buying.",
    icon: 'sparkles',
    color: COLORS.primary,
  },
];

export const OnboardingScreen = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Login');
    } catch (e) {
      console.error(e);
      navigation.replace('Login');
    }
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width
    ];

    // Scale animation for icon
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp'
    });

    // Rotation animation
    const rotate = scrollX.interpolate({
      inputRange,
      outputRange: ['-30deg', '0deg', '30deg'],
      extrapolate: 'clamp'
    });

    // Opacity animation for text
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp'
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[
          styles.iconContainer, 
          { 
            backgroundColor: item.color + '15',
            transform: [{ scale }, { rotate }] 
          }
        ]}>
          <Ionicons name={item.icon} size={100} color={item.color} />
        </Animated.View>
        <Animated.View style={[styles.textContainer, { opacity }]}>
          <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { 
            useNativeDriver: false,
            listener: (event) => {
              const slideSize = event.nativeEvent.layoutMeasurement.width;
              const offset = event.nativeEvent.contentOffset.x;
              const index = Math.round(offset / slideSize);
              setActiveIndex(index);
            }
          }
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width
            ];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp'
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp'
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: COLORS.primary }
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons 
            name={activeIndex === SLIDES.length - 1 ? 'checkmark-circle' : 'arrow-forward-outline'} 
            size={18} 
            color="white" 
            style={{ marginLeft: 6 }} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 25,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: COLORS.gray,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Medium',
  },
  slide: {
    width: width,
    height: height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'PlayfairDisplay-Bold',
  },
  description: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Regular',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold',
  },
});
