import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export const AdminDashboardScreen = ({ navigation }) => {
  const stats = [
    { label: 'Total Users', value: '1,284', icon: 'people', color: '#3B82F6' },
    { label: 'Active Items', value: '452', icon: 'cube', color: '#10B981' },
    { label: 'Reports', value: '12', icon: 'warning', color: '#EF4444' },
    { label: 'Revenue', value: 'RM 12k', icon: 'cash', color: '#F59E0B' },
  ];

  const recentActivities = [
    { id: '1', type: 'REPORT', user: 'ahmadzaki', target: 'Item #12', desc: 'Suspicious price', time: '2m ago' },
    { id: '2', type: 'SALE', user: 'nurulizzah', target: 'Item #45', desc: 'Completed', time: '15m ago' },
    { id: '3', type: 'USER', user: 'new_user_1', target: 'Profile', desc: 'Registration', time: '1h ago' },
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
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
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
          <TouchableOpacity style={styles.controlItem} onPress={() => Alert.alert("Admin Info", "Viewing identity verifications is disabled in prototype mode.")}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            <Text style={styles.controlText}>Identity Verifications</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => Alert.alert("Admin Info", "Viewing scam reports is disabled in prototype mode.")}>
            <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
            <Text style={styles.controlText}>Review Scam Reports</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>12</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlItem} onPress={() => Alert.alert("Admin Info", "System configuration is locked for demo.")}>
            <Ionicons name="settings" size={22} color={COLORS.black} />
            <Text style={styles.controlText}>System Configuration</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Real-time Activity</Text>
        {recentActivities.map(activity => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityIndicator} />
            <View style={styles.activityContent}>
              <Text style={styles.activityMain}>
                <Text style={styles.boldText}>{activity.user}</Text> - {activity.desc} on {activity.target}
              </Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  countBadge: { backgroundColor: COLORS.danger, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  countText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  activityItem: { flexDirection: 'row', paddingVertical: 15, borderLeftWidth: 2, borderLeftColor: '#E5E7EB', paddingLeft: 20, marginLeft: 10 },
  activityIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, position: 'absolute', left: -6, top: 22 },
  activityContent: { flex: 1 },
  activityMain: { fontSize: 14, color: '#374151', lineHeight: 20 },
  activityTime: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  boldText: { fontWeight: 'bold', color: '#111827' }
});
