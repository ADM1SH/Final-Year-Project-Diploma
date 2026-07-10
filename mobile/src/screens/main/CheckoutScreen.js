/**
 * CheckoutScreen component that handles buyer offer submissions.
 * Supports escrow payment method verification and coordinates the final checkout proposal to the backend.
 */
import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/constants";
import api from "../../api/client";
import { useStripe } from '@stripe/stripe-react-native';

export const CheckoutScreen = ({ route, navigation }) => {
    const { item, existingTransactionId, initialPrice } = route.params;
    const [offerPrice, setOfferPrice] = useState(initialPrice ? initialPrice.toString() : item.price.toString());
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {};

    const handleConfirmOffer = async () => {
        if (!offerPrice || parseFloat(offerPrice) <= 0) {
            Alert.alert("Error", "Please enter a valid price.");
            return;
        }

        try {
            setLoading(true);
            // 1. Create Transaction (if not already existing)
            let txId = existingTransactionId;
            if (!txId) {
                const txResponse = await api.post("transactions/", {
                    item: item.id,
                    offer_price: parseFloat(offerPrice),
                    payment_method: 'STRIPE',
                });
                txId = txResponse.data.id;
            }

            // 2. Fetch Payment Intent Client Secret
            const piResponse = await api.post(`transactions/${txId}/create-payment-intent/`);
            const clientSecret = piResponse.data.client_secret;

            // 3. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'My Preloved Marketplace',
                paymentIntentClientSecret: clientSecret,
                allowsDelayedPaymentMethods: true,
                returnURL: 'mypreloved://stripe-redirect',
                defaultBillingDetails: {
                    name: 'My Preloved User',
                }
            });

            if (initError) {
                Alert.alert("Error", initError.message);
                setLoading(false);
                return;
            }

            // 4. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();
            
            if (paymentError) {
                Alert.alert("Payment Cancelled", "You did not complete the payment.");
                setLoading(false);
                return;
            }

            // Confirm success with the backend directly. Stripe's webhook can't reach
            // this server in local/dev setups without a public tunnel, so this call is
            // what actually flips the transaction into PAID (escrow) status.
            try {
                await api.post(`transactions/${txId}/confirm-payment/`);
            } catch (confirmErr) {
                console.error('Confirm Payment Error:', confirmErr.message);
            }

            Alert.alert("Success", "Payment successful! The item is now yours.");
            navigation.navigate("MainTabs", { screen: "For You" });
        } catch (e) {
            console.error("Checkout Error:", e.message);
            const errorMsg =
                e.response?.data?.non_field_errors?.[0] ||
                e.response?.data?.error ||
                e.response?.data?.[0] ||
                "Could not process payment.";
            Alert.alert("Error", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={COLORS.black}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Make an Offer</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.itemSummary}>
                    <Text style={styles.sectionLabel}>ITEM</Text>
                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemOriginalPrice}>
                                Listed Price: RM{" "}
                                {parseFloat(item.price || 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                        YOUR OFFER PRICE (RM)
                    </Text>
                    {item.is_negotiable ? (
                        <View style={styles.priceInputContainer}>
                            <Text style={styles.currencyPrefix}>RM</Text>
                            <TextInput
                                style={styles.priceInput}
                                keyboardType="decimal-pad"
                                value={offerPrice}
                                onChangeText={setOfferPrice}
                                placeholder="0.00"
                                editable={!existingTransactionId}
                            />
                        </View>
                    ) : (
                        <View style={styles.fixedPriceContainer}>
                            <Text style={styles.fixedPrice}>
                                RM {parseFloat(item.price || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.fixedLabel}>
                                This item price is fixed.
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
                    <View style={[styles.paymentOption, styles.selectedOption]}>
                        <Ionicons name="card" size={22} color={COLORS.primary} />
                        <Text style={[styles.paymentLabel, styles.selectedLabel]}>
                            Pay securely with Stripe
                        </Text>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    </View>
                </View>

                <View style={styles.protectionBox}>
                    <Ionicons
                        name="shield-checkmark"
                        size={22}
                        color={COLORS.ecoText}
                    />
                    <View style={styles.protectionTextContainer}>
                        <Text style={styles.protectionTitle}>
                            Buyer Protection Active
                        </Text>
                        <Text style={styles.protectionText}>
                            Your payment is held securely in escrow. If the item
                            doesn't match the description or condition, you can
                            report the seller for an admin review to dispute the
                            funds.
                        </Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons
                        name="information-circle"
                        size={20}
                        color={COLORS.gray}
                    />
                    <Text style={styles.infoText}>
                        Clicking Confirm & Pay will open a secure Stripe payment sheet. Your payment is instant and protected.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Offer</Text>
                    <Text style={styles.totalValue}>
                        RM {parseFloat(offerPrice || 0).toFixed(2)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                    onPress={handleConfirmOffer}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Confirm Offer</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.background,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: COLORS.black,
        fontFamily: Platform.OS === "ios" ? "Playfair Display" : "serif",
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollContent: { padding: 20 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.gray,
        marginBottom: 12,
        letterSpacing: 1,
    },
    itemSummary: {
        backgroundColor: COLORS.white,
        padding: 18,
        borderRadius: 16,
        marginBottom: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    itemName: { fontSize: 17, fontWeight: "bold", color: COLORS.black },
    itemOriginalPrice: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
    itemRow: { flexDirection: "row", alignItems: "center" },
    itemInfo: { flex: 1 },
    section: { marginBottom: 25 },
    priceInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        height: 56,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.black,
        marginRight: 10,
    },
    priceInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    fixedPriceContainer: {
        backgroundColor: COLORS.white,
        padding: 18,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    fixedPrice: { fontSize: 18, fontWeight: "bold", color: COLORS.black },
    fixedLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
    paymentOption: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: "transparent",
    },
    selectedOption: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.eco,
    },
    paymentLabel: {
        flex: 1,
        marginLeft: 15,
        fontSize: 15,
        color: COLORS.black,
    },
    selectedLabel: { fontWeight: "bold", color: COLORS.primary },
    infoBox: {
        flexDirection: "row",
        backgroundColor: COLORS.lightGray,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 12,
        color: COLORS.gray,
        lineHeight: 18,
    },
    footer: {
        backgroundColor: COLORS.white,
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 35 : 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    totalLabel: { fontSize: 14, color: COLORS.gray },
    totalValue: { fontSize: 20, fontWeight: "bold", color: COLORS.primary },
    confirmBtn: {
        backgroundColor: COLORS.secondary,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
    protectionBox: {
        flexDirection: "row",
        backgroundColor: COLORS.eco,
        borderWidth: 1,
        borderColor: "#A7F3D0",
        padding: 16,
        borderRadius: 16,
        alignItems: "flex-start",
        marginTop: 15,
        marginBottom: 10,
    },
    protectionTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    protectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.ecoText,
        marginBottom: 4,
    },
    protectionText: {
        fontSize: 12,
        color: COLORS.ecoText,
        lineHeight: 18,
    },
});
