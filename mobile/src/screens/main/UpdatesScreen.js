/**
 * File: UpdatesScreen.js
 * Description: Notification centre displaying real-time alerts, purchase updates,
 *              and system messages with deep-link navigation.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const UpdatesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUpdates();
    setRefreshing(false);
  };

  const fetchUpdates = async () => {
    try {
      const res = await api.get('notifications/');
      setNotifications(res.data.results || res.data);
    } catch (err) {
      console.error('Fetch Updates Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUpdates();
      // Auto-read: Mark all notifications as read when screen is opened
      const autoRead = async () => {
        try {
          await api.post('notifications/mark_all_read/');
          // Optional: Local state update to show everything as read immediately
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {}
      };
      autoRead();
    }, [])
  );

  // Real-time Polling: Check for new alerts every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchUpdates, 5000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.post(`notifications/${id}/mark_as_read/`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {}
  };

  const handleNotificationPress = async (item) => {
    await markAsRead(item.id);
    
    const title = item.title.toLowerCase();
    const content = item.content.toLowerCase();

    // Direct deep-linking using related_id if available
    if (item.related_id) {
      if (title.includes('message')) {
        // Find the username from the content for ChatDetail
        const parts = item.content.split('from ');
        if (parts.length > 1) {
          const partnerName = parts[1].replace('.', '').trim();
          navigation.navigate('ChatDetail', { userName: partnerName, userId: item.related_id });
        } else {
          navigation.navigate('Chat');
        }
      } 
      else if (title.includes('listing') || title.includes('interest') || title.includes('sale') || title.includes('purchase')) {
        // Items always go to ItemDetail
        navigation.navigate('ItemDetail', { itemId: item.related_id });
      }
    } 
    // Fallback logic
    else {
      if (title.includes('message')) {
        navigation.navigate('Chat');
      } else if (title.includes('listing')) {
        navigation.navigate('Home');
      } else if (title.includes('sale') || title.includes('purchase') || title.includes('interest') || content.includes('review')) {
        navigation.navigate('For You');
      }
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notifCard, !item.is_read && styles.unreadCard]} 
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.title.toLowerCase().includes('message') ? "chatbubble" : "notifications"} 
          size={20} 
          color={item.is_read ? COLORS.gray : COLORS.primary} 
        />
      </View>
      <View style={styles.notifInfo}>
        <View style={styles.notifHeader}>
          <Text style={[styles.notifTitle, !item.is_read && styles.boldText]}>{item.title}</Text>
          <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.content}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>System & Activity</Text>
          <Text style={styles.headerTitle}>Updates</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={COLORS.lightGray} style={{ opacity: 0.6 }} />
              <Text style={[styles.emptyText, { fontWeight: '600', color: COLORS.black, marginTop: 10 }]}>No New Alerts</Text>
              <Text style={[styles.emptyText, { fontSize: 13, color: COLORS.gray, marginTop: 4, paddingHorizontal: 20 }]}>You are completely caught up! We'll notify you when you receive new messages, custom offers, or community activity.</Text>
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
    paddingBottom: 20, 
    backgroundColor: COLORS.background, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end' 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: COLORS.gray, 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    letterSpacing: 1.5,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-SemiBold'
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'PlayfairDisplay-Bold'
  },
  broadcastBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.danger, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  broadcastText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 12 },
  list: { padding: 15, paddingBottom: 130 },

  notifCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  unreadCard: { 
    backgroundColor: COLORS.eco, 
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.primary 
  },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.lightGray, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  notifInfo: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 15, color: COLORS.black, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif' },
  notifTime: { fontSize: 11, color: COLORS.gray },
  notifMessage: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  boldText: { fontWeight: 'bold', color: COLORS.black },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.gray, marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { 
    backgroundColor: COLORS.background, 
    borderRadius: 20, 
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginBottom: 20, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  modalInput: { 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15, 
    fontSize: 16, 
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  cancelBtn: { padding: 15 },
  cancelText: { color: COLORS.gray, fontWeight: 'bold' },
  sendBtn: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 20, 
    marginLeft: 10 
  },
  sendText: { color: 'white', fontWeight: 'bold' }
});
