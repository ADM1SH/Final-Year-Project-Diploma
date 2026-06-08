/**
 * File: ChatDetailScreen.js
 * Description: Interactive live chat thread screen between buyer and seller.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const ChatDetailScreen = ({ route, navigation }) => {
  const { userName } = route.params || { userName: 'User' };
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatItem, setChatItem] = useState(route.params?.item || null);
  const flatListRef = useRef();
  
  // Custom chat-offer states
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerPaymentMethod, setOfferPaymentMethod] = useState('CASH');
  const [isCounterOffer, setIsCounterOffer] = useState(false);
  const [counterMessageId, setCounterMessageId] = useState(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`messages/?partner=${userName}`);
      const data = res.data.results || res.data;
      setMessages(data);
      
      // Mark messages as read if there are unread ones from the partner
      const hasUnread = data.some(m => !m.is_read && m.sender_name === userName);
      if (hasUnread) {
        await api.post('messages/mark_conversation_read/', { partner: userName });
      }
    } catch (err) {
      console.error('Fetch Messages Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full item details for header if we have an item ID but not full info
  const fetchFullItem = async (itemId) => {
    try {
      const res = await api.get(`items/${itemId}/`);
      setChatItem(res.data);
    } catch (e) {
      console.log("Error fetching item details for chat header (expected if item is deleted):", e.message);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Real-time Polling: Check for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [userName]);

  useEffect(() => {
    if (route.params?.item) {
      setChatItem(route.params.item);
    } else if (messages.length > 0 && !chatItem) {
      // Find the first message that has an associated item
      const msgWithItem = messages.find(m => m.item);
      if (msgWithItem) {
        fetchFullItem(msgWithItem.item);
      }
    }
  }, [messages, route.params?.item]);

  const sendMessage = async (customContent = null) => {
    const content = customContent || input;
    if (content.trim() === '') return;
    
    if (!customContent) {
      setInput('');
    }

    try {
      let partnerId = route.params?.userId;
      
      // Fallback only if partnerId is not provided in navigation params
      if (!partnerId) {
        const userRes = await api.get(`users/`);
        const allUsers = userRes.data.results || userRes.data;
        const partner = allUsers.find(u => u.username === userName);
        if (partner) partnerId = partner.id;
      }
      
      if (partnerId) {
        await api.post('messages/', {
          receiver: partnerId,
          content: content,
          item: chatItem?.id
        });
        fetchMessages(); // Refresh immediately
      }
    } catch (e) {
      console.error('Send Error:', e.message);
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
      Alert.alert("Error", "Please enter a valid offer price.");
      return;
    }
    
    if (offerPaymentMethod === 'WALLET') {
      try {
        const profRes = await api.get('profiles/me/');
        const balance = parseFloat(profRes.data.wallet_balance || 0);
        if (price > balance) {
          Alert.alert("Insufficient Balance", "Your wallet balance is insufficient to complete this offer. Please top up your wallet in your profile first!");
          return;
        }
      } catch (e) {
        console.log("Could not check wallet balance:", e.message);
      }
    }

    try {
      if (isCounterOffer && counterMessageId) {
        await api.post(`messages/${counterMessageId}/counter_offer/`, {
          price: price
        });
        setIsCounterOffer(false);
        setCounterMessageId(null);
      } else {
        await api.post('transactions/', {
          item: chatItem.id,
          offer_price: price,
          payment_method: offerPaymentMethod
        });
      }
      setShowOfferInput(false);
      setOfferPrice('');
      fetchMessages(); // Refresh immediately
    } catch (e) {
      console.error('Make Chat Offer Error:', e.message);
      const errorMsg = e.response?.data?.non_field_errors?.[0] || e.response?.data?.error || "Could not complete offer.";
      Alert.alert("Error", errorMsg);
    }
  };

  const handleUpdateOffer = async (transactionId, newStatus) => {
    try {
      await api.patch(`transactions/${transactionId}/`, { status: newStatus });
      Alert.alert("Success", `Offer has been ${newStatus === 'COMPLETED' ? 'accepted' : 'declined'}!`);
      
      // If accepted, also refresh item details so it updates as SOLD in the header
      if (newStatus === 'COMPLETED' && chatItem) {
        fetchFullItem(chatItem.id);
      }
      fetchMessages();
    } catch (e) {
      console.error("Error updating offer:", e.message);
      const errorMsg = e.response?.data?.status?.[0] || e.response?.data?.non_field_errors?.[0] || e.response?.data?.error || "Could not update offer status.";
      Alert.alert("Error", errorMsg);
    }
  };

  const renderMessage = ({ item: message }) => {
    const isOffer = message.content && message.content.startsWith('[OFFER:');
    
    if (isOffer) {
      // Parse: [OFFER:transactionId:price:status]
      const parts = message.content.slice(7, -1).split(':');
      const transactionId = parts[0];
      const offerPriceRaw = parts[1];
      const offerStatus = parts[2];

      let parsedPrice = parseFloat(offerPriceRaw);
      if (isNaN(parsedPrice) || offerPriceRaw === 'None') {
        parsedPrice = parseFloat(message.item_price || chatItem?.price || 0);
      }
      
      const isMyMessage = message.sender_name === user?.username;
      
      return (
        <View style={[
          styles.offerCard, 
          isMyMessage ? styles.myOfferCard : styles.theirOfferCard
        ]}>
          <View style={styles.offerHeader}>
            <Ionicons name="pricetag" size={18} color={isMyMessage ? 'white' : COLORS.primary} />
            <Text style={[styles.offerHeaderText, { color: isMyMessage ? 'white' : COLORS.black }]}>
              {isMyMessage ? "You made an offer" : "Received an offer"}
            </Text>
          </View>
          
          <Text style={[styles.offerPriceText, { color: isMyMessage ? 'white' : COLORS.primary }]}>
            RM {parsedPrice.toFixed(2)}
          </Text>
          
          <View style={[styles.offerDivider, { backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)' }]} />
          
          <View style={styles.offerStatusContainer}>
            <Text style={[styles.offerStatusText, { color: isMyMessage ? '#E5E7EB' : COLORS.gray }]}>
              Status: <Text style={{ fontWeight: 'bold', color: offerStatus === 'COMPLETED' ? '#10B981' : (offerStatus === 'CANCELLED' ? '#EF4444' : '#F59E0B') }}>
                {offerStatus === 'COMPLETED' ? 'ACCEPTED' : (offerStatus === 'CANCELLED' ? 'DECLINED' : 'PENDING')}
              </Text>
            </Text>
          </View>
          
          {offerStatus === 'PENDING' && !isMyMessage && (
            <View style={styles.offerActionsRow}>
              <TouchableOpacity 
                style={[styles.offerBtn, styles.acceptBtn]} 
                onPress={() => handleUpdateOffer(transactionId, 'COMPLETED')}
              >
                <Text style={styles.offerBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.offerBtn, styles.declineBtn]} 
                onPress={() => handleUpdateOffer(transactionId, 'CANCELLED')}
              >
                <Text style={styles.offerBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {offerStatus === 'CANCELLED' && (
            <View style={styles.offerActionsRow}>
              <TouchableOpacity 
                style={[styles.offerBtn, { backgroundColor: COLORS.secondary, flex: 1 }]} 
                onPress={() => handleOpenCounter(message, parsedPrice)}
              >
                <Text style={styles.offerBtnText}>Counter Offer</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 }}>
            <Text style={[styles.messageTime, { color: isMyMessage ? '#E5E7EB' : COLORS.gray, marginRight: 4 }]}>
              {formatTime(message.timestamp)}
            </Text>
            {isMyMessage && (
              <Text style={{ fontSize: 10, color: message.is_read ? '#93C5FD' : '#E5E7EB', fontWeight: '500' }}>
                {message.is_read ? '✓✓ Seen' : '✓ Sent'}
              </Text>
            )}
          </View>
        </View>
      );
    }
    
    // Normal message bubble
    const isMine = message.sender_name === user?.username;
    return (
      <View style={[
        styles.messageBubble, 
        isMine ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={[
          styles.messageText, 
          isMine ? styles.myMessageText : styles.theirMessageText
        ]}>
          {message.content}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 }}>
          <Text style={[styles.messageTime, { marginRight: 4, marginBottom: 0 }]}>{formatTime(message.timestamp)}</Text>
          {isMine && (
            <Text style={{ fontSize: 10, color: message.is_read ? '#60A5FA' : '#9CA3AF', fontWeight: '500' }}>
              {message.is_read ? '✓✓ Seen' : '✓ Sent'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const presets = [
    "Hi, is this still available?",
    "What is your best price?",
    "Can we deal today?"
  ];

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{userName}</Text>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={22} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      {/* Contextual Item Header Bar */}
      {chatItem && (
        <View style={styles.itemHeader}>
          <Image source={{ uri: chatItem.display_image || chatItem.image }} style={styles.itemThumbnail} />
          <View style={styles.itemMeta}>
            <Text style={styles.itemName} numberOfLines={1}>{chatItem.name}</Text>
            <Text style={styles.itemPrice}>RM {parseFloat(chatItem.price || 0).toFixed(2)}</Text>
          </View>
          {chatItem.is_sold ? (
            <View style={styles.soldBadge}><Text style={styles.soldText}>SOLD</Text></View>
          ) : (
            user?.username !== chatItem.seller_name && user?.id !== chatItem.seller && (
              <TouchableOpacity 
                style={styles.makeOfferHeaderBtn}
                onPress={() => setShowOfferInput(true)}
              >
                <Text style={styles.makeOfferHeaderBtnText}>Make Offer</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {chatItem && chatItem.is_sold && (
        <View style={styles.soldGuardBanner}>
          <Ionicons name="information-circle" size={16} color="white" style={{ marginRight: 6 }} />
          <Text style={styles.soldGuardText}>This item has already been sold.</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Preset Message Chips */}
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
            contentContainerStyle={{ paddingHorizontal: 15 }}
          />
        </View>
      )}

      {showOfferInput && (
        <View style={styles.offerInputPanel}>
          <View style={styles.offerInputHeader}>
            <Text style={styles.offerInputTitle}>
              {isCounterOffer ? "Counter Offer" : "Make a Chat Offer"}
            </Text>
            <TouchableOpacity onPress={handleCloseOfferInput}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.offerInputBody}>
            <View style={styles.offerMiniPriceRow}>
              <Text style={styles.offerPriceLabel}>Your Offer: RM</Text>
              <TextInput
                style={styles.offerMiniInput}
                keyboardType="decimal-pad"
                value={offerPrice}
                onChangeText={setOfferPrice}
                placeholder={parseFloat(chatItem?.price || 0).toFixed(2)}
              />
            </View>
            
            {!isCounterOffer && (
              <View style={styles.offerMethodSelector}>
                <Text style={styles.methodTitle}>Payment Method:</Text>
                <View style={styles.methodButtons}>
                  <TouchableOpacity 
                    style={[styles.methodBtn, offerPaymentMethod === 'CASH' && styles.activeMethodBtn]}
                    onPress={() => setOfferPaymentMethod('CASH')}
                  >
                    <Text style={[styles.methodBtnText, offerPaymentMethod === 'CASH' && styles.activeMethodBtnText]}>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.methodBtn, offerPaymentMethod === 'WALLET' && styles.activeMethodBtn]}
                    onPress={() => setOfferPaymentMethod('WALLET')}
                  >
                    <Text style={[styles.methodBtnText, offerPaymentMethod === 'WALLET' && styles.activeMethodBtnText]}>Wallet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.methodBtn, offerPaymentMethod === 'TRANSFER' && styles.activeMethodBtn]}
                    onPress={() => setOfferPaymentMethod('TRANSFER')}
                  >
                    <Text style={[styles.methodBtnText, offerPaymentMethod === 'TRANSFER' && styles.activeMethodBtnText]}>Transfer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.sendOfferSubmitBtn} onPress={sendChatOffer}>
              <Text style={styles.sendOfferSubmitBtnText}>
                {isCounterOffer ? "Send Counter Offer" : "Send Custom Offer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.lightGray,
    zIndex: 10
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  messageList: { padding: 20, paddingBottom: 40 },
  messageBubble: { maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 15 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.lightGray, borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif' },
  myMessageText: { color: 'white' },
  theirMessageText: { color: COLORS.black },
  messageTime: { fontSize: 10, color: COLORS.gray, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white
  },
  attachBtn: { marginRight: 10 },
  input: { 
    flex: 1, 
    backgroundColor: COLORS.lightGray, 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 15,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif'
  },
  sendBtn: { 
    marginLeft: 10, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.secondary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  // Sticky Item Header
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 9
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif'
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  soldBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  soldText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  makeOfferHeaderBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  makeOfferHeaderBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Preset Reply Chips
  presetsRow: {
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  presetChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  presetChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Interactive Offer Card Bubbles
  offerCard: {
    width: '75%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
  },
  myOfferCard: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  theirOfferCard: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  offerPriceText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  offerDivider: {
    height: 1,
    marginVertical: 8,
  },
  offerStatusContainer: {
    marginBottom: 4,
  },
  offerStatusText: {
    fontSize: 12,
  },
  offerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  offerBtn: {
    flex: 0.48,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  declineBtn: {
    backgroundColor: COLORS.danger,
  },
  offerBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  offerInputPanel: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  offerInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerInputTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  offerInputBody: {
    gap: 12,
  },
  offerMiniPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  offerPriceLabel: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
    marginRight: 6,
  },
  offerMiniInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  offerMethodSelector: {
    marginTop: 4,
  },
  methodTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.gray + '40',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  activeMethodBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodBtnText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeMethodBtnText: {
    color: 'white',
  },
  sendOfferSubmitBtn: {
    backgroundColor: COLORS.secondary,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  sendOfferSubmitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  soldGuardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  soldGuardText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
});
