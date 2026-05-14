import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const MOCK_CHATS = [
  { id: '1', name: 'Elena Thorne', message: 'Is the Grade A Cashmere Sweater still available for pick up tomorrow?', time: '14:20', unread: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Marcus Chen', message: 'Thanks again! The packaging was so thoughtful. Love the eco-wrap.', time: 'Yesterday', unread: 0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Sarah Jenkins', message: 'Sent a photo', time: 'Tue', unread: 0, avatar: 'https://images.unsplash.com/photo-1438733002223-b57a84b1f1bf?q=80&w=150&auto=format&fit=crop' },
  { id: '4', name: 'David Brook', message: "I'll leave it at the doorstep with the security code we discussed.", time: 'Mon', unread: 0, avatar: null },
  { id: '5', name: 'Julian Rossi', message: 'Just confirmed the Carbon Saved badge on the listing!', time: 'Mon', unread: 2, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
];

export const ChatListScreen = ({ navigation }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => navigation.navigate('ChatDetail', { userName: item.name })}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.avatarInitial}>{item.name[0]}</Text>
          </View>
        )}
        {item.unread > 0 && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.chatMessage} numberOfLines={1}>{item.message}</Text>
          {item.unread > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>MyPrelove</Text>
        <TouchableOpacity><Ionicons name="camera-outline" size={24} color={COLORS.black}/></TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput placeholder="Search your conversations..." style={styles.searchInput} />
        </View>
      </View>

      <View style={styles.toggleSection}>
        <TouchableOpacity style={[styles.toggleBtn, styles.activeToggle]}><Text style={styles.activeToggleText}>Buying</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toggleBtn}><Text style={styles.toggleText}>Selling</Text></TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_CHATS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#064E3B' },
  searchSection: { padding: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 15, height: 45 },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 15 },
  toggleSection: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: COLORS.lightGray },
  activeToggle: { borderBottomColor: '#064E3B' },
  activeToggleText: { color: '#064E3B', fontWeight: 'bold' },
  toggleText: { color: COLORS.gray },
  list: { paddingBottom: 100 },
  chatItem: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  placeholderAvatar: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: 'bold', color: COLORS.gray },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2, borderColor: 'white' },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  chatTime: { fontSize: 12, color: COLORS.gray },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { fontSize: 14, color: COLORS.gray, flex: 1 },
  badge: { backgroundColor: COLORS.danger, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});
