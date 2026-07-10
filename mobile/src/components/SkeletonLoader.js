import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../utils/constants';

// Shimmer duration constant — avoids a magic number scattered across the file.
const SHIMMER_DURATION_MS = 800;

const SkeletonItem = ({ style }) => {
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Store a reference to the animation loop so we can stop it on unmount
        // and prevent the "Can't perform state update on unmounted component" warning.
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 0.8,
                    duration: SHIMMER_DURATION_MS,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0.3,
                    duration: SHIMMER_DURATION_MS,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();

        // Cleanup: stop the animation loop when the skeleton unmounts.
        return () => loop.stop();
    }, [shimmerAnim]);

    return <Animated.View style={[styles.shimmerBox, style, { opacity: shimmerAnim }]} />;
};

export const FeedCardSkeleton = React.memo(() => (
    <View style={styles.card}>
        <SkeletonItem style={styles.cardImage} />
        <View style={styles.cardContent}>
            <SkeletonItem style={styles.cardTitle} />
            <View style={styles.cardRow}>
                <SkeletonItem style={styles.cardPrice} />
                <SkeletonItem style={styles.cardGrade} />
            </View>
            <SkeletonItem style={styles.cardEco} />
        </View>
    </View>
));

export const SellerRowSkeleton = React.memo(() => (
    <View style={styles.row}>
        <SkeletonItem style={styles.avatar} />
        <View style={styles.rowContent}>
            <SkeletonItem style={styles.username} />
            <SkeletonItem style={styles.trustScore} />
        </View>
    </View>
));

export const DetailsSkeleton = React.memo(() => (
    <View style={styles.container}>
        <SkeletonItem style={styles.detailsImage} />
        <View style={styles.detailsContent}>
            <SkeletonItem style={styles.detailsTitle} />
            <SkeletonItem style={styles.detailsPrice} />
            <SkeletonItem style={styles.detailsEco} />
            <View style={styles.separator} />
            <SkeletonItem style={styles.detailsBlock} />
            <SkeletonItem style={styles.detailsLine} />
            <SkeletonItem style={styles.detailsLine} />
        </View>
    </View>
));

const styles = StyleSheet.create({
    shimmerBox: {
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        width: '48%',
    },
    cardImage: {
        width: '100%',
        height: 150,
        borderRadius: 0,
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        height: 16,
        width: '80%',
        marginBottom: 10,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardPrice: {
        height: 18,
        width: '45%',
    },
    cardGrade: {
        height: 20,
        width: '35%',
        borderRadius: 10,
    },
    cardEco: {
        height: 24,
        width: '90%',
        borderRadius: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 15,
    },
    rowContent: {
        flex: 1,
    },
    username: {
        height: 16,
        width: '40%',
        marginBottom: 8,
    },
    trustScore: {
        height: 12,
        width: '60%',
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    detailsImage: {
        width: '100%',
        height: 300,
        borderRadius: 0,
    },
    detailsContent: {
        padding: 20,
    },
    detailsTitle: {
        height: 26,
        width: '70%',
        marginBottom: 15,
    },
    detailsPrice: {
        height: 22,
        width: '30%',
        marginBottom: 15,
    },
    detailsEco: {
        height: 36,
        width: '100%',
        borderRadius: 8,
        marginBottom: 20,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.lightGray,
        marginVertical: 15,
    },
    detailsBlock: {
        height: 16,
        width: '40%',
        marginBottom: 15,
    },
    detailsLine: {
        height: 14,
        width: '100%',
        marginBottom: 10,
    },
});
