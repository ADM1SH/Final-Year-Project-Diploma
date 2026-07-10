import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import AppImage from '../../components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const AdminUserManagementScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, profilesRes] = await Promise.all([
        api.get('users/'),
        api.get('profiles/')
      ]);
      setUsers(usersRes.data.results || usersRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
      console.error('Fetch Admin User Data Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteUser = (userId, username) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to remove ${username}? This action is permanent.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`users/${userId}/`);
              setUsers(users.filter(u => u.id !== userId));
              setProfiles(profiles.filter(p => p.user !== userId));
              Alert.alert("Success", "User removed successfully.");
            } catch (err) {
              Alert.alert("Error", "Could not delete user.");
            }
          }
        }
      ]
    );
  };

  const handleApprove = async (userId, username) => {
    try {
      await api.post(`profiles/${userId}/approve_verification/`);
      Alert.alert("Success", `Approved verification for ${username}.`);
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Could not approve verification.");
    }
  };

  const handleReject = async (userId, username) => {
    try {
      await api.post(`profiles/${userId}/reject_verification/`);
      Alert.alert("Success", `Rejected verification for ${username}.`);
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Could not reject verification.");
    }
  };

  const handleSuspend = (userId, username) => {
    Alert.alert(
      "Suspend Account",
      `Are you sure you want to suspend ${username}? They will be unable to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`profiles/${userId}/suspend/`, { reason: 'Suspended by admin.' });
              Alert.alert("Suspended", `${username} has been suspended.`);
              fetchData();
            } catch (err) {
              Alert.alert("Error", "Could not suspend user.");
            }
          },
        },
      ]
    );
  };

  const handleUnsuspend = async (userId, username) => {
    try {
      await api.post(`profiles/${userId}/unsuspend/`);
      Alert.alert("Reinstated", `${username}'s account has been restored.`);
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Could not unsuspend user.");
    }
  };

  const pendingProfiles = profiles.filter(p => p.verification_document && !p.is_verified);

  const renderItem = ({ item }) => {
    if (activeTab === 'All') {
      const profile = profiles.find(p => p.user === item.id);
      const isSuspended = !item.is_active;
      return (
        <View style={[styles.userCard, isSuspended && { opacity: 0.7, borderLeftWidth: 3, borderLeftColor: '#EF4444' }]}>
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.username}>{item.username}</Text>
              {profile?.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              )}
              {isSuspended && (
                <View style={styles.suspendedBadge}>
                  <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
                </View>
              )}
            </View>
            <Text style={styles.email}>{item.email}</Text>
            {profile && (
              <Text style={styles.trustScoreText}>ABI Trust Score: {profile.trust_score} pts</Text>
            )}
          </View>
          <View style={styles.actions}>
            {isSuspended ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleUnsuspend(item.id, item.username)}>
                <Ionicons name="lock-open-outline" size={20} color="#10B981" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleSuspend(item.id, item.username)}>
                <Ionicons name="ban-outline" size={20} color="#F59E0B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => deleteUser(item.id, item.username)}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      const user = users.find(u => u.id === item.user);
      const email = user ? user.email : 'No email';
      return (
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{email}</Text>
            {item.verification_document && (
              <TouchableOpacity onPress={() => setSelectedDoc(item.verification_document)} style={styles.viewDocBtn}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                <Text style={styles.viewDocLink}>View Uploaded Card</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.verifyBtn, styles.approveBtn]}
              onPress={() => handleApprove(item.user, item.username)}
            >
              <Text style={styles.verifyBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtn, styles.rejectBtn]}
              onPress={() => handleReject(item.user, item.username)}
            >
              <Text style={styles.verifyBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
      </View>

      {}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'All' && styles.activeTab]}
          onPress={() => setActiveTab('All')}
        >
          <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>
            All Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Pending' && styles.activeTab]}
          onPress={() => setActiveTab('Pending')}
        >
          <Text style={[styles.tabText, activeTab === 'Pending' && styles.activeTabText]}>
            Pending ({pendingProfiles.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'All' ? users : pendingProfiles}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.gray} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>No users found.</Text>
          </View>
        }
      />

      {}
      <Modal visible={!!selectedDoc} transparent animationType="fade">
        <View style={styles.docModalOverlay}>
          <View style={styles.docModalContent}>
            <Text style={styles.docModalTitle}>Verification ID Document</Text>
            {selectedDoc && (
              <AppImage
                source={{ uri: selectedDoc }}
                style={styles.docModalImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closeDocModalBtn}
              onPress={() => setSelectedDoc(null)}
            >
              <Text style={styles.closeDocModalText}>Close Preview</Text>
            </TouchableOpacity>
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
    paddingBottom: 15,
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background
  },
  tab: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600'
  },
  activeTabText: {
    color: COLORS.primary
  },
  list: { padding: 20 },
  userCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  userInfo: { flex: 1, marginRight: 10 },
  username: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  email: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  trustScoreText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  suspendedBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  suspendedBadgeText: { fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  viewDocLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  actions: { flexDirection: 'row' },
  actionBtn: { marginLeft: 15, padding: 5 },
  pendingActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  verifyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    alignItems: 'center',
    minWidth: 80
  },
  approveBtn: {
    backgroundColor: COLORS.primary
  },
  rejectBtn: {
    backgroundColor: COLORS.danger
  },
  verifyBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    marginTop: 10,
    color: COLORS.gray
  },
  docModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  docModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    alignItems: 'center'
  },
  docModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.black
  },
  docModalImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20
  },
  closeDocModalBtn: {
    backgroundColor: COLORS.gray,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  closeDocModalText: {
    color: 'white',
    fontWeight: 'bold'
  }
});
