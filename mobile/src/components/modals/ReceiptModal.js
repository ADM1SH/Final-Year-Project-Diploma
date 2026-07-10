// ReceiptModal.js — Professional receipt viewer with PDF download capability.
// Uses expo-print to generate a styled HTML receipt and expo-sharing to export it.
import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── PDF Template ─────────────────────────────────────────────────────────────
const generateReceiptHTML = (tx) => {
    const date = tx.created_at
        ? new Date(tx.created_at).toLocaleString('en-MY', { dateStyle: 'long', timeStyle: 'short' })
        : 'N/A';
    const methodLabel = tx.payment_method === 'STRIPE' ? 'Stripe (Card Payment)' : tx.payment_method || 'N/A';
    const amount = parseFloat(tx.final_price || tx.amount || 0).toFixed(2);
    const txId = tx.id || '0000';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>MyPreLove Receipt MPL-TX-${txId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 30px; }
  .receipt { background: white; max-width: 500px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1A5C38, #2E7D52); color: white; padding: 30px 24px; text-align: center; }
  .logo-icon { font-size: 36px; margin-bottom: 8px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
  .brand-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }
  .paid-stamp { display: inline-block; border: 3px solid #4ADE80; color: #4ADE80; border-radius: 8px; padding: 4px 20px; font-size: 18px; font-weight: 900; letter-spacing: 4px; margin-top: 16px; }
  .body { padding: 24px; }
  .section-title { font-size: 11px; color: #9CA3AF; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
  .row:last-child { border-bottom: none; }
  .label { font-size: 13px; color: #6B7280; }
  .value { font-size: 13px; color: #111827; font-weight: 600; text-align: right; max-width: 55%; }
  .divider { border: none; border-top: 2px dashed #E5E7EB; margin: 16px 0; }
  .item-block { background: #F9FAFB; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
  .item-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
  .item-price { font-size: 24px; font-weight: 900; color: #1A5C38; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
  .total-label { font-size: 15px; font-weight: 700; color: #111827; }
  .total-amount { font-size: 22px; font-weight: 900; color: #1A5C38; }
  .eco-banner { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; margin-top: 16px; }
  .eco-text { font-size: 12px; color: #065F46; font-weight: 600; margin-left: 8px; }
  .footer { text-align: center; padding: 20px 24px 28px; border-top: 1px solid #F3F4F6; }
  .barcode { font-size: 11px; color: #9CA3AF; letter-spacing: 3px; font-family: monospace; margin-bottom: 8px; }
  .ref-id { font-size: 12px; color: #6B7280; }
  .stripe-badge { display: inline-block; background: #635BFF; color: white; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-top: 4px; }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="logo-icon">🛍️</div>
    <div class="brand">MYPRELOVE</div>
    <div class="brand-sub">Love it again. Sustainable Secondhand.</div>
    <div class="paid-stamp">PAID</div>
  </div>

  <div class="body">
    <p class="section-title">Transaction Details</p>
    <div class="row"><span class="label">Receipt No.</span><span class="value">MPL-TX-${txId}</span></div>
    <div class="row"><span class="label">Date &amp; Time</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Buyer</span><span class="value">${tx.buyer_name || 'N/A'}</span></div>
    <div class="row"><span class="label">Seller</span><span class="value">${tx.seller_name || 'N/A'}</span></div>
    <div class="row"><span class="label">Payment Method</span><span class="value">${methodLabel}${tx.payment_method === 'STRIPE' ? '<br><span class="stripe-badge">Powered by Stripe</span>' : ''}</span></div>
    ${tx.stripe_payment_intent_id ? `<div class="row"><span class="label">Stripe Ref.</span><span class="value" style="font-size:11px;word-break:break-all">${tx.stripe_payment_intent_id}</span></div>` : ''}

    <hr class="divider"/>

    <p class="section-title">Item Purchased</p>
    <div class="item-block">
      <div class="item-name">${tx.item_name || 'Item'}</div>
      <div class="item-price">RM ${amount}</div>
    </div>

    <div class="total-row">
      <span class="total-label">Total Paid</span>
      <span class="total-amount">RM ${amount}</span>
    </div>

    <div class="eco-banner">
      <span style="font-size:18px">🌿</span>
      <span class="eco-text">Eco-Impact: This secondhand purchase saved approximately 2.5 kg of CO₂!</span>
    </div>
  </div>

  <div class="footer">
    <div class="barcode">| | | MPL-TX-${txId} | | |</div>
    <div class="ref-id">Thank you for shopping sustainably!</div>
    <div class="ref-id" style="margin-top:4px;font-size:11px;color:#D1D5DB">MyPreLove Sdn. Bhd. · support@myprelove.my</div>
  </div>
</div>
</body>
</html>
    `;
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ReceiptModal = ({ visible, onClose, selectedReceipt }) => {
    const [downloading, setDownloading] = useState(false);

    if (!selectedReceipt) return null;

    const tx = selectedReceipt;
    const amount = parseFloat(tx.final_price || tx.amount || 0).toFixed(2);
    const date = tx.created_at
        ? new Date(tx.created_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
        : 'N/A';

    const getMethodLabel = (method) => {
        if (method === 'STRIPE') return 'Stripe (Card)';
        return method || 'N/A';
    };

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const html = generateReceiptHTML(tx);
            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
            });

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `MyPreLove Receipt MPL-TX-${tx.id}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Sharing not available', 'Your device does not support file sharing.');
            }
        } catch (e) {
            console.error('PDF Export Error:', e.message);
            Alert.alert('Error', 'Could not generate PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Close handle */}
                    <View style={styles.handle} />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Receipt header */}
                        <View style={styles.receiptHeader}>
                            <View style={styles.successIconWrapper}>
                                <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                            </View>
                            <Text style={styles.merchantName}>MYPRELOVE OFFICIAL RECEIPT</Text>
                            <Text style={styles.merchantSub}>Love it again. Sustainable Secondhand.</Text>
                            <View style={styles.paidStamp}>
                                <Text style={styles.paidStampText}>PAID</Text>
                            </View>
                        </View>

                        {/* Dashed separator */}
                        <View style={styles.dashedLine} />

                        {/* Transaction details */}
                        <View style={styles.detailsSection}>
                            <Text style={styles.sectionLabel}>TRANSACTION DETAILS</Text>
                            {[
                                { label: 'Receipt No.', value: `MPL-TX-${tx.id || '0000'}` },
                                { label: 'Date & Time', value: date },
                                { label: 'Buyer', value: tx.buyer_name || 'N/A' },
                                { label: 'Seller', value: tx.seller_name || 'N/A' },
                                { label: 'Payment', value: getMethodLabel(tx.payment_method) },
                            ].map((row) => (
                                <View key={row.label} style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{row.label}</Text>
                                    <Text style={styles.detailValue} numberOfLines={2}>{row.value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.dashedLine} />

                        {/* Item purchased */}
                        <View style={styles.itemBlock}>
                            <Text style={styles.sectionLabel}>ITEM PURCHASED</Text>
                            <View style={styles.itemRow}>
                                <Text style={styles.itemName} numberOfLines={2}>{tx.item_name || 'Item'}</Text>
                                <Text style={styles.itemPrice}>RM {amount}</Text>
                            </View>
                        </View>

                        <View style={styles.dashedLine} />

                        {/* Total */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Paid</Text>
                            <Text style={styles.totalAmount}>RM {amount}</Text>
                        </View>

                        <View style={styles.dashedLine} />

                        {/* Eco banner */}
                        <View style={styles.ecoBanner}>
                            <Ionicons name="leaf" size={16} color="#047857" />
                            <Text style={styles.ecoText}>
                                🌿 Eco-Impact: This secondhand transaction saved approx. 2.5 kg of CO₂!
                            </Text>
                        </View>

                        {/* Barcode footer */}
                        <View style={styles.barcodeSection}>
                            <Ionicons name="barcode-outline" size={44} color={COLORS.black} />
                            <Text style={styles.barcodeText}>*MPL-TX-{tx.id || '0000'}*</Text>
                        </View>
                    </ScrollView>

                    {/* Action buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPDF} disabled={downloading}>
                            {downloading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={18} color="white" />
                                    <Text style={styles.downloadBtnText}>Download PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '92%', paddingBottom: 34,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
        alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 8 },

    // Receipt header
    receiptHeader: { alignItems: 'center', paddingVertical: 20 },
    successIconWrapper: { marginBottom: 8 },
    merchantName: { fontSize: 15, fontWeight: '800', color: '#1A5C38', letterSpacing: 1, textAlign: 'center' },
    merchantSub: { fontSize: 11, color: COLORS.gray, marginTop: 4, textAlign: 'center' },
    paidStamp: {
        marginTop: 12, borderWidth: 2.5, borderColor: '#10B981',
        borderRadius: 8, paddingHorizontal: 20, paddingVertical: 4,
    },
    paidStampText: { fontSize: 16, fontWeight: '900', color: '#10B981', letterSpacing: 4 },

    dashedLine: {
        borderStyle: 'dashed', borderTopWidth: 1.5, borderColor: '#E5E7EB', marginVertical: 14,
    },

    // Details
    detailsSection: { marginBottom: 4 },
    sectionLabel: {
        fontSize: 10, fontWeight: '700', color: COLORS.gray,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
    },
    detailLabel: { fontSize: 13, color: COLORS.gray, flex: 1 },
    detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.black, flex: 1.2, textAlign: 'right' },

    // Item
    itemBlock: { marginBottom: 4 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    itemName: { fontSize: 14, fontWeight: '600', color: COLORS.black, flex: 1, marginRight: 8 },
    itemPrice: { fontSize: 16, fontWeight: '800', color: '#1A5C38' },

    // Total
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.black },
    totalAmount: { fontSize: 22, fontWeight: '900', color: '#1A5C38' },

    // Eco
    ecoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, marginBottom: 4,
    },
    ecoText: { flex: 1, fontSize: 12, color: '#065F46', fontWeight: '600', lineHeight: 17 },

    // Barcode
    barcodeSection: { alignItems: 'center', paddingVertical: 12 },
    barcodeText: { fontSize: 11, color: COLORS.gray, letterSpacing: 2, marginTop: 4, fontFamily: 'monospace' },

    // Actions
    actions: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
    downloadBtn: {
        backgroundColor: '#1A5C38', borderRadius: 14, height: 50,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    downloadBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    closeBtn: {
        borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, height: 46,
        alignItems: 'center', justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
});
