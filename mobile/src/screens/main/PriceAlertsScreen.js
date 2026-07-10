import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { COLORS } from '../../utils/constants';

export const PriceAlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('price-alerts/');
      setAlerts(response.data);
    } catch (e) {
      console.error('Fetch Alerts Error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`price-alerts/${id}/`);
      setAlerts(alerts.filter(a => a.id !== id));
      Alert.alert("Success", "Price alert removed.");
    } catch (e) {
      console.error('Delete Alert Error:', e.message);
      Alert.alert("Error", "Could not remove alert.");
    }
  };

  const renderAlert = useCallback(({ item }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertInfo}>
        <Text style={styles.itemName}>{item.item_name || 'Item'}</Text>
        <Text style={styles.targetPrice}>Target: RM {parseFloat(item.target_price).toFixed(2)}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteAlert(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  ), [deleteAlert]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item.id.toString()}
          renderItem={renderAlert}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyText}>You have no active price alerts.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  listContainer: { padding: 20 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  alertInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.black, marginBottom: 4 },
  targetPrice: { fontSize: 14, color: COLORS.ecoText, fontWeight: 'bold' },
  deleteBtn: { padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: COLORS.gray, marginTop: 15 },
});
