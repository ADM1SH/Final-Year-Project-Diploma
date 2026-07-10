/**
 * ItemCard component that displays an individual listing's overview, including image,
 * price, grade, trust score, negotiate badge, and eco-impact metrics.
 */
import React, { useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import AppImage from './AppImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';
import GradeBadge from './GradeBadge';
import EcoMetric from './EcoMetric';

// Magic-number constants for the spring animation
const PRESS_IN_SCALE  = 0.95;
const PRESS_OUT_SCALE = 1.0;

// Stable fallback image URI so it is not recreated on every render.
const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop';

// Gradient colours moved outside the component; arrays are re-created every
// render if defined inline, which forces the LinearGradient to re-render.
const GRADIENT_COLORS = ['transparent', 'rgba(0, 0, 0, 0.85)'];

// Reserved overlay background colour as a named constant to avoid inline magic.
const RESERVED_OVERLAY_BG = 'rgba(255, 193, 7, 0.85)';

const ItemCard = ({
    item,
    onPress,
    onLongPress,
    onToggleFavorite,
    isFavorite,
    // Overrides the default 2-column grid width ('48%', relative to a full-width
    // row) with a fixed pixel width. Needed when the card is reused outside its
    // native grid — e.g. a horizontal "Similar Items" scroller — where a
    // percentage would instead resolve relative to the scroller's own (much
    // narrower) wrapper and squeeze the grade badge into wrapping text.
    width,
    // Optional — only passed by the owner's own Listings tab. Renders a
    // one-tap "mark as sold" button on the card itself so sellers don't have
    // to open the item's detail page (or discover the long-press menu) just
    // to mark something sold.
    onMarkSold,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Derive the main image URI; fall back if images array is empty or missing.
    const mainImage =
        item?.display_image ||
        (item?.images && item.images.length > 0 ? item.images[0].image : null);

    // Track the displayed URI so we can swap to FALLBACK_IMAGE on load error
    // without mutating the original item data.
    const [imageUri, setImageUri] = React.useState(mainImage ?? FALLBACK_IMAGE);

    React.useEffect(() => {
        setImageUri(mainImage ?? FALLBACK_IMAGE);
    }, [mainImage]);

    if (!item) return null;

    // Parse and sanitize the eco impact value, falling back to a default value if invalid.
    const rawImpact = item.eco_impact ?? 12;
    const impactNum = typeof rawImpact === 'string' ? parseFloat(rawImpact) : rawImpact;
    const ecoImpact = isNaN(impactNum) ? '12' : impactNum.toFixed(0);

    // Trigger a spring scale animation for visual touch feedback.
    const handlePressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: PRESS_IN_SCALE,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: PRESS_OUT_SCALE,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    // Stable handler: only changes when onToggleFavorite or item.id changes.
    const handleFavouritePress = useCallback(() => {
        onToggleFavorite && onToggleFavorite(item.id);
    }, [onToggleFavorite, item.id]);

    const handleMarkSoldPress = useCallback(() => {
        onMarkSold && onMarkSold(item.id);
    }, [onMarkSold, item.id]);

    // Swap to the fallback image when the primary URI fails to load.
    const handleImageError = useCallback(() => {
        setImageUri(FALLBACK_IMAGE);
    }, []);

    return (
        <Animated.View style={[styles.animatedWrapper, width != null && { width }, { transform: [{ scale: scaleAnim }] }]}>
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
                        <AppImage
                            source={{ uri: imageUri }}
                            style={styles.image}
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons
                                name="image-outline"
                                size={30}
                                color={COLORS.gray}
                            />
                        </View>
                    )}

                    {/* Grade badge and negotiable label */}
                    <View style={styles.topLeftBadge}>
                        <GradeBadge grade={item.calculated_grade} />
                        {item.is_negotiable && (
                            <View style={styles.negoBadge}>
                                <Text style={styles.negoBadgeText}>NEGO</Text>
                            </View>
                        )}
                    </View>

                    {/* Favourite toggle button */}
                    <TouchableOpacity
                        style={styles.favoriteCircle}
                        onPress={handleFavouritePress}
                    >
                        <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={16}
                            color={isFavorite ? COLORS.danger : COLORS.black}
                        />
                    </TouchableOpacity>

                    {/* Quick "mark as sold" action — only rendered for the owner's
                        own active listings (parent only passes onMarkSold there) */}
                    {onMarkSold && !item.is_sold && (
                        <TouchableOpacity
                            style={styles.soldButton}
                            onPress={handleMarkSoldPress}
                        >
                            <Ionicons
                                name="checkmark-circle-outline"
                                size={14}
                                color="white"
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.soldButtonText}>Sold</Text>
                        </TouchableOpacity>
                    )}

                    {/* Sold overlay */}
                    {item.is_sold && (
                        <View style={styles.soldOverlay}>
                            <Text style={styles.soldOverlayText}>SOLD</Text>
                        </View>
                    )}

                    {/* Reserved overlay — only shown when not already sold */}
                    {!item.is_sold && item.is_reserved && (
                        <View style={[styles.soldOverlay, styles.reservedOverlay]}>
                            <Text style={[styles.soldOverlayText, styles.reservedOverlayText]}>
                                RESERVED
                            </Text>
                        </View>
                    )}

                    {/* Price + trust-score gradient strip at the bottom of the image */}
                    <LinearGradient
                        colors={GRADIENT_COLORS}
                        style={styles.imageGradient}
                    >
                        <View style={styles.gradientRow}>
                            <Text style={styles.gradientPrice}>
                                RM {parseFloat(item.price || 0).toFixed(0)}
                            </Text>
                            <View style={styles.trustBadge}>
                                <Ionicons
                                    name="shield-checkmark"
                                    size={10}
                                    color="white"
                                    style={styles.trustIcon}
                                />
                                <Text style={styles.trustText}>
                                    {item.seller_trust_score || 0}%
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.detailsRow}>
                        <EcoMetric value={ecoImpact} label="kg CO2" />
                        {item.seller_location ? (
                            <View style={styles.locationContainer}>
                                <Ionicons
                                    name="location-outline"
                                    size={11}
                                    color={COLORS.gray}
                                    style={styles.locationIcon}
                                />
                                <Text
                                    style={styles.locationText}
                                    numberOfLines={1}
                                >
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
    // Animated wrapper fills exactly half the grid column width.
    animatedWrapper: {
        width: '48%',
    },
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
    soldButton: {
        position: 'absolute',
        top: 48,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        zIndex: 10,
    },
    soldButtonText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
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
    reservedOverlay: {
        backgroundColor: RESERVED_OVERLAY_BG,
    },
    soldOverlayText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
    },
    reservedOverlayText: {
        color: COLORS.black,
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
        fontFamily:
            Platform.OS === 'ios'
                ? 'Plus Jakarta Sans'
                : 'PlusJakartaSans-Bold',
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    trustIcon: {
        marginRight: 2,
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
        fontFamily:
            Platform.OS === 'ios'
                ? 'Playfair Display'
                : 'PlayfairDisplay-SemiBold',
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
    locationIcon: {
        marginRight: 2,
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

// Custom equality check: only re-render when data relevant to the card changes.
export default React.memo(ItemCard, (prev, next) =>
    prev.item.id === next.item.id &&
    prev.isFavorite === next.isFavorite &&
    prev.item.price === next.item.price &&
    prev.item.is_sold === next.item.is_sold &&
    prev.item.is_reserved === next.item.is_reserved &&
    prev.item.calculated_grade === next.item.calculated_grade &&
    prev.item.seller_trust_score === next.item.seller_trust_score &&
    prev.onPress === next.onPress &&
    prev.onToggleFavorite === next.onToggleFavorite &&
    prev.onMarkSold === next.onMarkSold
);
