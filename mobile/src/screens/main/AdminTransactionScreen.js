// AdminTransactionScreen.js — Admin-only screen to view and override all platform transactions.
// Superadmins can force-complete, force-cancel, or release funds for any transaction.
import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, ActivityIndicator, Modal, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    PENDING:   { label: 'Pending',      color: '#F59E0B', bg: '#FFFBEB' },
    ACCEPTED:  { label: 'Accepted',     color: '#3B82F6', bg: '#EFF6FF' },
    PAID:      { label: 'Paid (Escrow)', color: '#8B5CF6', bg: '#F5F3FF' },
    COMPLETED: { label: 'Completed',    color: '#10B981', bg: '#ECFDF5' },
    CANCELLED: { label: 'Cancelled',    color: '#EF4444', bg: '#FEF2F2' },
};

const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'PAID', 'COMPLETED', 'CANCELLED'];

// ─── Override Modal ───────────────────────────────────────────────────────────
const OverrideModal = ({ visible, transaction, onClose, onConfirm }) => {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const statusOptions = ['ACCEPTED', 'PAID', 'COMPLETED', 'CANCELLED'];

    const handleConfirm = async () => {
        if (!selectedStatus) {
            Alert.alert('Error', 'Please select a target status.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason for this override.');
            return;
        }
        setLoading(true);
        await onConfirm(transaction.id, selectedStatus, reason);
        setLoading(false);
        setSelectedStatus('');
        setReason('');
    };

    if (!transaction) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.overrideModal}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Admin Override</Text>
                            <Text style={styles.modalSubtitle}>TX #{transaction.id} · {transaction.item_name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={26} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* Current status */}
                    <View style={styles.currentStatusRow}>
                        <Text style={styles.inputLabel}>Current Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[transaction.status]?.bg || '#F3F4F6' }]}>
                            <Text style={[styles.statusText, { color: STATUS_CONFIG[transaction.status]?.color || COLORS.gray }]}>
                                {STATUS_CONFIG[transaction.status]?.label || transaction.status}
                            </Text>
                        </View>
                    </View>

                    {/* Target status selector */}
                    <Text style={styles.inputLabel}>Force to Status</Text>
                    <View style={styles.statusGrid}>
                        {statusOptions.map(s => {
                            const cfg = STATUS_CONFIG[s];
                            const isSelected = selectedStatus === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.statusOption,
                                        { borderColor: cfg.color },
                                        isSelected && { backgroundColor: cfg.color },
                                    ]}
                                    onPress={() => setSelectedStatus(s)}
                                >
                                    <Text style={[styles.statusOptionText, { color: isSelected ? 'white' : cfg.color }]}>
                                        {cfg.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Reason input */}
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>Reason / Note</Text>
                    <TextInput
                        style={styles.reasonInput}
                        placeholder="e.g. Buyer and seller agreed offline, resolving dispute..."
                        placeholderTextColor={COLORS.gray}
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    {/* Confirm / Cancel */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose}>
                            <Text style={styles.cancelActionText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmActionBtn, (!selectedStatus || !reason.trim()) && { opacity: 0.5 }]}
                            onPress={handleConfirm}
                            disabled={loading || !selectedStatus || !reason.trim()}
                        >
                            {loading
                                ? <ActivityIndicator color="white" size="small" />
                                : <Text style={styles.confirmActionText}>Apply Override</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminTransactionScreen = ({ navigation }) => {
    const [transactions, setTransactions] = useState([]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [showOverrideModal, setShowOverrideModal] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await api.get('transactions/');
            const data = res.data.results || res.data;
            setTransactions(data);
        } catch (err) {
            console.error('Admin Transactions Error:', err.message);
            Alert.alert('Error', 'Could not load transactions.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchTransactions();
    };

    const handleOverrideConfirm = async (txId, newStatus, reason) => {
        try {
            await api.post(`transactions/${txId}/admin-override/`, { status: newStatus, reason });
            Alert.alert('✅ Override Applied', `Transaction #${txId} has been set to ${newStatus}.`);
            setShowOverrideModal(false);
            setSelectedTx(null);
            fetchTransactions();
        } catch (e) {
            const errorMsg = e.response?.data?.error || 'Override failed.';
            Alert.alert('Error', errorMsg);
        }
    };

    const filteredTransactions = activeTab === 'ALL'
        ? transactions
        : transactions.filter(tx => tx.status === activeTab);

    const renderItem = ({ item }) => {
        const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: COLORS.gray, bg: '#F3F4F6' };
        const date = new Date(item.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
        const amount = parseFloat(item.final_price || item.offer_price || 0).toFixed(2);

        return (
            <View style={styles.card}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.txId}>TX #{item.id}</Text>
                        <Text style={styles.txDate}>{date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                {/* Item info */}
                <Text style={styles.txItemName} numberOfLines={1}>{item.item_name || 'Unknown Item'}</Text>

                {/* Parties */}
                <View style={styles.partiesRow}>
                    <View style={styles.partyChip}>
                        <Ionicons name="person" size={12} color={COLORS.primary} />
                        <Text style={styles.partyText}>Buyer: {item.buyer_name}</Text>
                    </View>
                    <View style={styles.partyChip}>
                        <Ionicons name="storefront" size={12} color={COLORS.secondary} />
                        <Text style={styles.partyText}>Seller: {item.seller_name}</Text>
                    </View>
                </View>

                {/* Amount + Override button */}
                <View style={styles.cardFooter}>
                    <Text style={styles.txAmount}>RM {amount}</Text>
                    {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                        <TouchableOpacity
                            style={styles.overrideBtn}
                            onPress={() => {
                                setSelectedTx({ ...item, item_name: item.item_name || 'Item' });
                                setShowOverrideModal(true);
                            }}
                        >
                            <Ionicons name="shield" size={13} color="white" />
                            <Text style={styles.overrideBtnText}>Override</Text>
                        </TouchableOpacity>
                    )}
                    {(item.status === 'COMPLETED' || item.status === 'CANCELLED') && (
                        <View style={[styles.overrideBtn, { backgroundColor: '#F3F4F6' }]}>
                            <Ionicons name="lock-closed" size={13} color={COLORS.gray} />
                            <Text style={[styles.overrideBtnText, { color: COLORS.gray }]}>Final</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction Management</Text>
                <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
            </View>

            {/* Status filter tabs */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={STATUS_TABS}
                keyExtractor={item => item}
                renderItem={({ item: tab }) => (
                    <TouchableOpacity
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'ALL' ? 'All' : (STATUS_CONFIG[tab]?.label || tab)}
                        </Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.tabsContainer}
            />

            {/* Transaction list */}
            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
                <FlatList
                    data={filteredTransactions}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color={COLORS.gray} />
                            <Text style={styles.emptyText}>No transactions in this status.</Text>
                        </View>
                    }
                />
            )}

            {/* Override modal */}
            <OverrideModal
                visible={showOverrideModal}
                transaction={selectedTx}
                onClose={() => { setShowOverrideModal(false); setSelectedTx(null); }}
                onConfirm={handleOverrideConfirm}
            />
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.white,
        borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.black },
    adminBadge: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    adminBadgeText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    // Note: flex `gap` inside a horizontal FlatList's contentContainerStyle renders
    // unreliably on Android (items can overlap instead of spacing out), so spacing
    // is done with an explicit marginRight on each pill instead of `gap` here.
    // `alignItems: 'flex-start'` (plus `alignSelf` on each pill below) stops the
    // pills from stretching to fill the row's full cross-axis height, which is the
    // flex default and otherwise blows each pill up into a tall vertical bar.
    tabsContainer: { paddingHorizontal: 12, paddingVertical: 12, alignItems: 'flex-start' },
    tab: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: COLORS.lightGray,
        backgroundColor: COLORS.white, marginRight: 8, alignSelf: 'flex-start',
    },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
    activeTabText: { color: 'white' },

    listContent: { padding: 16, gap: 12 },

    card: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    txId: { fontSize: 13, fontWeight: '700', color: COLORS.black },
    txDate: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    txItemName: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: 8 },
    partiesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    partyChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    partyText: { fontSize: 11, color: COLORS.gray, fontWeight: '600' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txAmount: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
    overrideBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#EF4444', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    overrideBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 14, color: COLORS.gray },

    // Override Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    overrideModal: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 34,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black },
    modalSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 3 },
    currentStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusOption: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1.5, backgroundColor: 'transparent',
    },
    statusOptionText: { fontSize: 12, fontWeight: '700' },
    reasonInput: {
        backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1,
        borderColor: '#E5E7EB', padding: 12, fontSize: 13,
        color: COLORS.black, minHeight: 80,
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelActionBtn: {
        flex: 1, height: 48, borderRadius: 12, borderWidth: 1,
        borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center',
    },
    cancelActionText: { fontWeight: '700', color: COLORS.gray },
    confirmActionBtn: {
        flex: 1.5, height: 48, borderRadius: 12, backgroundColor: '#EF4444',
        justifyContent: 'center', alignItems: 'center',
    },
    confirmActionText: { color: 'white', fontWeight: '800', fontSize: 14 },
});
