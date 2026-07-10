import { useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import api from '../api/client';

// Rating values as a constant array so the .map() below doesn't recreate it.
const STAR_VALUES = [1, 2, 3, 4, 5];

export const ReviewModal = ({ visible, onClose, transaction, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form fields when the modal closes so a fresh state is shown next time.
    const handleClose = useCallback(() => {
        setRating(5);
        setComment('');
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(async () => {
        if (!comment.trim()) {
            Alert.alert('Error', 'Please enter a comment.');
            return;
        }

        try {
            setLoading(true);
            await api.post('reviews/', {
                item:    transaction.item_id || transaction.item,
                seller:  transaction.seller,
                rating:  rating,
                comment: comment,
            });
            Alert.alert('Success', 'Review submitted! Thank you for your feedback.');
            onSuccess();
            handleClose();
        } catch (e) {
            console.error('Review Error:', e.message);
            const errorMsg =
                e.response?.data?.non_field_errors?.[0] ||
                'Could not submit review. You might have already reviewed this item.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    }, [comment, rating, transaction, onSuccess, handleClose]);

    if (!transaction) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Review Seller</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={24} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.itemName}>{transaction.item_name}</Text>
                    <Text style={styles.sellerName}>Seller: {transaction.seller_name}</Text>

                    <View style={styles.ratingRow}>
                        {STAR_VALUES.map(star => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? 'star' : 'star-outline'}
                                    size={40}
                                    color={star <= rating ? '#FBBF24' : COLORS.gray}
                                    style={styles.starIcon}
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
                        style={[styles.submitBtn, loading && styles.disabledBtn]}
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
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.black,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    sellerName: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 25,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
    },
    starIcon: {
        marginHorizontal: 5,
    },
    commentInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 15,
        height: 120,
        textAlignVertical: 'top',
        fontSize: 15,
        color: COLORS.black,
        marginBottom: 25,
    },
    submitBtn: {
        backgroundColor: '#064E3B',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
