/**
 * File: ScamReportModal.js
 * Description: Interactive modal dialog that allows users to submit scam/fraud reports.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology (DIT)
 * Module: Final Year Project (FYP) - DIT3004 / DIT3102
 * Developer: Adam Anwar & DIT Team
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import api from '../api/client';

const REPORT_REASONS = [
  "Counterfeit / Fake Product",
  "Scammer / Fraudulent Seller",
  "Listing Price / Details are Misleading",
  "Inaccurate Condition Grade Claim",
  "Inappropriate or Offensive Description",
  "Other Reason"
];

export const ScamReportModal = ({ visible, onClose, item, sellerId, sellerName, onSuccess }) => {
  const [selectedReasonIndex, setSelectedReasonIndex] = useState(0);
  const [customDetails, setCustomDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const finalReason = `${REPORT_REASONS[selectedReasonIndex]}${customDetails ? `: ${customDetails}` : ''}`;

    try {
      setLoading(true);
      
      // Call standard ScamReport API endpoint
      await api.post('scam_reports/', {
        reported_user: sellerId,
        item: item?.id || null,
        reason: finalReason
      });

      Alert.alert(
        "Report Submitted",
        "Thank you. Our moderators will review this listing and investigate the seller. We value your safety!"
      );
      
      if (onSuccess) onSuccess();
      onClose();
      // Reset inputs
      setCustomDetails('');
      setSelectedReasonIndex(0);
    } catch (e) {
      console.error('Report Scam Error:', e.message);
      const errorMsg = e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || "Could not submit report. Please try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Report Listing</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {item && (
              <View style={styles.itemSummary}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sellerName}>Listed by: {sellerName}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Why are you reporting this listing?</Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason, idx) => {
                const isSelected = selectedReasonIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReasonIndex(idx)}
                  >
                    <Ionicons 
                      name={isSelected ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={isSelected ? COLORS.danger : COLORS.gray} 
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Provide more details to help our moderation team understand the issue..."
              multiline
              numberOfLines={4}
              value={customDetails}
              onChangeText={setCustomDetails}
              placeholderTextColor={COLORS.gray}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Scam Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    marginTop: 16,
  },
  itemSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sellerName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  reasonText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: 'bold',
    color: '#DC2626',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
