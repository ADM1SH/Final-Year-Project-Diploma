import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const CheckoutScreen = ({ route, navigation }) => {
  const { item } = route.params;
  const [offerPrice, setOfferPrice] = useState(item.price.toString());
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('profiles/me/');
      setProfile(response.data);
    } catch (e) {
      console.error('Fetch Profile Error (Checkout):', e.message);
    }
  };

  const paymentMethods = [
    { id: 'WALLET', label: 'MyPreLove Cash Wallet (Cashless)', icon: 'wallet-outline' },
    { id: 'CASH', label: 'Cash on Delivery', icon: 'cash-outline' },
    { id: 'TRANSFER', label: 'Bank Transfer', icon: 'business-outline' },
  ];

  const handleConfirmOffer = async () => {
    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      Alert.alert("Error", "Please enter a valid price.");
      return;
    }

    if (paymentMethod === 'WALLET' && profile) {
      const balance = parseFloat(profile.wallet_balance || 0);
      const offer = parseFloat(offerPrice);
      if (offer > balance) {
        Alert.alert("Insufficient Balance", "Your wallet balance is insufficient to complete this offer. Please top up your wallet in your profile first!");
        return;
      }
    }

    try {
      setLoading(true);
      await api.post('transactions/', {
        item: item.id,
        offer_price: parseFloat(offerPrice),
        payment_method: paymentMethod
      });
      Alert.alert("Success", "Your offer has been sent to the seller!");
      navigation.navigate('MainTabs', { screen: 'For You' });
    } catch (e) {
      console.error('Checkout Error:', e.message);
      const errorMsg = e.response?.data?.[0] || e.response?.data?.error || "Could not send offer.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Make an Offer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.itemSummary}>
          <Text style={styles.sectionLabel}>ITEM</Text>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemOriginalPrice}>Listed Price: RM {parseFloat(item.price || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR OFFER PRICE (RM)</Text>
          {item.is_negotiable ? (
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencyPrefix}>RM</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="decimal-pad"
                value={offerPrice}
                onChangeText={setOfferPrice}
                placeholder="0.00"
              />
            </View>
          ) : (
            <View style={styles.fixedPriceContainer}>
              <Text style={styles.fixedPrice}>RM {parseFloat(item.price || 0).toFixed(2)}</Text>
              <Text style={styles.fixedLabel}>This item price is fixed.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity 
              key={method.id}
              style={[
                styles.paymentOption,
                paymentMethod === method.id && styles.selectedOption
              ]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons 
                name={method.icon} 
                size={22} 
                color={paymentMethod === method.id ? COLORS.primary : COLORS.gray} 
              />
              <Text style={[
                styles.paymentLabel,
                paymentMethod === method.id && styles.selectedLabel
              ]}>
                {method.label}
                {method.id === 'WALLET' && profile ? `\n(Balance: RM ${parseFloat(profile.wallet_balance || 0).toFixed(2)})` : ''}
              </Text>
              {paymentMethod === method.id && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.gray} />
          <Text style={styles.infoText}>
            Making an offer doesn't mean you've paid yet. The seller needs to accept your offer to proceed.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Offer</Text>
          <Text style={styles.totalValue}>RM {parseFloat(offerPrice || 0).toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
          onPress={handleConfirmOffer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Offer</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6',
    zIndex: 10
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray, marginBottom: 12, letterSpacing: 0.5 },
  itemSummary: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 25 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  itemOriginalPrice: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  section: { marginBottom: 25 },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  currencyPrefix: { fontSize: 18, fontWeight: 'bold', color: COLORS.black, marginRight: 10 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  fixedPriceContainer: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12 },
  fixedPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  fixedLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  selectedOption: { borderColor: COLORS.primary, backgroundColor: '#ECFDF5' },
  paymentLabel: { flex: 1, marginLeft: 15, fontSize: 15, color: COLORS.black },
  selectedLabel: { fontWeight: 'bold', color: COLORS.primary },
  infoBox: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12, color: COLORS.gray, lineHeight: 18 },
  footer: { backgroundColor: 'white', padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 14, color: COLORS.gray },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  confirmBtn: { backgroundColor: '#064E3B', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
