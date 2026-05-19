import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
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

  useEffect(() => {
    fetchMessages();
    // Real-time Polling: Check for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [userName]);

  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    const content = input;
    setInput('');

    try {
      // First, we need to find the partner's actual ID
      const userRes = await api.get(`users/`);
      const allUsers = userRes.data.results || userRes.data;
      const partner = allUsers.find(u => u.username === userName);
      
      if (partner) {
        await api.post('messages/', {
          receiver: partner.id,
          content: content
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

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble, 
            item.sender_name === user?.username ? styles.myMessage : styles.theirMessage
          ]}>
            <Text style={[
              styles.messageText, 
              item.sender_name === user?.username ? styles.myMessageText : styles.theirMessageText
            ]}>
              {item.content}
            </Text>
            <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

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
  sendBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' }
});
