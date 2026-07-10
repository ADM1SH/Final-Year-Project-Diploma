/**
 * Custom hook to manage profile details, user stats, wallet transactions, and bundle deals.
 * Provides functions for profile updates, wallet top-ups, listing deletion, and verification submissions.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../api/client";

export const useProfileData = (
    targetUserId,
    isPublicProfile,
    currentUser,
    refreshMarket,
    navigation,
) => {
    const [profileData, setProfileData] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("Listings");
    const [stripeBalance, setStripeBalance] = useState({ available: 0, pending: 0 });
    const [bundles, setBundles] = useState([]);
    const [showBundleModal, setShowBundleModal] = useState(false);
    const [bundleName, setBundleName] = useState("");
    const [bundlePrice, setBundlePrice] = useState("");
    const [selectedBundleItems, setSelectedBundleItems] = useState([]);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showTrustModal, setShowTrustModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);
    const [pastReviews, setPastReviews] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);

    // Guard against calling setState after the screen unmounts
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Guards handleCompleteSale against firing twice in quick succession
    // (double-tap on the confirm alert, slow network + repeat tap, etc.). The
    // server is race-safe too (see release_funds in transaction_views.py), but
    // this avoids a pointless duplicate request from the client as well.
    const releasingFundsRef = useRef(false);

    // fetchProfileData accepts an optional AbortSignal so that in-flight requests
    // are cancelled when the screen loses focus or the hook re-runs.
    const fetchProfileData = useCallback(
        async (signal) => {
            if (isMounted.current) setLoading(true);
            try {
                const profileUrl = isPublicProfile
                    ? `profiles/${targetUserId}/`
                    : "profiles/me/";
                const statsUrl = isPublicProfile
                    ? `profiles/${targetUserId}/user_stats/`
                    : "profiles/me/user_stats/";

                // Fetch profile, stats, transactions, reviews, wallet history, and bundles concurrently
                const [
                    profileRes,
                    statsRes,
                    transRes,
                    reviewRes,
                    bundlesRes,
                    stripeRes,
                ] = await Promise.all([
                    api.get(profileUrl, { signal }),
                    api.get(statsUrl, { signal }),
                    isPublicProfile
                        ? Promise.resolve({ data: [] })
                        : api.get("transactions/", { signal }),
                    api.get(`reviews/?seller=${targetUserId}`, { signal }),
                    api.get(`bundles/?seller_id=${targetUserId}`, { signal }),
                    isPublicProfile
                        ? Promise.resolve({ data: { available: 0, pending: 0 } })
                        : api.get("profiles/me/stripe_balance/", { signal }),
                ]);

                if (!isMounted.current) return;
                setProfileData(profileRes.data);
                setUserStats(statsRes.data);
                setTransactions(transRes.data.results || transRes.data);
                setPastReviews(reviewRes.data.results || reviewRes.data);
                setBundles(bundlesRes.data || []);
                if (!isPublicProfile) {
                    setStripeBalance(stripeRes.data);
                }
            } catch (err) {
                // Ignore intentional aborts (screen blur / unmount)
                if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
                console.error("Fetch Profile Error:", err.message);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        },
        // Stable deps: targetUserId and isPublicProfile are primitives that only change
        // when the screen genuinely navigates to a different profile.
        [targetUserId, isPublicProfile],
    );

    // useFocusEffect re-runs when the screen gains focus.  An AbortController
    // guarantees that any pending request is cancelled when focus is lost,
    // preventing stale data from landing after the user navigates away and back.
    useFocusEffect(
        useCallback(() => {
            const controller = new AbortController();

            fetchProfileData(controller.signal);
            refreshMarket();

            // Poll while the screen is focused; stop immediately on blur.
            // Use setTimeout recursively to prevent stacking if requests take longer than the interval.
            let timeoutId;
            const poll = async () => {
                if (!controller.signal.aborted) {
                    await Promise.all([
                        fetchProfileData(controller.signal),
                        refreshMarket()
                    ]);
                    timeoutId = setTimeout(poll, 10000);
                }
            };
            
            timeoutId = setTimeout(poll, 10000);

            return () => {
                clearTimeout(timeoutId);
                controller.abort();
            };
        }, [fetchProfileData, refreshMarket]),
    );

    const onRefresh = useCallback(async () => {
        if (isMounted.current) setRefreshing(true);
        await Promise.all([fetchProfileData(), refreshMarket()]);
        if (isMounted.current) setRefreshing(false);
    }, [fetchProfileData, refreshMarket]);

    const handleOpenEditModal = useCallback(() => {
        setShowEditModal(true);
    }, []);

    const handleSaveProfile = useCallback(
        async (location, phone, bio, profilePicture) => {
            try {
                // Prepare multipart form data for profile information and profile picture upload
                const data = new FormData();
                data.append("bio", bio);
                data.append("location", location);
                data.append("phone_number", phone);

                if (profilePicture) {
                    const cleanUri =
                        Platform.OS === "ios"
                            ? profilePicture.replace("file://", "")
                            : profilePicture;
                    data.append("profile_picture", {
                        uri:
                            Platform.OS === "android" &&
                            !cleanUri.startsWith("file://")
                                ? `file://${cleanUri}`
                                : cleanUri,
                        name: "profile.jpg",
                        type: "image/jpeg",
                    });
                }

                const res = await api.patch("profiles/me/", data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                if (!isMounted.current) return;
                setProfileData(res.data);
                setShowEditModal(false);
                Alert.alert("Success", "Profile updated successfully!");
                // Re-fetch to sync any server-side transformations (e.g. thumbnail generation)
                fetchProfileData();
            } catch (e) {
                console.error("Save Profile Error:", e.message);
                Alert.alert("Error", "Could not update profile. Please try again.");
            }
        },
        [fetchProfileData],
    );


    const handleCompleteSale = useCallback(
        async (transactionId) => {
            if (releasingFundsRef.current) return;
            releasingFundsRef.current = true;
            try {
                // Update transaction status by releasing escrowed Stripe funds
                await api.post(`transactions/${transactionId}/release-funds/`);
                Alert.alert(
                    "Success",
                    "Item received! Funds have been released to the seller.",
                );
                fetchProfileData();
            } catch (e) {
                console.error("Complete Sale Error:", e.message);
                const errorMsg =
                    e.response?.data?.error ||
                    e.response?.data?.status?.[0] ||
                    e.response?.data?.non_field_errors?.[0] ||
                    "Could not release funds.";
                Alert.alert("Error", errorMsg);
            } finally {
                releasingFundsRef.current = false;
            }
        },
        [fetchProfileData],
    );

    const handleReportSeller = useCallback(async () => {
        if (!reportReason) {
            Alert.alert("Error", "Please provide a reason.");
            return;
        }

        if (isMounted.current) setReporting(true);
        try {
            // File a scam report against the targeted user
            await api.post("scam-reports/", {
                reported_user: targetUserId,
                reason: reportReason,
            });
            Alert.alert(
                "Report Filed",
                "Thank you for helping keep MyPreLove safe. Our admins will review this.",
            );
            if (isMounted.current) {
                setShowReportModal(false);
                setReportReason("");
            }
        } catch (e) {
            console.error("Report Error Details:", e.message);
            Alert.alert("Error", "Could not file report. Please try again.");
        } finally {
            if (isMounted.current) setReporting(false);
        }
    }, [targetUserId, reportReason]);

    const confirmMarkAsSold = useCallback(
        (itemId) => {
            Alert.alert(
                "Mark as Sold",
                "Are you sure you want to mark this item as sold? This cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Yes, Mark as Sold",
                        onPress: async () => {
                            try {
                                // Mark the selected listing as sold and refresh market feed
                                await api.patch(`items/${itemId}/`, { is_sold: true });
                                Alert.alert("Success", "Listing marked as sold.");
                                refreshMarket();
                                fetchProfileData();
                            } catch (err) {
                                Alert.alert("Error", "Could not update listing.");
                            }
                        },
                    },
                ],
            );
        },
        [fetchProfileData, refreshMarket],
    );

    const confirmDeleteListing = useCallback(
        (itemId) => {
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
                                // Delete listing permanently from the database
                                await api.delete(`items/${itemId}/`);
                                Alert.alert("Success", "Listing deleted.");
                                refreshMarket();
                                fetchProfileData();
                            } catch (err) {
                                Alert.alert("Error", "Could not delete listing.");
                            }
                        },
                    },
                ],
            );
        },
        [fetchProfileData, refreshMarket],
    );

    const handleItemLongPress = useCallback(
        (item) => {
            if (isPublicProfile) return;

            Alert.alert(
                "Manage Listing",
                `Choose an option for "${item.name}":`,
                [
                    { text: "Cancel", style: "cancel" },
                    !item.is_sold
                        ? {
                              text: "Edit Listing",
                              onPress: () =>
                                  navigation.navigate("Sell", { item }),
                          }
                        : null,
                    !item.is_sold
                        ? {
                              text: "Mark as Sold",
                              onPress: () => confirmMarkAsSold(item.id),
                          }
                        : null,
                    {
                        text: "Delete Permanently",
                        style: "destructive",
                        onPress: () => confirmDeleteListing(item.id),
                    },
                ].filter(Boolean),
            );
        },
        [isPublicProfile, navigation, confirmMarkAsSold, confirmDeleteListing],
    );

    const handleRequestVerification = useCallback(async () => {
        try {
            const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission Denied",
                    "We need camera roll permissions to upload your document!",
                );
                return;
            }

            // Submit verification document image for profile verification request
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const docUri = result.assets[0].uri;
            const data = new FormData();
            const cleanUri =
                Platform.OS === "ios" ? docUri.replace("file://", "") : docUri;
            data.append("verification_document", {
                uri:
                    Platform.OS === "android" &&
                    !cleanUri.startsWith("file://")
                        ? `file://${cleanUri}`
                        : cleanUri,
                name: "verification_doc.jpg",
                type: "image/jpeg",
            });

            Alert.alert("Uploading", "Uploading verification document...");
            await api.post("profiles/me/request_verification/", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            Alert.alert(
                "Request Submitted",
                "Your request for profile verification has been submitted successfully!",
            );
        } catch (e) {
            console.error("Verification Request Error:", e.message);
            Alert.alert(
                "Error",
                "Could not submit verification request. Please try again.",
            );
        }
    }, []);

    const handleCreateBundle = useCallback(async () => {
        if (
            !bundleName.trim() ||
            !bundlePrice.trim() ||
            selectedBundleItems.length < 2
        ) {
            Alert.alert(
                "Invalid Input",
                "Please provide a name, price, and select at least 2 items.",
            );
            return;
        }
        try {
            if (isMounted.current) setLoading(true);
            // Create a bundle deal listing for the selected items
            await api.post("bundles/", {
                name: bundleName,
                price: parseFloat(bundlePrice),
                items: selectedBundleItems,
            });
            Alert.alert("Success", "Bundle Deal created successfully!");
            if (isMounted.current) {
                setShowBundleModal(false);
                setBundleName("");
                setBundlePrice("");
                setSelectedBundleItems([]);
            }
            fetchProfileData();
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not create bundle deal.");
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [bundleName, bundlePrice, selectedBundleItems, fetchProfileData]);

    const handleDeleteBundle = useCallback(
        (bundleId) => {
            Alert.alert(
                "Delete Bundle Deal",
                "Are you sure you want to delete this bundle deal? The individual items will remain listed.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                if (isMounted.current) setLoading(true);
                                await api.delete(`bundles/${bundleId}/`);
                                Alert.alert("Success", "Bundle Deal deleted.");
                                fetchProfileData();
                            } catch (err) {
                                console.error(err);
                                Alert.alert("Error", "Could not delete bundle deal.");
                            } finally {
                                if (isMounted.current) setLoading(false);
                            }
                        },
                    },
                ],
            );
        },
        [fetchProfileData],
    );

    const handleBuyBundle = useCallback(
        (bundle) => {
            Alert.alert(
                "Confirm Purchase",
                `Would you like to buy the bundle "${bundle.name}" for RM ${parseFloat(bundle.price).toFixed(2)}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Buy Now",
                        onPress: async () => {
                            try {
                                if (isMounted.current) setLoading(true);
                                // Concurrently send purchase transactions for each item in the bundle
                                const pricePerItem = (
                                    parseFloat(bundle.price) / bundle.items.length
                                ).toFixed(2);
                                
                                const purchasePromises = bundle.items.map(itemId => 
                                    api.post("transactions/", {
                                        item: itemId,
                                        offer_price: parseFloat(pricePerItem),
                                        payment_method: "STRIPE",
                                    })
                                );
                                
                                await Promise.all(purchasePromises);
                                Alert.alert(
                                    "Success",
                                    "Bundle Deal purchased! Offers sent to the seller.",
                                );
                                fetchProfileData();
                            } catch (err) {
                                console.error(err);
                                Alert.alert(
                                    "Error",
                                    err.response?.data?.error ||
                                        "Could not complete bundle purchase. Check your wallet balance.",
                                );
                            } finally {
                                if (isMounted.current) setLoading(false);
                            }
                        },
                    },
                ],
            );
        },
        [fetchProfileData],
    );

    const toggleSelectBundleItem = useCallback((itemId) => {
        // Use functional updater to avoid closing over a stale selectedBundleItems snapshot
        setSelectedBundleItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId],
        );
    }, []);

    return {
        profileData,
        setProfileData,
        userStats,
        transactions,
        loading,
        setLoading,
        refreshing,
        setRefreshing,
        activeTab,
        setActiveTab,
        bundles,
        stripeBalance,
        showBundleModal,
        setShowBundleModal,
        bundleName,
        setBundleName,
        bundlePrice,
        setBundlePrice,
        selectedBundleItems,
        setSelectedBundleItems,
        showReviewModal,
        setShowReviewModal,
        selectedTransaction,
        setSelectedTransaction,
        showTrustModal,
        setShowTrustModal,
        showReceiptModal,
        setShowReceiptModal,
        showReportModal,
        setShowReportModal,
        reportReason,
        setReportReason,
        reporting,
        setReporting,
        pastReviews,
        showEditModal,
        setShowEditModal,
        onRefresh,
        handleOpenEditModal,
        handleSaveProfile,
        handleCompleteSale,
        handleReportSeller,
        handleItemLongPress,
        confirmMarkAsSold,
        confirmDeleteListing,
        handleRequestVerification,
        fetchProfileData,
        handleCreateBundle,
        handleDeleteBundle,
        handleBuyBundle,
        toggleSelectBundleItem,
    };
};
