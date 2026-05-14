import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const MOCK_MESSAGES = [
  { id: '1', senderId: 'seller', text: 'Hi! Yes, the satchel is still available.', time: '10:00 AM' },
  { id: '2', senderId: 'me', text: 'Great! Is the price negotiable?', time: '10:05 AM' },
  { id: '3', senderId: 'seller', text: 'I can do $80 if you can pick up today.', time: '10:06 AM' },
];

export const ChatDetailScreen = ({ route, navigation }) => {
  const { userName } = route.params || { userName: 'Seller' };
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const flatListRef = useRef();

  const sendMessage = () => {
    if (input.trim() === '') return;
    const newMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInput('');
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
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.senderId === 'me' ? styles.myMessage : styles.theirMessage]}>
            <Text style={[styles.messageText, item.senderId === 'me' ? styles.myMessageText : styles.theirMessageText]}>
              {item.text}
            </Text>
            <Text style={styles.messageTime}>{item.time}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current.scrollToEnd()}
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
