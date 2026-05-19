import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import api from '../api/client';

export const ReviewModal = ({ visible, onClose, transaction, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert("Error", "Please enter a comment.");
      return;
    }

    try {
      setLoading(true);
      await api.post('reviews/', {
        item: transaction.item_id || transaction.item,
        seller: transaction.seller,
        rating: rating,
        comment: comment
      });
      Alert.alert("Success", "Review submitted! Thank you for your feedback.");
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Review Error:', e.message);
      const errorMsg = e.response?.data?.non_field_errors?.[0] || "Could not submit review. You might have already reviewed this item.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Seller</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemName}>{transaction.item_name}</Text>
          <Text style={styles.sellerName}>Seller: {transaction.seller_name}</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={40} 
                  color={star <= rating ? "#FBBF24" : COLORS.gray} 
                  style={{ marginHorizontal: 5 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your experience..."
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  sellerName: { fontSize: 14, color: COLORS.gray, marginBottom: 25 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25 },
  commentInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, height: 120, textAlignVertical: 'top', fontSize: 15, color: COLORS.black, marginBottom: 25 },
  submitBtn: { backgroundColor: '#064E3B', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
