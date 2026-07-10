import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import styles from '../../screens/main/styles/ProfileScreenStyles';

export const SellerReportModal = ({ visible, onClose, reportReason, setReportReason, onSubmit, reporting, username }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Seller</Text>
            <Text style={styles.modalSub}>Why are you reporting {username}?</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="e.g. Fraudulent behavior, misleading items..."
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportSubmitBtn} onPress={onSubmit} disabled={reporting}>
                {reporting ? <ActivityIndicator color="white" /> : <Text style={styles.reportSubmitText}>Submit Report</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  );
};
