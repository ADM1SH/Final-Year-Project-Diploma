/**
 * Custom hook to handle loading, updating, sharing, and reporting of individual item listings.
 * Manages item details, price alerts, favorites toggling, block requests, and similar item retrievals.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Share } from "react-native";
import api from "../api/client";
import { useMarket } from "../context/MarketContext";

export const useItemDetails = (routeItemId, currentUser, navigation) => {
    const itemId = routeItemId ? parseInt(routeItemId, 10) : null;
    const { favorites, toggleFavorite, refreshMarket } = useMarket();

    const [item, setItem] = useState(null);
    const [similarItems, setSimilarItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offering, setOffering] = useState(false);
    const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
    const [targetPrice, setTargetPrice] = useState("");
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showReportModal, setShowReportModal] = useState(false);

    // Guard against setting state after the consuming screen has unmounted
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!itemId) return;

        // AbortController cancels the in-flight request if itemId changes before
        // the fetch resolves (e.g. rapid navigation) or the screen unmounts.
        const controller = new AbortController();

        const fetchItem = async () => {
            try {
                // Fetch primary item details and its corresponding similar recommendations
                const res = await api.get(`items/${itemId}/`, {
                    signal: controller.signal,
                });
                if (!isMounted.current) return;
                setItem(res.data);

                try {
                    const simRes = await api.get(`items/${itemId}/similar/`, {
                        signal: controller.signal,
                    });
                    if (isMounted.current) setSimilarItems(simRes.data);
                } catch (e) {
                    if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
                    console.warn("Error fetching similar items:", e.message);
                }
            } catch (e) {
                if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
                console.error("Fetch Item Error:", e.message);
                if (isMounted.current) setItem(null);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        fetchItem();
        return () => controller.abort();
    }, [itemId]);

    // isFavorited is derived state — computed from context, no need for useState
    const isFavorited = favorites.includes(itemId);

    const handleMakeOffer = useCallback(() => {
        navigation.navigate("Checkout", { item });
    }, [navigation, item]);

    const handleMarkAsSold = useCallback(() => {
        Alert.alert(
            "Mark as Sold",
            "Are you sure you want to mark this item as sold? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Mark as Sold",
                    onPress: async () => {
                        try {
                            setOffering(true);
                            // Update item status to sold and trigger market feed refresh
                            await api.patch(`items/${itemId}/`, { is_sold: true });
                            if (isMounted.current) {
                                setItem((prev) => ({ ...prev, is_sold: true }));
                            }
                            refreshMarket();
                            Alert.alert("Success", "Listing marked as sold.");
                        } catch (err) {
                            Alert.alert("Error", "Could not update listing.");
                        } finally {
                            if (isMounted.current) setOffering(false);
                        }
                    },
                },
            ],
        );
    }, [itemId, refreshMarket]);

    const handleDeleteListing = useCallback(() => {
        Alert.alert(
            "Delete Listing",
            "Are you sure you want to delete this listing permanently?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setOffering(true);
                            // Delete the item listing and navigate back to the home screen
                            await api.delete(`items/${itemId}/`);
                            refreshMarket();
                            Alert.alert("Success", "Listing deleted.", [
                                {
                                    text: "OK",
                                    onPress: () => navigation.goBack(),
                                },
                            ]);
                        } catch (err) {
                            Alert.alert("Error", "Could not delete listing.");
                        } finally {
                            if (isMounted.current) setOffering(false);
                        }
                    },
                },
            ],
        );
    }, [itemId, navigation, refreshMarket]);

    const handleShare = useCallback(async () => {
        if (!item) return;
        try {
            // Format item summary message and trigger native share dialog
            const message = `Check out this great secondhand find on My Preloved!\n\n📦 Item: ${item.name}\n💰 Price: RM ${parseFloat(item.price || 0).toFixed(2)}\n🌱 Eco-Impact: Saves ${item.eco_impact || 10}kg of CO2!\n\nView listing: mypreloved://item/${item.id}`;
            await Share.share({ message, title: item.name });
        } catch (error) {
            console.warn("Error sharing item:", error.message);
        }
    }, [item]);

    const handleSetPriceAlert = useCallback(async () => {
        if (!targetPrice || parseFloat(targetPrice) <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid price threshold.");
            return;
        }
        try {
            // Register a new price threshold notification alert on the server
            await api.post("price-alerts/", {
                item: item.id,
                target_price: parseFloat(targetPrice),
            });
            Alert.alert(
                "Price Alert Set",
                `We'll notify you if this item's price drops to or below RM ${parseFloat(targetPrice).toFixed(2)}.`,
            );
            if (isMounted.current) {
                setShowPriceAlertModal(false);
                setTargetPrice("");
            }
        } catch (err) {
            Alert.alert(
                "Error",
                err.response?.data?.error ||
                    "Could not set price alert. Check if you already set one for this item.",
            );
        }
    }, [item, targetPrice]);

    const handleBlockSeller = useCallback(() => {
        if (!item) return;
        const sellerId = item.seller?.id || item.seller;
        const sellerName =
            item.seller?.username || item.seller_name || "Anonymous";
        Alert.alert(
            "Block Seller",
            `Are you sure you want to block ${sellerName}? Their listings will no longer appear in your feed.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Block the seller from user's feeds and return to main screen
                            await api.post("blocks/", { blocked: sellerId });
                            Alert.alert("Blocked", `${sellerName} has been blocked.`);
                            navigation.navigate("MainTabs", { screen: "For You" });
                            refreshMarket();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                "Could not block user. They might be blocked already.",
                            );
                        }
                    },
                },
            ],
        );
    }, [item, navigation, refreshMarket]);

    return {
        item,
        loading,
        offering,
        showPriceAlertModal,
        setShowPriceAlertModal,
        targetPrice,
        setTargetPrice,
        currentImageIndex,
        setCurrentImageIndex,
        showReportModal,
        setShowReportModal,
        isFavorited,
        toggleFavorite,
        handleMarkAsSold,
        handleDeleteListing,
        handleMakeOffer,
        handleShare,
        handleSetPriceAlert,
        handleBlockSeller,
        similarItems,
    };
};
