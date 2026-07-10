// ChatDetailScreen.js — Real-time negotiation chat between buyers and sellers.
// Supports live polling, in-chat offers with price anchoring, counter-offers,
// offer status tracking, and Stripe escrow payment flow.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert,
} from 'react-native';
import AppImage from '../../components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

// ─── Helper ──────────────────────────────────────────────────────────────────
const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getStatusLabel = (s) => {
    const map = {
        PENDING:   { label: 'Awaiting Response', color: '#F59E0B' },
        ACCEPTED:  { label: 'Accepted',           color: '#10B981' },
        PAID:      { label: 'Paid (Escrow)',       color: '#3B82F6' },
        COMPLETED: { label: 'Completed',           color: '#10B981' },
        CANCELLED: { label: 'Declined',            color: '#EF4444' },
    };
    return map[s] || { label: s, color: COLORS.gray };
};

// ─── Component ───────────────────────────────────────────────────────────────
export const ChatDetailScreen = ({ route, navigation }) => {
    const { userName } = route.params || { userName: 'User' };
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatItem, setChatItem] = useState(route.params?.item || null);
    const flatListRef = useRef();

    const [showOfferInput, setShowOfferInput] = useState(false);
    const [offerPrice, setOfferPrice] = useState('');
    const [isCounterOffer, setIsCounterOffer] = useState(false);
    const [counterMessageId, setCounterMessageId] = useState(null);
    // Guards handleReleaseFunds against being fired twice in quick succession
    // (double-tap on the confirm alert, slow network + repeat tap, etc.). The
    // server is now race-safe too (see release_funds in transaction_views.py),
    // but this avoids a pointless duplicate request from the client as well.
    const releasingFundsRef = useRef(false);

    // ── Data fetching ──────────────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const res = await api.get(`messages/?partner=${userName}`);
            const data = res.data.results || res.data;
            setMessages(data);
            const hasUnread = data.some(m => !m.is_read && m.sender_name === userName);
            if (hasUnread) {
                await api.post('messages/mark_conversation_read/', { partner: userName });
            }
        } catch (err) {
            console.error('Fetch Messages Error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [userName]);

    const fetchFullItem = useCallback(async (itemId) => {
        try {
            const res = await api.get(`items/${itemId}/`);
            setChatItem(res.data);
        } catch (e) {
            console.warn('Error fetching item (may be deleted):', e.message);
        }
    }, []);

    // ── Polling (5-second interval) ────────────────────────────────────────
    useEffect(() => {
        let timeoutId;
        let isMounted = true;
        const poll = async () => {
            if (!isMounted) return;
            await fetchMessages();
            if (isMounted) timeoutId = setTimeout(poll, 5000);
        };
        poll();
        return () => { isMounted = false; clearTimeout(timeoutId); };
    }, [fetchMessages]);

    // ── Resolve item from messages if not passed via route ─────────────────
    useEffect(() => {
        if (route.params?.item) {
            setChatItem(route.params.item);
        } else if (messages.length > 0 && !chatItem) {
            const msgWithItem = messages.find(m => m.item);
            if (msgWithItem) fetchFullItem(msgWithItem.item);
        }
    }, [messages, route.params?.item]);

    // ── Sending messages ───────────────────────────────────────────────────
    const sendMessage = async (customContent = null) => {
        const content = customContent || input;
        if (!content.trim()) return;
        if (!customContent) setInput('');

        try {
            let partnerId = route.params?.userId;
            if (!partnerId) {
                const userRes = await api.get('users/');
                const allUsers = userRes.data.results || userRes.data;
                const partner = allUsers.find(u => u.username === userName);
                if (partner) partnerId = partner.id;
            }
            if (partnerId) {
                await api.post('messages/', {
                    receiver: partnerId,
                    content,
                    item: chatItem?.id,
                });
                fetchMessages();
            }
        } catch (e) {
            console.error('Send Error:', e.message);
            Alert.alert('Error', 'Message could not be sent.');
        }
    };

    // ── Offer handling ─────────────────────────────────────────────────────
    const handleOpenCounter = (message, currentPrice) => {
        setIsCounterOffer(true);
        setCounterMessageId(message.id);
        setOfferPrice(currentPrice.toString());
        setShowOfferInput(true);
    };

    const handleCloseOfferInput = () => {
        setShowOfferInput(false);
        setIsCounterOffer(false);
        setCounterMessageId(null);
        setOfferPrice('');
    };

    const sendChatOffer = async () => {
        const price = parseFloat(offerPrice || chatItem?.price || 0);
        if (isNaN(price) || price <= 0) {
            Alert.alert('Error', 'Please enter a valid offer price.');
            return;
        }
        try {
            if (isCounterOffer && counterMessageId) {
                await api.post(`messages/${counterMessageId}/counter_offer/`, { price });
                setIsCounterOffer(false);
                setCounterMessageId(null);
            } else {
                await api.post('transactions/', {
                    item: chatItem.id,
                    offer_price: price,
                    payment_method: 'STRIPE',
                });
            }
            handleCloseOfferInput();
            fetchMessages();
        } catch (e) {
            console.error('Make Offer Error:', e.message);
            const errorMsg =
                e.response?.data?.non_field_errors?.[0] ||
                e.response?.data?.error ||
                'Could not complete offer.';
            Alert.alert('Error', errorMsg);
        }
    };

    const handleUpdateOffer = async (transactionId, newStatus) => {
        try {
            await api.patch(`transactions/${transactionId}/`, { status: newStatus });
            Alert.alert(
                'Success',
                newStatus === 'ACCEPTED' ? 'Offer accepted!' : 'Offer declined.',
            );
            if (newStatus === 'ACCEPTED' && chatItem) fetchFullItem(chatItem.id);
            fetchMessages();
        } catch (e) {
            console.error('Update Offer Error:', e.message);
            const errorMsg =
                e.response?.data?.status?.[0] ||
                e.response?.data?.error ||
                'Could not update offer status.';
            Alert.alert('Error', errorMsg);
        }
    };

    const handleReleaseFunds = async (transactionId) => {
        if (releasingFundsRef.current) return;
        releasingFundsRef.current = true;
        try {
            await api.post(`transactions/${transactionId}/release-funds/`);
            Alert.alert('Payment Released', 'Funds have been released to the seller!');
            if (chatItem) fetchFullItem(chatItem.id);
            fetchMessages();
        } catch (e) {
            console.error('Release Funds Error:', e.message);
            const errorMsg = e.response?.data?.error || 'Could not release funds.';
            Alert.alert('Error', errorMsg);
        } finally {
            releasingFundsRef.current = false;
        }
    };

    // ── Render message ─────────────────────────────────────────────────────
    const renderMessage = useCallback(({ item: message }) => {
        const isOffer = message.content?.startsWith('[OFFER:');

        if (isOffer) {
            // Format: [OFFER:transactionId:price:status]
            const parts = message.content.slice(7, -1).split(':');
            const transactionId = parts[0];
            const offerPriceRaw = parts[1];
            const offerStatus = parts[2];

            let parsedPrice = parseFloat(offerPriceRaw);
            if (isNaN(parsedPrice) || offerPriceRaw === 'None') {
                parsedPrice = parseFloat(message.item_price || chatItem?.price || 0);
            }

            const isMyMessage = message.sender_name === user?.username;
            // Whether the current viewer is the BUYER of this item (not just the non-proposer
            // of the current message) — used to gate the payment flow (Checkout & Pay / Confirm
            // Receipt), since a counter-offer can flip which party authored the accepted message.
            const isBuyerViewer = !!chatItem && user?.username !== chatItem.seller_name && user?.id !== chatItem.seller;
            const listedPrice = parseFloat(chatItem?.price || 0);
            const { label: statusLabel, color: statusColor } = getStatusLabel(offerStatus);
            const savings = listedPrice > 0 ? ((listedPrice - parsedPrice) / listedPrice * 100) : 0;

            return (
                <View style={[styles.offerCard, isMyMessage ? styles.myOfferCard : styles.theirOfferCard]}>
                    {/* Header */}
                    <View style={styles.offerHeader}>
                        <Ionicons name="pricetag" size={16} color={isMyMessage ? 'white' : COLORS.primary} />
                        <Text style={[styles.offerHeaderText, { color: isMyMessage ? 'white' : COLORS.black }]}>
                            {isMyMessage ? 'You made an offer' : `${message.sender_name} made an offer`}
                        </Text>
                    </View>

                    {/* Price */}
                    <Text style={[styles.offerPriceText, { color: isMyMessage ? 'white' : COLORS.primary }]}>
                        RM {parsedPrice.toFixed(2)}
                    </Text>

                    {/* Savings label */}
                    {savings > 0 && listedPrice > 0 && (
                        <View style={styles.savingsRow}>
                            <Ionicons name="trending-down" size={12} color={isMyMessage ? '#A7F3D0' : '#10B981'} />
                            <Text style={[styles.savingsText, { color: isMyMessage ? '#A7F3D0' : '#10B981' }]}>
                                {savings.toFixed(0)}% off listed price (RM {listedPrice.toFixed(2)})
                            </Text>
                        </View>
                    )}

                    <View style={[styles.offerDivider, { backgroundColor: isMyMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />

                    {/* Status pill */}
                    <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>

                    {/* Actions */}
                    {offerStatus === 'PENDING' && !isMyMessage && (
                        <View style={styles.offerActionsRow}>
                            <TouchableOpacity
                                style={[styles.offerBtn, styles.acceptBtn]}
                                onPress={() => handleUpdateOffer(transactionId, 'ACCEPTED')}
                            >
                                <Ionicons name="checkmark" size={14} color="white" />
                                <Text style={styles.offerBtnText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.offerBtn, styles.declineBtn]}
                                onPress={() => handleUpdateOffer(transactionId, 'CANCELLED')}
                            >
                                <Ionicons name="close" size={14} color="white" />
                                <Text style={styles.offerBtnText}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {offerStatus === 'PENDING' && isMyMessage && (
                        <TouchableOpacity
                            style={[styles.offerBtn, { backgroundColor: 'rgba(255,255,255,0.2)', flex: 1, marginTop: 10 }]}
                            onPress={() => handleOpenCounter(message, parsedPrice)}
                        >
                            <Text style={styles.offerBtnText}>Edit Offer</Text>
                        </TouchableOpacity>
                    )}

                    {offerStatus === 'ACCEPTED' && isBuyerViewer && (
                        <TouchableOpacity
                            style={[styles.offerBtn, { backgroundColor: COLORS.primary, flex: 1, marginTop: 10 }]}
                            onPress={() => navigation.navigate('Checkout', {
                                item: chatItem,
                                existingTransactionId: transactionId,
                                initialPrice: parsedPrice,
                            })}
                        >
                            <Ionicons name="card" size={14} color="white" />
                            <Text style={styles.offerBtnText}>Checkout & Pay</Text>
                        </TouchableOpacity>
                    )}

                    {offerStatus === 'ACCEPTED' && !isBuyerViewer && (
                        <Text style={styles.waitingNote}>Waiting for buyer to complete payment…</Text>
                    )}

                    {offerStatus === 'PAID' && isBuyerViewer && (
                        <TouchableOpacity
                            style={[styles.offerBtn, { backgroundColor: '#10B981', flex: 1, marginTop: 10 }]}
                            onPress={() => Alert.alert(
                                'Confirm Receipt',
                                'Have you received the item? Confirming will release funds to the seller.',
                                [
                                    { text: 'Not Yet', style: 'cancel' },
                                    { text: 'Yes, Release Funds', onPress: () => handleReleaseFunds(transactionId) },
                                ],
                            )}
                        >
                            <Ionicons name="checkmark-done" size={14} color="white" />
                            <Text style={styles.offerBtnText}>Confirm Receipt</Text>
                        </TouchableOpacity>
                    )}

                    {offerStatus === 'PAID' && !isBuyerViewer && (
                        <Text style={styles.waitingNote}>Funds in escrow — waiting for buyer to confirm receipt.</Text>
                    )}

                    {offerStatus === 'CANCELLED' && (
                        <TouchableOpacity
                            style={[styles.offerBtn, { backgroundColor: COLORS.secondary, flex: 1, marginTop: 10 }]}
                            onPress={() => handleOpenCounter(message, parsedPrice)}
                        >
                            <Ionicons name="refresh" size={14} color="white" />
                            <Text style={styles.offerBtnText}>Counter Offer</Text>
                        </TouchableOpacity>
                    )}

                    {/* Timestamp + read receipt */}
                    <View style={styles.messageMetaRow}>
                        <Text style={[styles.messageTime, { color: isMyMessage ? '#E5E7EB' : COLORS.gray }]}>
                            {formatTime(message.timestamp)}
                        </Text>
                        {isMyMessage && (
                            <Text style={{ fontSize: 10, color: message.is_read ? '#93C5FD' : '#E5E7EB', fontWeight: '500', marginLeft: 4 }}>
                                {message.is_read ? '✓✓ Seen' : '✓ Sent'}
                            </Text>
                        )}
                    </View>
                </View>
            );
        }

        // ── Regular text bubble ──────────────────────────────────────────
        const isMine = message.sender_name === user?.username;
        return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                    {message.content}
                </Text>
                <View style={styles.messageMetaRow}>
                    <Text style={[styles.messageTime, { marginRight: 4 }]}>{formatTime(message.timestamp)}</Text>
                    {isMine && (
                        <Text style={{ fontSize: 10, color: message.is_read ? '#60A5FA' : '#9CA3AF', fontWeight: '500' }}>
                            {message.is_read ? '✓✓ Seen' : '✓ Sent'}
                        </Text>
                    )}
                </View>
            </View>
        );
    }, [chatItem, handleOpenCounter, handleUpdateOffer, user?.username, user?.id]);

    // ── Preset quick messages ──────────────────────────────────────────────
    const presets = [
        'Hi, is this still available?',
        "What's your best price?",
        'Can we deal today?',
        'Is it in good condition?',
    ];

    // ── Offer quick-price suggestions ──────────────────────────────────────
    const listedPrice = parseFloat(chatItem?.price || 0);
    const priceSuggestions = listedPrice > 0
        ? [
            { label: '5% off',  price: listedPrice * 0.95 },
            { label: '10% off', price: listedPrice * 0.90 },
            { label: '15% off', price: listedPrice * 0.85 },
            { label: '20% off', price: listedPrice * 0.80 },
        ]
        : [];

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.black} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{userName}</Text>
                </View>
                <TouchableOpacity style={styles.headerActionBtn}>
                    <Ionicons name="information-circle-outline" size={22} color={COLORS.black} />
                </TouchableOpacity>
            </View>

            {/* ── Item context strip ── */}
            {chatItem && (
                <View style={styles.itemHeader}>
                    <AppImage source={{ uri: chatItem.display_image || chatItem.image }} style={styles.itemThumbnail} />
                    <View style={styles.itemMeta}>
                        <Text style={styles.itemName} numberOfLines={1}>{chatItem.name}</Text>
                        <Text style={styles.itemPrice}>RM {parseFloat(chatItem.price || 0).toFixed(2)}</Text>
                    </View>
                    {chatItem.is_sold ? (
                        <View style={styles.soldBadge}><Text style={styles.soldText}>SOLD</Text></View>
                    ) : (
                        user?.username !== chatItem.seller_name && user?.id !== chatItem.seller && (
                            <TouchableOpacity style={styles.makeOfferHeaderBtn} onPress={() => setShowOfferInput(true)}>
                                <Ionicons name="pricetag-outline" size={13} color="white" />
                                <Text style={styles.makeOfferHeaderBtnText}>Make Offer</Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>
            )}

            {chatItem?.is_sold && (
                <View style={styles.soldGuardBanner}>
                    <Ionicons name="information-circle" size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.soldGuardText}>This item has already been sold.</Text>
                </View>
            )}

            {/* ── Messages list ── */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            />

            {/* ── Preset chips ── */}
            {chatItem && !chatItem.is_sold && (
                <View style={styles.presetsRow}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={presets}
                        keyExtractor={(item, idx) => idx.toString()}
                        renderItem={({ item: presetText }) => (
                            <TouchableOpacity style={styles.presetChip} onPress={() => sendMessage(presetText)}>
                                <Text style={styles.presetChipText}>{presetText}</Text>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingHorizontal: 12 }}
                    />
                </View>
            )}

            {/* ── Offer input panel ── */}
            {showOfferInput && (
                <View style={styles.offerInputPanel}>
                    <View style={styles.offerInputHeader}>
                        <View>
                            <Text style={styles.offerInputTitle}>
                                {isCounterOffer ? '↩ Counter Offer' : '🏷 Make an Offer'}
                            </Text>
                            {listedPrice > 0 && (
                                <Text style={styles.listedAtText}>Listed at RM {listedPrice.toFixed(2)}</Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={handleCloseOfferInput}>
                            <Ionicons name="close-circle" size={22} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* Live discount indicator */}
                    {offerPrice && listedPrice > 0 && parseFloat(offerPrice) > 0 && (
                        <View style={styles.discountIndicator}>
                            <Ionicons name="trending-down" size={14} color="#10B981" />
                            <Text style={styles.discountText}>
                                {((listedPrice - parseFloat(offerPrice)) / listedPrice * 100).toFixed(1)}% off listed price
                            </Text>
                        </View>
                    )}

                    {/* Price input */}
                    <View style={styles.offerMiniPriceRow}>
                        <Text style={styles.offerPriceLabel}>RM</Text>
                        <TextInput
                            style={styles.offerMiniInput}
                            keyboardType="decimal-pad"
                            value={offerPrice}
                            onChangeText={setOfferPrice}
                            placeholder={listedPrice > 0 ? listedPrice.toFixed(2) : '0.00'}
                            placeholderTextColor={COLORS.gray}
                            autoFocus
                        />
                    </View>

                    {/* Quick-price suggestion chips */}
                    {priceSuggestions.length > 0 && (
                        <View style={styles.suggestionsRow}>
                            {priceSuggestions.map((s) => (
                                <TouchableOpacity
                                    key={s.label}
                                    style={styles.suggestionChip}
                                    onPress={() => setOfferPrice(s.price.toFixed(2))}
                                >
                                    <Text style={styles.suggestionChipText}>{s.label}</Text>
                                    <Text style={styles.suggestionChipPrice}>RM {s.price.toFixed(0)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.sendOfferSubmitBtn} onPress={sendChatOffer}>
                        <Ionicons name="send" size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.sendOfferSubmitBtnText}>
                            {isCounterOffer ? 'Send Counter Offer' : 'Send Offer'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Text input bar ── */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachBtn} onPress={() => chatItem && !chatItem.is_sold && setShowOfferInput(true)}>
                    <Ionicons name="pricetag-outline" size={22} color={COLORS.gray} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message…"
                    placeholderTextColor={COLORS.gray}
                    value={input}
                    onChangeText={setInput}
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                    <Ionicons name="send" size={18} color="white" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        paddingTop: 52,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        zIndex: 10,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black },
    headerActionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    // Item context strip
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 9,
    },
    itemThumbnail: { width: 44, height: 44, borderRadius: 8, marginRight: 10, backgroundColor: COLORS.lightGray },
    itemMeta: { flex: 1 },
    itemName: { fontSize: 13, fontWeight: '600', color: COLORS.black, marginBottom: 2 },
    itemPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
    soldBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    soldText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    makeOfferHeaderBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 16, gap: 4,
    },
    makeOfferHeaderBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    soldGuardBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.danger, paddingVertical: 8, paddingHorizontal: 15,
    },
    soldGuardText: { color: 'white', fontSize: 13, fontWeight: 'bold' },

    // Messages
    messageList: { padding: 16, paddingBottom: 32 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: 'white' },
    theirMessageText: { color: COLORS.black },
    messageMetaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
    messageTime: { fontSize: 10, color: COLORS.gray },

    // Offer card
    offerCard: { width: '78%', padding: 14, borderRadius: 16, marginBottom: 12 },
    myOfferCard: {
        alignSelf: 'flex-end', backgroundColor: COLORS.primary,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    },
    theirOfferCard: {
        alignSelf: 'flex-start', backgroundColor: COLORS.white,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    offerHeaderText: { fontSize: 12, fontWeight: '600', marginLeft: 5 },
    offerPriceText: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    savingsText: { fontSize: 11, fontWeight: '600' },
    offerDivider: { height: 1, marginVertical: 8 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 4,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    waitingNote: { fontSize: 11, color: COLORS.gray, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
    offerActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    offerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        flex: 0.48, height: 36, borderRadius: 18, gap: 4,
    },
    acceptBtn: { backgroundColor: '#10B981' },
    declineBtn: { backgroundColor: '#EF4444' },
    offerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

    // Presets
    presetsRow: {
        paddingVertical: 8,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    presetChip: {
        backgroundColor: COLORS.white,
        borderWidth: 1, borderColor: COLORS.primary + '60',
        borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
        marginRight: 8,
    },
    presetChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

    // Offer input panel
    offerInputPanel: {
        backgroundColor: COLORS.white,
        borderTopWidth: 1, borderTopColor: COLORS.lightGray,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 6,
    },
    offerInputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    offerInputTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black },
    listedAtText: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
    discountIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
        marginBottom: 8, alignSelf: 'flex-start',
    },
    discountText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
    offerMiniPriceRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.lightGray, borderRadius: 12,
        paddingHorizontal: 14, height: 48, marginBottom: 10,
    },
    offerPriceLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.black, marginRight: 6 },
    offerMiniInput: { flex: 1, fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    suggestionsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    suggestionChip: {
        flex: 1, backgroundColor: COLORS.primary + '12',
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary + '30',
        paddingVertical: 6, alignItems: 'center',
    },
    suggestionChipText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
    suggestionChipPrice: { fontSize: 10, color: COLORS.primary, fontWeight: '500', marginTop: 1 },
    sendOfferSubmitBtn: {
        backgroundColor: COLORS.secondary,
        height: 46, borderRadius: 23,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    },
    sendOfferSubmitBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

    // Input bar
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 1, borderTopColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
    },
    attachBtn: { marginRight: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    input: {
        flex: 1, backgroundColor: COLORS.lightGray,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
        maxHeight: 100, fontSize: 15, color: COLORS.black,
    },
    sendBtn: {
        marginLeft: 8, width: 40, height: 40,
        borderRadius: 20, backgroundColor: COLORS.secondary,
        justifyContent: 'center', alignItems: 'center',
    },
});
