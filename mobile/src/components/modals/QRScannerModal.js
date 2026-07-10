import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../../utils/constants';

export default function QRScannerModal({ visible, onClose, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setIsProcessing(false);
    }
  }, [visible]);

  if (!permission) {
    return <View />;
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    setIsProcessing(true);

    try {
      const payload = JSON.parse(data);
      if (payload.type === 'MYPRELOVE_TRANSACTION' && payload.transactionId) {

        await onScanSuccess(payload.transactionId);

      } else {
        Alert.alert('Invalid QR Code', 'This is not a valid MyPreLove meetup code.', [
          { text: 'Try Again', onPress: () => setScanned(false) }
        ]);
        setIsProcessing(false);
      }
    } catch (e) {
      Alert.alert('Scan Failed', 'Unrecognized QR format.', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isProcessing}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan Meetup QR</Text>
          <View style={{ width: 60 }} />
        </View>

        {!permission.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>We need your permission to show the camera.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.scanArea} />
              </View>
            </CameraView>
          </View>
        )}

        <View style={styles.footer}>
          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Verifying Transaction...</Text>
            </View>
          ) : (
            <Text style={styles.footerText}>
              Point your camera at the Buyer's QR code to verify the meetup and transfer funds.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  closeBtn: {
    width: 60,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  footer: {
    padding: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  footerText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.primary,
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
