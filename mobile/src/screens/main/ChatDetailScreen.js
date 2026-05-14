import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const ChatDetailScreen = ({ route, navigation }) => {
  const { userName, sellerId } = route.params || { userName: 'User', sellerId: null };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef();

  const fetchMessages = async () => {
    try {
      const res = await api.get('messages/');
      // Filter for this specific conversation (sender or receiver)
      const data = res.data.results || res.data;
      const conversation = data.filter(m => 
        (m.sender_name === userName || m.receiver_name === userName)
      );
      setMessages(conversation);
    } catch (err) {
      console.error('Fetch Messages Error:', err.message);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Real-time Polling: Check for new messages every 4 seconds
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    // Optimistic Update
    const tempId = Date.now().toString();
    const newMessage = {
      id: tempId,
      sender_name: 'me',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
    const currentInput = input;
    setInput('');

    try {
      // Find receiver ID (In a real app, this is passed in params)
      // For demo, we'll try to post to a default or the sellerId if available
      await api.post('messages/', {
        receiver: sellerId || 2, // Fallback to a demo ID
        content: currentInput
      });
      fetchMessages(); // Refresh from server
    } catch (e) {
      console.error('Send Error:', e.message);
    }
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
            (item.sender_name === 'adamanwar' || item.sender_name === 'me') ? styles.myMessage : styles.theirMessage
          ]}>
            <Text style={[
              styles.messageText, 
              (item.sender_name === 'adamanwar' || item.sender_name === 'me') ? styles.myMessageText : styles.theirMessageText
            ]}>
              {item.content}
            </Text>
            <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  messageList: { padding: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 15 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.lightGray },
  messageText: { fontSize: 15 },
  myMessageText: { color: 'white' },
  theirMessageText: { color: COLORS.black },
  messageTime: { fontSize: 10, color: COLORS.gray, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: 35, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  attachBtn: { marginRight: 10 },
  input: { flex: 1, backgroundColor: COLORS.lightGray, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
  sendBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});
