import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export default function QRGeneratorModal({ visible, onClose, transaction }) {
  if (!transaction) return null;

  const qrData = JSON.stringify({
    type: 'MYPRELOVE_TRANSACTION',
    transactionId: transaction.id,
    amount: transaction.final_price
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.black} />
          </TouchableOpacity>

          <Text style={styles.title}>Meetup QR Code</Text>
          <Text style={styles.subtitle}>
            Show this code to the seller. Scanning it will release your funds and complete the sale.
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={220}
              color={COLORS.black}
              backgroundColor={COLORS.white}
            />
          </View>

          <Text style={styles.priceText}>RM {parseFloat(transaction.final_price).toFixed(2)}</Text>
          <Text style={styles.itemText}>{transaction.item_name}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 10,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  qrContainer: {
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
  }
});
