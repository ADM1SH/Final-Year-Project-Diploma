import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../screens/main/styles/ProfileScreenStyles';
import { COLORS } from '../../utils/constants';

export const TrustScoreModal = ({ visible, onClose, userStats, profileData }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.trustModalHeader}>
              <View style={styles.trustHeaderTitleRow}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Trust Score Breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => onClose()} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.trustOverallContainer}>
              <Text style={styles.trustOverallLabel}>Overall Trust Level</Text>
              <View style={styles.trustOverallValueRow}>
                <Text style={styles.trustOverallValue}>
                  {userStats?.trust_score || profileData?.trust_score || 0}%
                </Text>
                <Text style={styles.trustOverallGrade}>
                  {(() => {
                    const score = userStats?.trust_score || profileData?.trust_score || 0;
                    if (score >= 90) return 'Excellent';
                    if (score >= 70) return 'Good';
                    if (score >= 50) return 'Fair';
                    return 'Needs Improvement';
                  })()}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.trustBreakdownScroll} showsVerticalScrollIndicator={false}>
              {}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Integrity</Text>
                    <Text style={styles.abiWeight}> (20 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {profileData?.is_verified ? '20' : '0'} / 20
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: profileData?.is_verified ? '100%' : '0%',
                        backgroundColor: '#059669'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.abiDescription}>
                  {profileData?.is_verified
                    ? "✓ User is verified by Admin (+20 points)."
                    : "✗ User is not verified yet (0 points). Admin verification is required."}
                </Text>
              </View>

              {}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Ability</Text>
                    <Text style={styles.abiWeight}> (30 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {Math.min(30, (userStats?.items_sold || 0) * 3)} / 30
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${(Math.min(30, (userStats?.items_sold || 0) * 3) / 30) * 100}%`,
                        backgroundColor: '#2563EB'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.abiDescription}>
                  Earn 3 points per successful sale (up to 30). Completed sales: {userStats?.items_sold || 0}.
                </Text>
              </View>

              {}
              <View style={styles.abiSection}>
                <View style={styles.abiHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.abiName}>Benevolence</Text>
                    <Text style={styles.abiWeight}> (50 pts max)</Text>
                  </View>
                  <Text style={styles.abiScore}>
                    {((userStats?.avg_rating || 0.0) * 10).toFixed(1)} / 50
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${((userStats?.avg_rating || 0.0) * 10 / 50) * 100}%`,
                        backgroundColor: '#D97706'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.abiDescription}>
                  Calculated as Average Buyer Rating × 10. Current Average Rating: {userStats?.avg_rating?.toFixed(1) || '0.0'} / 5.0.
                </Text>
              </View>

              {}
              <View style={styles.trustInfoCard}>
                <Ionicons name="information-circle" size={20} color="#065F46" style={{ marginRight: 8 }} />
                <Text style={styles.trustInfoText}>
                  The ABI (Integrity, Ability, Benevolence) model calculates trust based on identity verification, completed transactions, and community feedback.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
  );
};
