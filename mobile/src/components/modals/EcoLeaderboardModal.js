import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import styles from '../../screens/main/styles/ExploreScreenStyles';

export const EcoLeaderboardModal = ({
  visible,
  onClose,
  loadingEco,
  ecoLeaderboardData
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.leaderboardModalContent}>
          <View style={styles.leaderboardHeader}>
            <Ionicons name="leaf" size={22} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.leaderboardTitle}>CO₂ Eco Contributors</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>

          {loadingEco ? (
            <ActivityIndicator color="#10B981" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ marginTop: 15 }} showsVerticalScrollIndicator={false}>
              {ecoLeaderboardData.map((user, index) => {
                const isTop3 = index < 3;
                const medalColors = ['#FBBF24', '#94A3B8', '#D97706'];
                return (
                  <View key={user.user_id || index} style={styles.leaderboardRow}>
                    <View style={styles.rankBadge}>
                      {isTop3 ? (
                        <Ionicons name="trophy" size={16} color={medalColors[index]} />
                      ) : (
                        <Text style={styles.rankText}>{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.leaderboardUserInfo}>
                      <Text style={styles.leaderboardUsername}>{user.username}</Text>
                      <Text style={styles.leaderboardTrust}>Trust: {user.trust_score}%</Text>
                    </View>
                    <View style={styles.leaderboardImpact}>
                      <Text style={styles.leaderboardCO2}>{user.total_eco_saved?.toFixed(1) || '0'} kg</Text>
                      <Text style={styles.leaderboardImpactSub}>CO₂ Saved</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
