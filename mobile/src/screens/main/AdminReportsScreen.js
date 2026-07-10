import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const AdminReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await api.get('scam-reports/');
      setReports(res.data.results || res.data);
    } catch (err) {
      console.error('Fetch Reports Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const updateReportStatus = (reportId, newStatus) => {
    Alert.alert(
      "Update Status",
      `Mark this report as ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              if (newStatus === 'RESOLVED') {
                await api.post(`scam-reports/${reportId}/approve/`);
              } else if (newStatus === 'DISMISSED') {
                await api.post(`scam-reports/${reportId}/dismiss/`);
              } else {
                await api.patch(`scam-reports/${reportId}/`, { status: newStatus });
              }
              setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
              Alert.alert("Success", `Report marked as ${newStatus}.`);
            } catch (err) {
              Alert.alert("Error", "Could not update report.");
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return COLORS.danger;
      case 'INVESTIGATING': return '#F59E0B';
      case 'RESOLVED': return '#10B981';
      case 'DISMISSED': return COLORS.gray;
      default: return COLORS.black;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>

      <View style={styles.reportContent}>
        <View style={styles.row}>
          <Text style={styles.label}>Reporter:</Text>
          <Text style={styles.value}>@{item.reporter_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reported User:</Text>
          <Text style={[styles.value, styles.reportedName]}>@{item.reported_user_name}</Text>
        </View>
        {item.item_name && (
          <View style={styles.row}>
            <Text style={styles.label}>Item:</Text>
            <Text style={styles.value}>{item.item_name}</Text>
          </View>
        )}
        <Text style={styles.reasonLabel}>Reason:</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
      </View>

      <View style={styles.actions}>
        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => updateReportStatus(item.id, 'INVESTIGATING')}
          >
            <Text style={styles.actionBtnText}>Investigate</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'PENDING' || item.status === 'INVESTIGATING') && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => updateReportStatus(item.id, 'RESOLVED')}
            >
              <Text style={styles.actionBtnText}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.gray }]}
              onPress={() => updateReportStatus(item.id, 'DISMISSED')}
            >
              <Text style={styles.actionBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Reports</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{reports.length}</Text></View>
      </View>

      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>No reports found.</Text>
          </View>
        }
      />
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
  badge: { backgroundColor: COLORS.danger, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  list: { padding: 15 },
  reportCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  date: { fontSize: 12, color: COLORS.gray },
  reportContent: { marginBottom: 15 },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { fontSize: 13, color: COLORS.gray, width: 100 },
  value: { fontSize: 13, color: COLORS.black, fontWeight: '500' },
  reportedName: { color: COLORS.danger },
  reasonLabel: { fontSize: 13, color: COLORS.gray, marginTop: 10, marginBottom: 5 },
  reasonText: { fontSize: 14, color: COLORS.black, backgroundColor: COLORS.lightGray, padding: 12, borderRadius: 12, fontStyle: 'italic', opacity: 0.8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 15 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginLeft: 10 },
  actionBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.gray, marginTop: 15, fontSize: 16 }
});
