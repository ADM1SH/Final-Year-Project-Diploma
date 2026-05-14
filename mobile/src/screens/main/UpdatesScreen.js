import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'New Interest!', message: 'Someone is interested in your item: Vintage Leather Satchel', time: '2h ago', icon: 'heart', color: COLORS.danger },
  { id: '2', title: 'Welcome to MyPreLove!', message: 'Start buying and selling with trust. Complete your profile to get verified.', time: '1d ago', icon: 'leaf', color: '#064E3B' },
  { id: '3', title: 'Carbon Milestone!', message: "You've saved 10kg of CO2 this month. Keep up the sustainable journey!", time: '2d ago', icon: 'stats-chart', color: COLORS.secondary },
  { id: '4', title: 'New Review', message: 'You received a 5-star review for your last sale.', time: '3d ago', icon: 'star', color: COLORS.warning },
];

export const UpdatesScreen = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.notificationItem}>
      <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Updates</Text>
      </View>
      <FlatList
        data={MOCK_NOTIFICATIONS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.black },
  list: { padding: 10 },
  notificationItem: { flexDirection: 'row', padding: 15, borderRadius: 16, backgroundColor: COLORS.white, marginBottom: 10, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  content: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  notifTime: { fontSize: 12, color: COLORS.gray },
  notifMessage: { fontSize: 14, color: COLORS.gray, lineHeight: 20 }
});
