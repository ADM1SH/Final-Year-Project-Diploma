import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    await login('adamanwar', 'password');
    setIsLoggingIn(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.logo}>MyPrelove</Text>
          <Text style={styles.tagline}>Love it again.</Text>
        </View>

        {/* Featured Card */}
        <View style={styles.featuredCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1583847268964-b28dc2f51f92?q=80&w=500&auto=format&fit=crop' }} 
            style={styles.featuredImage} 
          />
          <View style={styles.featuredContent}>
            <View>
              <Text style={styles.featuredTitle}>Curated Essentials</Text>
              <Text style={styles.featuredSub}>Sustainable & Verified</Text>
            </View>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>GRADE A</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.getStartedButton} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.getStartedText}>Get Started  →</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.gray} /> Your conscious marketplace
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 40 },
  logoContainer: { alignItems: 'center' },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#064E3B', letterSpacing: -0.5 },
  tagline: { fontSize: 18, color: COLORS.black, marginTop: 4, opacity: 0.8 },
  featuredCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  featuredImage: { width: '100%', height: 250, resizeMode: 'cover' },
  featuredContent: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  featuredSub: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  gradeBadge: { backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  gradeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  actionContainer: { width: '100%', alignItems: 'center' },
  getStartedButton: { backgroundColor: '#064E3B', width: '100%', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  getStartedText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  loginLink: { padding: 10 },
  loginLinkText: { color: COLORS.black, fontSize: 15 },
  loginBold: { color: '#064E3B', fontWeight: 'bold' },
  footerText: { fontSize: 12, color: COLORS.gray, flexDirection: 'row', alignItems: 'center' }
});
