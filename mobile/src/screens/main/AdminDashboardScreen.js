import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import api from '../../api/client';

export const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 15, flex: 1 },
  badge: { backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  controlsList: { backgroundColor: 'white', borderRadius: 16, padding: 10, marginBottom: 20 },
  controlItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  controlText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500' },
  infoBanner: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 15, borderRadius: 12, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#1E40AF', lineHeight: 18 }
});
