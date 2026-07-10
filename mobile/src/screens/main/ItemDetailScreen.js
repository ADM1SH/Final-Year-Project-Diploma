// ItemDetailScreen presents detailed information about a specific marketplace listing,
// including seller info, condition metrics, eco impact, and actions for buyers or sellers.
import { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import AppImage from '../../components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADING_CONFIG } from '../../utils/constants';
import GradeBadge from '../../components/GradeBadge';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import { ScamReportModal } from '../../components/ScamReportModal';
import { useItemDetails } from '../../hooks/useItemDetails';
import styles from './styles/ItemDetailScreenStyles';
import { DetailsSkeleton } from '../../components/SkeletonLoader';
import ItemCard from '../../components/ItemCard';

export const ItemDetailScreen = ({ route, navigation }) => {
    const { user: currentUser } = useAuth();
    const { favorites } = useMarket();
    const routeItemId = route.params?.itemId;

    const {
        item,
        loading,
        offering,
        showPriceAlertModal, setShowPriceAlertModal,
        targetPrice,        setTargetPrice,
        currentImageIndex,  setCurrentImageIndex,
        showReportModal,    setShowReportModal,
        isFavorited,
        toggleFavorite,
        handleMarkAsSold,
        handleDeleteListing,
        handleMakeOffer,
        handleShare,
        handleSetPriceAlert,
        handleBlockSeller,
        similarItems,
    } = useItemDetails(routeItemId, currentUser, navigation);

    const mainImage  = item?.display_image || (item?.images && item.images.length > 0 ? item.images[0].image : null);
    const sellerName = item?.seller?.username || item?.seller_name || 'Anonymous';
    const firstInitial = sellerName.charAt(0).toUpperCase();

    // Derived: true when the current user is the seller of this item.
    const isSeller = item?.seller === currentUser?.id || item?.seller_name === currentUser?.username;

    // Stable callbacks for navigation actions.
    const goBack               = useCallback(() => navigation.goBack(), [navigation]);
    const openPriceAlertModal  = useCallback(() => setShowPriceAlertModal(true), [setShowPriceAlertModal]);
    const closePriceAlertModal = useCallback(() => setShowPriceAlertModal(false), [setShowPriceAlertModal]);
    const openReportModal      = useCallback(() => setShowReportModal(true), [setShowReportModal]);
    const closeReportModal     = useCallback(() => setShowReportModal(false), [setShowReportModal]);
    const handleToggleFavorite = useCallback(() => {
        if (item?.id) toggleFavorite(item.id);
    }, [toggleFavorite, item?.id]);
    const goToChat             = useCallback(() => {
        if (item) {
            navigation.navigate('ChatDetail', {
                userName: sellerName,
                userId:   item.seller || item.seller_id,
                item,
            });
        }
    }, [navigation, sellerName, item]);
    const goToEdit             = useCallback(() => {
        if (item) navigation.navigate('EditItem', { item });
    }, [navigation, item]);

    // Scroll handler: update the image index indicator dynamically during horizontal swipes.
    const handleImageScroll = useCallback((event) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const offset    = event.nativeEvent.contentOffset.x;
        if (slideSize > 0) {
            setCurrentImageIndex(Math.round(offset / slideSize));
        }
    }, [setCurrentImageIndex]);

    // Parse the condition survey fields to categorise passed checkpoints and flaws.
    const { passed, failed } = useMemo(() => {
        if (!item) return { passed: [], failed: [] };
        const catName = item.category_name || 'Others';
        const rules   = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];
        const passedList  = [];
        const failedList  = [];
        rules.forEach(rule => {
            (item[rule.key] ? passedList : failedList).push(rule.label);
        });
        return { passed: passedList, failed: failedList };
    }, [item]);

    if (loading) return <DetailsSkeleton />;
    if (!item) return <View style={styles.centered}><Text>Item not found.</Text></View>;

    const renderConditionSurvey = () => (
        <View style={styles.disclosureCard}>
            <View style={styles.disclosureHeader}>
                <View style={styles.disclosureTitleRow}>
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={styles.disclosureIcon} />
                    <Text style={styles.disclosureTitle}>Seller's Disclosure Report</Text>
                </View>
                <View style={[styles.gradeBadgeContainer, styles.disclosureGradeBg]}>
                    <Text style={styles.gradeBadgeText}>Grade {item.calculated_grade || 'A'}</Text>
                </View>
            </View>

            <View style={styles.disclosureNotesBox}>
                <Text style={styles.disclosureNotesTitle}>Seller's Notes:</Text>
                {item.flaw_disclosure ? (
                    <Text style={styles.disclosureNotesText}>"{item.flaw_disclosure}"</Text>
                ) : (
                    <Text style={[styles.disclosureNotesText, styles.noFlawText]}>
                        "No specific flaws or damages disclosed by the seller."
                    </Text>
                )}
            </View>

            <View style={styles.snapshotContainer}>
                <Text style={styles.snapshotSectionTitle}>Condition Snapshot</Text>
                <View style={styles.snapshotSplit}>
                    {/* Passed column */}
                    <View style={styles.snapshotColumn}>
                        <View style={styles.snapshotColumnHeader}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={styles.snapshotColumnIcon} />
                            <Text style={[styles.snapshotColumnTitle, styles.passedTitle]}>Passed</Text>
                        </View>
                        {passed.length > 0 ? passed.map((lbl, i) => (
                            <View key={`pass-${i}`} style={styles.snapshotItemRow}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.snapshotItemText}>{lbl}</Text>
                            </View>
                        )) : (
                            <Text style={styles.snapshotEmptyText}>None</Text>
                        )}
                    </View>

                    {/* Failed/flaws column */}
                    <View style={styles.snapshotColumn}>
                        <View style={styles.snapshotColumnHeader}>
                            <Ionicons name="close-circle" size={16} color={COLORS.danger} style={styles.snapshotColumnIcon} />
                            <Text style={[styles.snapshotColumnTitle, styles.failedTitle]}>Flaws/Missing</Text>
                        </View>
                        {failed.length > 0 ? failed.map((lbl, i) => (
                            <View key={`fail-${i}`} style={styles.snapshotItemRow}>
                                <Text style={[styles.bulletDot, styles.failedDot]}>•</Text>
                                <Text style={[styles.snapshotItemText, styles.failedText]}>{lbl}</Text>
                            </View>
                        )) : (
                            <Text style={[styles.snapshotEmptyText, styles.noFlawsText]}>No Flaws Disclosed</Text>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image carousel or single image */}
                <View style={styles.imageContainer}>
                    {item.images && item.images.length > 0 ? (
                        <View style={styles.fullSize}>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleImageScroll}
                                scrollEventThrottle={16}
                            >
                                {item.images.map((imgObj, index) => {
                                    const imgUri = imgObj.image_url || imgObj.image;
                                    return (
                                        <AppImage
                                            key={imgObj.id || index}
                                            source={{ uri: imgUri }}
                                            style={styles.carouselImage}
                                        />
                                    );
                                })}
                            </ScrollView>

                            {/* Pagination dots */}
                            {item.images.length > 1 && (
                                <View style={styles.paginationDotsContainer}>
                                    {item.images.map((_, idx) => (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.paginationDot,
                                                currentImageIndex === idx && styles.activePaginationDot,
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : mainImage ? (
                        <AppImage source={{ uri: mainImage }} style={styles.image} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="image-outline" size={60} color={COLORS.gray} />
                        </View>
                    )}

                    {/* Back + action buttons overlay */}
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.iconButton} onPress={goBack}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
                        </TouchableOpacity>
                        <View style={styles.rightControls}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={24} color={COLORS.black} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleToggleFavorite}>
                                <Ionicons
                                    name={isFavorited ? 'heart' : 'heart-outline'}
                                    size={24}
                                    color={isFavorited ? COLORS.danger : COLORS.black}
                                />
                            </TouchableOpacity>
                            {!isSeller && (
                                <>
                                    <TouchableOpacity style={styles.iconButton} onPress={openPriceAlertModal}>
                                        <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconButton} onPress={handleBlockSeller}>
                                        <Ionicons name="ban-outline" size={24} color={COLORS.danger} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconButton} onPress={openReportModal}>
                                        <Ionicons name="flag-outline" size={24} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{item.name}</Text>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>RM {parseFloat(item.price || 0).toFixed(2)}</Text>
                        <View style={styles.gradeBadgeContainer}>
                            <GradeBadge grade={item.calculated_grade} />
                            <TouchableOpacity style={styles.infoIcon}>
                                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.socialProofRow}>
                        <View style={styles.viewCountBadge}>
                            <Ionicons name="eye-outline" size={14} color={COLORS.gray} style={styles.badgeIcon} />
                            <Text style={styles.viewCountText}>
                                {item.view_count || 1} {(item.view_count || 1) === 1 ? 'view' : 'views'}
                            </Text>
                        </View>
                        <View style={[styles.viewCountBadge, styles.ecoBadgeMargin]}>
                            <Ionicons name="leaf-outline" size={14} color={COLORS.success} style={styles.badgeIcon} />
                            <Text style={[styles.viewCountText, styles.ecoVerifiedText]}>Eco-Impact Verified</Text>
                        </View>
                    </View>

                    <View style={styles.ecoBanner}>
                        <View style={styles.ecoHeader}>
                            <Ionicons name="leaf" size={20} color={COLORS.ecoText} />
                            <Text style={styles.ecoTitle}>Sustainable Choice</Text>
                        </View>
                        <Text style={styles.ecoText}>
                            Buying this saved approximately {item.eco_impact || 10}kg of CO2.
                        </Text>
                        <View style={styles.sellerCard}>
                            <View style={styles.sellerAvatar}>
                                {item.seller_profile_picture ? (
                                    <AppImage source={{ uri: item.seller_profile_picture }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, styles.avatarPlaceholderBg]}>
                                        <Text style={styles.avatarText}>{firstInitial}</Text>
                                    </View>
                                )}
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                                </View>
                            </View>
                            <View style={styles.sellerInfo}>
                                <Text style={styles.sellerName}>{sellerName}</Text>
                                {item.seller_location ? (
                                    <View style={styles.sellerTagRow}>
                                        <Ionicons name="location-outline" size={12} color={COLORS.gray} style={styles.sellerTagIcon} />
                                        <Text style={styles.sellerTag}>
                                            {item.seller_location}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.sellerTag}>Conscious Neighbor</Text>
                                )}
                                <View style={styles.sellerTagRow}>
                                    <Ionicons name="time-outline" size={12} color={COLORS.gray} style={styles.sellerTagIcon} />
                                    <Text style={styles.sellerTag}>
                                        {item.seller_response_time || 'Usually replies within 2 hours'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.trustScoreContainer}>
                                <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
                                <Text style={styles.trustScoreText}>{item.seller_trust_score}% Trust</Text>
                            </View>
                        </View>

                        {/* Similar Items */}
                        {similarItems && similarItems.length > 0 && (
                            <View style={styles.similarItemsSection}>
                                <Text style={styles.similarItemsTitle}>Similar Items You May Like</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {similarItems.map(simItem => (
                                        <View key={simItem.id} style={styles.similarItemWrapper}>
                                            <ItemCard
                                                item={simItem}
                                                width={150}
                                                onPress={() => navigation.navigate('ItemDetail', { itemId: simItem.id })}
                                                isFavorite={favorites?.includes(simItem.id)}
                                                onToggleFavorite={() => toggleFavorite(simItem.id)}
                                            />
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <Text style={styles.sectionHeader}>CONDITION DISCLOSURE REPORT</Text>
                    {renderConditionSurvey()}

                    <Text style={styles.sectionHeader}>DESCRIPTION</Text>
                    <Text style={styles.description}>{item.description}</Text>

                    {!isSeller && (
                        <TouchableOpacity
                            style={styles.reportListingContainer}
                            onPress={openReportModal}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="flag-outline" size={14} color={COLORS.danger} style={styles.reportIcon} />
                            <Text style={styles.reportListingText}>Report listing as suspicious/scam</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Buyer footer */}
            {!isSeller && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.chatButton} onPress={goToChat}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.chatButtonText}>Chat with Seller</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.buyButton, (offering || item.is_sold) && styles.disabledBtn]}
                        onPress={handleMakeOffer}
                        disabled={offering || item.is_sold}
                    >
                        {offering ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buyButtonText}>
                                {item.is_sold ? 'Already Sold' : 'Make Offer'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Seller footer */}
            {isSeller && (
                <View style={styles.footer}>
                    {!item.is_sold ? (
                        <TouchableOpacity
                            style={[styles.soldButton, offering && styles.disabledBtn]}
                            onPress={handleMarkAsSold}
                            disabled={offering}
                        >
                            <Ionicons name="checkmark-circle-outline" size={18} color="white" style={styles.footerIcon} />
                            <Text style={styles.soldButtonText}>Sold</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.soldBanner}>
                            <Ionicons name="checkmark-done" size={18} color={COLORS.success} style={styles.footerIcon} />
                            <Text style={styles.soldBannerText}>Sold</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.editButton, offering && styles.disabledBtn]}
                        onPress={goToEdit}
                        disabled={offering}
                    >
                        <Ionicons name="create-outline" size={18} color="white" style={styles.footerIcon} />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, offering && styles.disabledBtn]}
                        onPress={handleDeleteListing}
                        disabled={offering}
                    >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={styles.footerIcon} />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScamReportModal
                visible={showReportModal}
                onClose={closeReportModal}
                item={item}
                sellerId={item.seller || item.seller_id}
                sellerName={sellerName}
            />

            {/* Price Alert Modal */}
            <Modal visible={showPriceAlertModal} animationType="slide" transparent>
                <View style={styles.priceOverlay}>
                    <View style={styles.priceModalContent}>
                        <View style={styles.priceModalHeader}>
                            <Text style={styles.priceModalTitle}>Set Price Alert</Text>
                            <TouchableOpacity onPress={closePriceAlertModal}>
                                <Ionicons name="close" size={24} color={COLORS.gray} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.priceModalLabel}>
                            Get notified when '{item.name}' drops below your target price:
                        </Text>
                        <View style={styles.priceAlertInputContainer}>
                            <Text style={styles.priceAlertCurrency}>RM</Text>
                            <TextInput
                                style={styles.priceAlertInput}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 75.00"
                                value={targetPrice}
                                onChangeText={setTargetPrice}
                            />
                        </View>
                        <TouchableOpacity style={styles.priceAlertSubmitBtn} onPress={handleSetPriceAlert}>
                            <Text style={styles.priceAlertSubmitBtnText}>Enable Alert</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
