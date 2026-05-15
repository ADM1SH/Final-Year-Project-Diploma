import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const UpdatesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

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

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastContent) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    try {
      await api.post('notifications/broadcast/', { title: broadcastTitle, content: broadcastContent });
      Alert.alert("Success", "Broadcast sent to all users!");
      setBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastContent('');
      fetchUpdates();
    } catch (err) {
      Alert.alert("Error", "Could not send broadcast.");
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notifCard, !item.is_read && styles.unreadCard]} 
      onPress={() => markAsRead(item.id)}
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
        {user?.username === 'superadmin' && (
          <TouchableOpacity style={styles.broadcastBtn} onPress={() => setBroadcastModal(true)}>
            <Ionicons name="megaphone" size={20} color="white" />
            <Text style={styles.broadcastText}>Broadcast</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>You're all caught up!</Text>
            </View>
          }
        />
      )}

      {/* Broadcast Modal for Superadmin */}
      <Modal visible={broadcastModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New System Broadcast</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Alert Title" 
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />
            <TextInput 
              style={[styles.modalInput, styles.textArea]} 
              placeholder="Message content..." 
              multiline
              value={broadcastContent}
              onChangeText={setBroadcastContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBroadcastModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleBroadcast}>
                <Text style={styles.sendText}>Send to All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#111827' },
  broadcastBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 5 },
  broadcastText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 12 },
  list: { padding: 15 },
  notifCard: { flexDirection: 'row', backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  unreadCard: { backgroundColor: '#ECFDF5', borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  notifInfo: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 15, color: '#374151' },
  notifTime: { fontSize: 11, color: COLORS.gray },
  notifMessage: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  boldText: { fontWeight: 'bold', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.gray, marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 15 },
  cancelText: { color: COLORS.gray, fontWeight: 'bold' },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10 },
  sendText: { color: 'white', fontWeight: 'bold' }
});
