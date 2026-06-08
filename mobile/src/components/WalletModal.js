/**
 * File: WalletModal.js
 * Description: Modal component to handle wallet top-ups.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology (DIT)
 * Module: Final Year Project (FYP) - DIT3004 / DIT3102
 * Developer: Adam Anwar & DIT Team
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export const WalletModal = ({ visible, onClose, onSubmit, submitting }) => {
  const [amount, setAmount] = useState('');

  const handleConfirm = () => {
    if (onSubmit) {
      onSubmit(amount, () => {
        setAmount('');
      });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
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
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>
          
          <View style={styles.quickAmounts}>
            {['50', '100', '200', '500'].map(val => (
              <TouchableOpacity 
                key={val} 
                style={styles.quickAmountBtn}
                onPress={() => setAmount(val)}
              >
                <Text style={styles.quickAmountText}>+RM {val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => {
                setAmount('');
                onClose();
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.walletSubmitBtn} 
              onPress={handleConfirm} 
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.walletSubmitText}>Confirm Top Up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAmountBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: 'bold',
  },
  walletSubmitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#10B981',
  },
  walletSubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
