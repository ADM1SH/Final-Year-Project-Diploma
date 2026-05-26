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
    // Real-time Polling: Check for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
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

  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    const content = input;
    setInput('');

    try {
      const userRes = await api.get(`users/`);
      const allUsers = userRes.data.results || userRes.data;
      const partner = allUsers.find(u => u.username === userName);
      
      if (partner) {
        await api.post('messages/', {
          receiver: partner.id,
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

  const sendPresetMessage = async (text) => {
    try {
      const userRes = await api.get(`users/`);
      const allUsers = userRes.data.results || userRes.data;
      const partner = allUsers.find(u => u.username === userName);
      
      if (partner) {
        await api.post('messages/', {
          receiver: partner.id,
          content: text,
          item: chatItem?.id
        });
        fetchMessages(); // Refresh immediately
      }
    } catch (e) {
      console.error('Send Preset Error:', e.message);
    }
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          
          <Text style={[styles.messageTime, { color: isMyMessage ? '#E5E7EB' : COLORS.gray }]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      );
    }
    
    // Normal message bubble
    return (
      <View style={[
        styles.messageBubble, 
        message.sender_name === user?.username ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={[
          styles.messageText, 
          message.sender_name === user?.username ? styles.myMessageText : styles.theirMessageText
        ]}>
          {message.content}
        </Text>
        <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
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
                onPress={() => navigation.navigate('Checkout', { item: chatItem })}
              >
                <Text style={styles.makeOfferHeaderBtnText}>Make Offer</Text>
              </TouchableOpacity>
            )
          )}
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
              <TouchableOpacity style={styles.presetChip} onPress={() => sendPresetMessage(presetText)}>
                <Text style={styles.presetChipText}>{presetText}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 15 }}
          />
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
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.lightGray,
    zIndex: 10
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  messageList: { padding: 20, paddingBottom: 40 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 15 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#064E3B', borderBottomRightRadius: 2 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: 'white' },
  theirMessageText: { color: COLORS.black },
  messageTime: { fontSize: 10, color: COLORS.gray, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: 35, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  attachBtn: { marginRight: 10 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
  sendBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },

  // Sticky Item Header
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFDFB',
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  soldBadge: {
    backgroundColor: '#EF4444',
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
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  makeOfferHeaderBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Preset Reply Chips
  presetsRow: {
    paddingVertical: 10,
    backgroundColor: '#FAFDFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  presetChip: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#064E3B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  presetChipText: {
    color: '#064E3B',
    fontSize: 12,
    fontWeight: '500',
  },

  // Interactive Offer Card Bubbles
  offerCard: {
    width: '75%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
  },
  myOfferCard: {
    alignSelf: 'flex-end',
    backgroundColor: '#064E3B',
    borderColor: '#043427',
  },
  theirOfferCard: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAFDFB',
    borderColor: '#E5E7EB',
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
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  offerBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
