import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Broadcast States
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('profiles/marketplace_stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Admin Stats Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastContent) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    try {
      setSubmittingBroadcast(true);
      await api.post('notifications/broadcast/', { title: broadcastTitle, content: broadcastContent });
      Alert.alert("Success", "Broadcast sent to all users!");
      setBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastContent('');
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send broadcast.");
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.danger}/></View>;

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || '0', icon: 'people', color: '#3B82F6' },
    { label: 'Active Items', value: stats?.active_items || '0', icon: 'cube', color: '#10B981' },
    { label: 'Reports', value: stats?.reports_pending || '0', icon: 'warning', color: '#EF4444' },
    { label: 'Sales', value: stats?.total_sales || '0', icon: 'cash', color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Control Center</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>SUPERADMIN</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Real-Time Platform Health</Text>
        <View style={styles.statsGrid}>
          {statCards.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Platform Controls</Text>
        <View style={styles.controlsList}>
          <TouchableOpacity style={styles.controlItem} onPress={() => navigation.navigate('AdminUserManagement')}>
            <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            <Text style={styles.controlText}>User Accounts</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => navigation.navigate('AdminReports')}>
            <Ionicons name="warning-outline" size={22} color={COLORS.danger} />
            <Text style={styles.controlText}>User Reports</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => navigation.navigate('AdminItemManagement')}>
            <Ionicons name="cube-outline" size={22} color="#10B981" />
            <Text style={styles.controlText}>Marketplace Inventory</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => setBroadcastModal(true)}>
            <Ionicons name="megaphone-outline" size={22} color="#F59E0B" />
            <Text style={styles.controlText}>Broadcast Announcement</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => navigation.navigate('MainTabs', { screen: 'Chat' })}>
            <Ionicons name="chatbubbles-outline" size={22} color="#3B82F6" />
            <Text style={styles.controlText}>Monitor Conversations</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <Ionicons name="list" size={22} color={COLORS.black} />
            <Text style={styles.controlText}>Manage All Listings</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>Advanced dispute resolution and system config are managed via the web-based Django Admin portal.</Text>
        </View>
      </ScrollView>

      {/* Broadcast Modal for Superadmin */}
      <Modal visible={broadcastModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.broadcastModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleText}>New System Broadcast</Text>
              <TouchableOpacity onPress={() => setBroadcastModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={{ marginVertical: 15 }}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Broadcast Title"
                placeholderTextColor={COLORS.gray}
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
              />
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Content</Text>
              <TextInput
                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Write your system announcement here..."
                placeholderTextColor={COLORS.gray}
                multiline
                value={broadcastContent}
                onChangeText={setBroadcastContent}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBroadcastModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleBroadcast} disabled={submittingBroadcast}>
                {submittingBroadcast ? <ActivityIndicator color="white" /> : <Text style={styles.sendText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.background
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginLeft: 15, 
    flex: 1, 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  badge: { backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15, 
    marginTop: 10,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { 
    width: '48%', 
    backgroundColor: COLORS.white, 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 15, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.black },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4, fontWeight: '600' },
  controlsList: { 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 8, 
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  controlItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  controlText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500', color: COLORS.black },
  infoBanner: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.lightGray, 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12, color: COLORS.gray, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  broadcastModalContent: { backgroundColor: 'white', borderRadius: 20, width: '90%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 12, marginBottom: 12 },
  modalTitleText: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.black, marginBottom: 6 },
  textInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.black, borderWidth: 1, borderColor: '#CBD5E1' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  cancelText: { fontWeight: 'bold', color: COLORS.gray },
  sendBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  sendText: { color: 'white', fontWeight: 'bold' }
});
