// ExploreScreen displays a feed of available marketplace listings and sellers.
// It provides features for searching, category filtering, location/price filtering, and sorting.
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';
import CategoryChip from '../../components/CategoryChip';
import ItemCard from '../../components/ItemCard';
import { useMarket } from '../../context/MarketContext';
import api from '../../api/client';
import { FeedCardSkeleton, SellerRowSkeleton } from '../../components/SkeletonLoader';
import EmptyState from '../../components/EmptyState';
import { FilterModal } from '../../components/modals/FilterModal';
import { EcoLeaderboardModal } from '../../components/modals/EcoLeaderboardModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './styles/ExploreScreenStyles';

// Location list is static data — defined once outside the component.
const LOCATIONS = ['All', 'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Melaka', 'Sarawak', 'Sabah'];

// Maximum number of recent searches to persist.
const MAX_RECENT_SEARCHES = 5;

// Header gradient colours — stable array to avoid unnecessary LinearGradient re-renders.
const HEADER_GRADIENT = [COLORS.primary, '#00421e'];
const HEADER_GRADIENT_START = { x: 0, y: 0 };
const HEADER_GRADIENT_END   = { x: 1, y: 1 };

// Compute Levenshtein distance for spell-check suggestions.
// Pure function — defined at module level so it is not re-created on each render.
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

export const ExploreScreen = ({ navigation }) => {
    const { items, categories, favorites, refreshMarket, toggleFavorite, loading: loadingItems } = useMarket();

    const [activeTab, setActiveTab]               = useState('Items');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery]           = useState('');
    const [searchSuggestion, setSearchSuggestion] = useState('');

    // Filter modal state — temp values are only committed on "Apply"
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocation, setSelectedLocation]   = useState('All');
    const [minPrice, setMinPrice]                   = useState('');
    const [maxPrice, setMaxPrice]                   = useState('');
    const [tempLocation, setTempLocation]           = useState('All');
    const [minPriceInput, setMinPriceInput]         = useState('');
    const [maxPriceInput, setMaxPriceInput]         = useState('');

    const [userResults, setUserResults]           = useState([]);
    const [loadingUsers, setLoadingUsers]         = useState(false);
    const [refreshing, setRefreshing]             = useState(false);
    const [recentSearches, setRecentSearches]     = useState([]);
    const [sortBy, setSortBy]                     = useState('newest');
    const [showEcoLeaderboard, setShowEcoLeaderboard] = useState(false);
    const [ecoLeaderboardData, setEcoLeaderboardData] = useState([]);
    const [loadingEco, setLoadingEco]             = useState(false);

    // Retrieve locally saved search history from storage to pre-populate recent search chips.
    const loadRecentSearches = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem('recent_searches');
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch {}
    }, []);

    useEffect(() => {
        loadRecentSearches();
    }, [loadRecentSearches]);

    // Sync temp filter values when the filter modal opens.
    useEffect(() => {
        if (showLocationModal) {
            setTempLocation(selectedLocation);
            setMinPriceInput(minPrice);
            setMaxPriceInput(maxPrice);
        }
    }, [showLocationModal]);

    const handleApplyFilters = useCallback(() => {
        setSelectedLocation(tempLocation);
        setMinPrice(minPriceInput);
        setMaxPrice(maxPriceInput);
        setShowLocationModal(false);
    }, [tempLocation, minPriceInput, maxPriceInput]);

    const handleResetFilters = useCallback(() => {
        setTempLocation('All');
        setMinPriceInput('');
        setMaxPriceInput('');
        setSelectedLocation('All');
        setMinPrice('');
        setMaxPrice('');
        setShowLocationModal(false);
    }, []);

    // Fetch the eco leaderboard metrics to show users sorted by carbon savings.
    const handleOpenEcoLeaderboard = useCallback(async () => {
        setShowEcoLeaderboard(true);
        setLoadingEco(true);
        try {
            const res = await api.get('profiles/eco_leaderboard/');
            setEcoLeaderboardData(res.data);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not load ECO Leaderboard.');
        } finally {
            setLoadingEco(false);
        }
    }, []);

    const saveSearchQuery = useCallback(async (query) => {
        if (!query || !query.trim()) return;
        const trimmed = query.trim();
        try {
            const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch {}
    }, [recentSearches]);

    const removeRecentSearch = useCallback(async (query) => {
        try {
            const updated = recentSearches.filter(s => s !== query);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch {}
    }, [recentSearches]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshMarket();
        if (activeTab === 'Users') {
            try {
                const res = await api.get(`profiles/?search=${searchQuery}`);
                setUserResults(res.data.results || res.data);
            } catch {}
        }
        setRefreshing(false);
    }, [activeTab, searchQuery, refreshMarket]);

    useFocusEffect(
        useCallback(() => {
            refreshMarket();
        }, [refreshMarket])
    );

    // Perform a debounced seller lookup to avoid triggering redundant API requests on fast typists.
    useEffect(() => {
        if (activeTab !== 'Users') return;
        const searchUsers = async () => {
            setLoadingUsers(true);
            try {
                const res = await api.get(`profiles/?search=${searchQuery}`);
                setUserResults(res.data.results || res.data);
            } catch (err) {
                console.error('User Search Error:', err.message);
            } finally {
                setLoadingUsers(false);
            }
        };
        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, activeTab]);

    const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

    // Greeting derived at render time — stable enough as a non-memoised expression.
    const greeting = (() => {
        const hr = new Date().getHours();
        if (hr < 12) return 'Good morning';
        if (hr < 17) return 'Good afternoon';
        if (hr < 22) return 'Good evening';
        return 'Happy night hunting';
    })();

    // Filter and sort the marketplace listings based on query, price bounds, location, and sort order.
    const sortedItems = useMemo(() => {
        const filtered = items.filter(item => {
            if (item.is_sold) return false;
            const matchesCategory = !selectedCategory || item.category === selectedCategory;
            const lowerQuery = searchQuery.toLowerCase();
            const matchesSearch =
                item.name.toLowerCase().includes(lowerQuery) ||
                item.description.toLowerCase().includes(lowerQuery);
            const matchesLocation =
                selectedLocation === 'All' ||
                (item.seller_location &&
                    item.seller_location.toLowerCase().includes(selectedLocation.toLowerCase()));
            const matchesMinPrice = !minPrice || parseFloat(item.price) >= parseFloat(minPrice);
            const matchesMaxPrice = !maxPrice || parseFloat(item.price) <= parseFloat(maxPrice);
            return matchesCategory && matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'price_asc')  return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
            if (sortBy === 'price_desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
            if (sortBy === 'trusted_seller') {
                const scoreA = parseFloat(a.seller_trust_score) || (a.seller && a.seller.trust_score) || 0;
                const scoreB = parseFloat(b.seller_trust_score) || (b.seller && b.seller.trust_score) || 0;
                return scoreB - scoreA;
            }
            // Default: newest first
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
    }, [items, selectedCategory, searchQuery, selectedLocation, minPrice, maxPrice, sortBy]);

    // Derive "did you mean" suggestion from the Levenshtein algorithm.
    useEffect(() => {
        if (sortedItems.length === 0 && searchQuery.trim().length > 0) {
            let bestMatch = null;
            let minDistance = Infinity;
            items.filter(item => !item.is_sold).forEach(item => {
                item.name.toLowerCase().split(' ').forEach(word => {
                    const dist = levenshteinDistance(searchQuery.toLowerCase().trim(), word);
                    if (dist <= 2 && dist < minDistance) {
                        minDistance = dist;
                        bestMatch = item.name;
                    }
                });
            });
            setSearchSuggestion(bestMatch ? `Did you mean: ${bestMatch}?` : '');
        } else {
            setSearchSuggestion('');
        }
    }, [sortedItems, searchQuery, items]);

    // Stable renderItem callbacks so FlatList doesn't re-render every row on parent updates.
    const renderItemCard = useCallback(({ item }) => (
        <ItemCard
            item={item}
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
            onToggleFavorite={toggleFavorite}
            isFavorite={favoritesSet.has(item.id)}
        />
    ), [favoritesSet, navigation, toggleFavorite]);

    const keyExtractorItem = useCallback(item => item.id.toString(), []);
    const keyExtractorUser = useCallback(item => item.id.toString(), []);

    // Stable tab-switch handlers.
    const switchToItems = useCallback(() => { setActiveTab('Items'); setSearchQuery(''); }, []);
    const switchToUsers = useCallback(() => { setActiveTab('Users'); setSearchQuery(''); }, []);
    const openFilterModal = useCallback(() => setShowLocationModal(true), []);
    const closeFilterModal = useCallback(() => setShowLocationModal(false), []);
    const closeEcoModal = useCallback(() => setShowEcoLeaderboard(false), []);
    const navigateForYou = useCallback(() => navigation.navigate('For You'), [navigation]);

    const handleSuggestionPress = useCallback(() => {
        setSearchQuery(searchSuggestion.replace('Did you mean: ', '').replace('?', ''));
    }, [searchSuggestion]);

    const clearAllFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedLocation('All');
    }, []);

    const clearSearch = useCallback(() => setSearchQuery(''), []);

    const handleSearchSubmit = useCallback(() => saveSearchQuery(searchQuery), [saveSearchQuery, searchQuery]);

    // Memoised user card render function — avoids inline arrow in FlatList.
    const renderUserItem = useCallback(({ item }) => {
        const isHighlyTrusted = item.trust_score >= 80;
        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => navigation.navigate('UserProfile', { userId: item.user || item.id })}
            >
                <View>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userInitial}>{item.username?.[0]?.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.usernameText}>{item.username}</Text>
                    <View style={styles.userMeta}>
                        <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                        <Text style={styles.trustScoreText}>Trust Score: {item.trust_score}%</Text>
                        {isHighlyTrusted && (
                            <View style={styles.trustedBadge}>
                                <Text style={styles.trustedBadgeText}>Trusted</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
        );
    }, [navigation]);

    // Derived boolean — whether any filter is active.
    const isFilterActive = selectedLocation !== 'All' || !!minPrice || !!maxPrice;

    // Memoised ListHeaderComponent so FlatList doesn't recreate it on every render.
    const ItemsListHeader = useMemo(() => (
        <View>
            <View style={styles.sortContainer}>
                <Text style={styles.sortTitle}>Sort:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortList}>
                    {[
                        { key: 'newest',       label: 'Newest' },
                        { key: 'price_asc',    label: 'Price: Low - High' },
                        { key: 'price_desc',   label: 'Price: High - Low' },
                        { key: 'trusted_seller', label: 'Trusted Seller' },
                    ].map(({ key, label }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.sortChip, sortBy === key && styles.activeSortChip]}
                            onPress={() => setSortBy(key)}
                        >
                            <Text style={[styles.sortChipText, sortBy === key && styles.activeSortChipText]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    {searchQuery ? `Search results for "${searchQuery}"` : 'Curated For You'}
                </Text>
                <Text style={styles.sectionSubtitle}>{sortedItems.length} items found</Text>
            </View>
            {searchSuggestion ? (
                <TouchableOpacity onPress={handleSuggestionPress} style={styles.suggestionRow}>
                    <Text style={styles.suggestionText}>{searchSuggestion}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    ), [sortBy, searchQuery, sortedItems.length, searchSuggestion, handleSuggestionPress]);

    const UsersListHeader = useMemo(() => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Marketplace Community</Text>
            <Text style={styles.sectionSubtitle}>{userResults.length} members found</Text>
        </View>
    ), [userResults.length]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={HEADER_GRADIENT}
                start={HEADER_GRADIENT_START}
                end={HEADER_GRADIENT_END}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>{greeting},</Text>
                        <Text style={styles.logoText}>My Preloved</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.iconCircle, styles.ecoIconCircle]}
                            onPress={handleOpenEcoLeaderboard}
                        >
                            <Ionicons name="leaf" size={20} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconCircle} onPress={navigateForYou}>
                            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === 'Items' ? 'Search items...' : 'Search usernames...'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={COLORS.gray}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.tabToggle}>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'Items' && styles.activeToggle]}
                    onPress={switchToItems}
                >
                    <Text style={[styles.toggleText, activeTab === 'Items' && styles.activeToggleText]}>Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'Users' && styles.activeToggle]}
                    onPress={switchToUsers}
                >
                    <Text style={[styles.toggleText, activeTab === 'Users' && styles.activeToggleText]}>Sellers</Text>
                </TouchableOpacity>

                {activeTab === 'Items' && (
                    <TouchableOpacity
                        style={[styles.toggleBtn, isFilterActive && styles.activeToggle, styles.filterToggleBtn]}
                        onPress={openFilterModal}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="funnel-outline"
                            size={14}
                            color={isFilterActive ? 'white' : COLORS.gray}
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.toggleText, isFilterActive && styles.activeToggleText]}>
                            {isFilterActive ? 'Filters Active' : 'Filters'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Recent search chips — only shown when search is empty */}
            {recentSearches.length > 0 && !searchQuery && (
                <View style={styles.recentSearchesContainer}>
                    <Text style={styles.recentTitle}>Recent:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                        {recentSearches.map((s, idx) => (
                            <View key={idx} style={styles.recentChip}>
                                <TouchableOpacity onPress={() => setSearchQuery(s)} style={styles.recentChipInner}>
                                    <Ionicons name="time-outline" size={12} color={COLORS.gray} style={styles.recentChipIcon} />
                                    <Text style={styles.recentChipText}>{s}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeRecentSearch(s)} style={styles.recentChipRemove}>
                                    <Ionicons name="close" size={14} color={COLORS.gray} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {activeTab === 'Items' ? (
                <>
                    <View style={styles.categoryContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                            <CategoryChip
                                name="All"
                                active={selectedCategory === null}
                                onPress={() => setSelectedCategory(null)}
                            />
                            {categories.map(cat => (
                                <CategoryChip
                                    key={cat.id}
                                    name={cat.name}
                                    icon={cat.icon_name}
                                    active={selectedCategory === cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {loadingItems ? (
                        <View style={styles.skeletonGrid}>
                            <FeedCardSkeleton />
                            <FeedCardSkeleton />
                            <FeedCardSkeleton />
                            <FeedCardSkeleton />
                            <FeedCardSkeleton />
                            <FeedCardSkeleton />
                        </View>
                    ) : (
                        <FlatList
                            data={sortedItems}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                            }
                            renderItem={renderItemCard}
                            keyExtractor={keyExtractorItem}
                            numColumns={2}
                            columnWrapperStyle={styles.columnWrapper}
                            contentContainerStyle={styles.itemList}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            initialNumToRender={6}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            removeClippedSubviews={true}
                            getItemLayout={(_, index) => ({
                                length: 275,
                                offset: 275 * Math.floor(index / 2),
                                index,
                            })}
                            ListHeaderComponent={ItemsListHeader}
                            ListEmptyComponent={
                                <EmptyState
                                    icon="search-outline"
                                    title="No Listings Found"
                                    description="We couldn't find any items matching your filters or search query. Try resetting your search."
                                    actionText="Clear All Filters"
                                    onActionPress={clearAllFilters}
                                />
                            }
                        />
                    )}
                </>
            ) : (
                <View style={styles.usersTabContainer}>
                    {loadingUsers ? (
                        <View style={styles.skeletonList}>
                            <SellerRowSkeleton />
                            <SellerRowSkeleton />
                            <SellerRowSkeleton />
                            <SellerRowSkeleton />
                        </View>
                    ) : (
                        <FlatList
                            data={userResults}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                            }
                            renderItem={renderUserItem}
                            keyExtractor={keyExtractorUser}
                            contentContainerStyle={styles.userList}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            ListHeaderComponent={UsersListHeader}
                            ListEmptyComponent={
                                <EmptyState
                                    icon="people-outline"
                                    title="All Quiet in the Community"
                                    description="No sellers match your search query. Try checking again with a different name."
                                    actionText="Clear Search"
                                    onActionPress={clearSearch}
                                />
                            }
                        />
                    )}
                </View>
            )}

            <FilterModal
                visible={showLocationModal}
                onClose={closeFilterModal}
                locations={LOCATIONS}
                tempLocation={tempLocation}
                setTempLocation={setTempLocation}
                minPriceInput={minPriceInput}
                setMinPriceInput={setMinPriceInput}
                maxPriceInput={maxPriceInput}
                setMaxPriceInput={setMaxPriceInput}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            />

            <EcoLeaderboardModal
                visible={showEcoLeaderboard}
                onClose={closeEcoModal}
                loadingEco={loadingEco}
                ecoLeaderboardData={ecoLeaderboardData}
            />
        </View>
    );
};
