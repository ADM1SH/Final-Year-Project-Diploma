import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

// Renders a human-readable preview for offer messages instead of the raw
// "[OFFER:txId:price:status]" string the chat protocol stores internally.
const formatMessagePreview = (content) => {
  if (!content || !content.startsWith('[OFFER:')) return content;

  const parts = content.slice(7, -1).split(':');
  const price = parseFloat(parts[1]);
  const offerStatus = parts[2];

  const priceLabel = !isNaN(price) ? `RM ${price.toFixed(2)}` : 'an offer';
  const statusLabel = {
    PENDING: 'Awaiting response',
    ACCEPTED: 'Accepted',
    PAID: 'Paid (escrow)',
    COMPLETED: 'Completed',
    CANCELLED: 'Declined',
  }[offerStatus] || offerStatus;

  return `🏷 Offer: ${priceLabel} · ${statusLabel}`;
};

export const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  const fetchChats = async () => {
    try {
      const res = await api.get('messages/');
      const messages = res.data.results || res.data;

      const conversations = {};
      messages.forEach(m => {
        const isMeSender = m.sender_name === user?.username;
        const partnerName = isMeSender ? m.receiver_name : m.sender_name;
        const partnerId = isMeSender ? m.receiver : m.sender;

        if (!conversations[partnerId] || new Date(m.timestamp) > new Date(conversations[partnerId].timestamp)) {
          conversations[partnerId] = {
            id: m.id,
            partnerId: partnerId,
            name: partnerName,
            message: formatMessagePreview(m.content),
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: m.is_read ? 0 : (m.receiver_name === user?.username ? 1 : 0),
            timestamp: m.timestamp
          };
        }
      });

      setChats(Object.values(conversations).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (err) {
      console.error('Fetch Chats Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [user])
  );

  useEffect(() => {
    let timeoutId;
    let isEffectMounted = true;
    
    const pollChats = async () => {
      if (!isEffectMounted) return;
      await fetchChats();
      if (isEffectMounted) {
        timeoutId = setTimeout(pollChats, 5000);
      }
    };

    pollChats();

    return () => {
      isEffectMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatDetail', { userName: item.name, userId: item.partnerId })}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, styles.placeholderAvatar]}>
          <Text style={styles.avatarInitial}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
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
  ), [navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, '#00421e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.logoText}>MyPrelove</Text>
          <TouchableOpacity onPress={fetchChats} style={styles.iconCircle}>
            <Ionicons name="reload" size={18} color={COLORS.primary}/>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.gray} />
            <TextInput
              placeholder="Search your conversations..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredChats}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderItem={renderItem}
          keyExtractor={item => item.name}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No active conversations yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  logoText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  searchSection: { paddingTop: 5, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 15, color: COLORS.black },
  list: { paddingBottom: 100, paddingTop: 10 },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  placeholderAvatar: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: 'white' },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  chatTime: { fontSize: 12, color: COLORS.gray },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { fontSize: 14, color: COLORS.gray, flex: 1 },
  badge: { backgroundColor: COLORS.secondary, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.gray, marginTop: 10 }
});
