import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import AuthService from '../../src/services/auth';
import QRService from '@/src/services/qr';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    console.log('Scanned data:', data);

    try {
      // Prefix-based type detection
      if (data.startsWith('https://qrhunter.com/item/')) {
        await handleGameItemScan(data);
      } else if (data.startsWith('https://qrhunter.com/encounter/')) {
        await handleGameEncounterScan(data);
      } else if (data.startsWith('arg://peer.')) {
        await handlePeerScan(data);
      } else if (data.startsWith('arg://login.')) {
        await handleLoginScan(data);
      } else if (data.startsWith('arg://secure.')) {
        await handleEncryptedScan(data); // Placeholder for future
      } else {
        // Default to public/commercial QR codes
        await handleRegularScan(data);
      }
    } catch (error) {
      console.error('Error handling QR scan:', error);
      setScanMessage('An error occurred while scanning. Please try again.');
      showModal();
    } finally {
      setTimeout(() => {
        scannedRef.current = false;
        setScanned(false);
      }, 2000);
    }
  };

  const handleLoginScan = async (data: string) => {
    try {
      const sessionId = data.replace('arg://login.', '');
      const response = await AuthService.completeQRLogin(sessionId);
      console.log('Login success:', response);
      setScanMessage('Login successful!');
      showModal();
    } catch (error) {
      console.error('Login failed:', error);
      setScanMessage('Login failed. Please try again.');
      showModal();
    }
  };

  const handleGameItemScan = async (data: string) => {
    try {
      const response = await QRService.scanQRCode(data); // Reuse existing method
      if (
        response.status === 'success' &&
        response.encounter_type === 'item_drop'
      ) {
        setScanMessage(
          `You found ${response.reward_data?.item_name || 'an item'}!`
        );
      } else {
        setScanMessage(response.message || 'Invalid item QR code.');
      }
      showModal();
    } catch (error) {
      console.error('Error during item scan:', error);
      setScanMessage('Error scanning item QR code.');
      showModal();
    }
  };

  const handleGameEncounterScan = async (data: string) => {
    try {
      const response = await QRService.scanQRCode(data); // Reuse existing method
      if (
        response.status === 'success' &&
        response.encounter_type === 'encounter'
      ) {
        const { difficulty_level, puzzle_type } = response.reward_data || {};
        setScanMessage(
          `Encounter started! Level ${difficulty_level || 'unknown'} ${
            puzzle_type || ''
          }.`
        );
      } else {
        setScanMessage(response.message || 'Invalid encounter QR code.');
      }
      showModal();
    } catch (error) {
      console.error('Error during encounter scan:', error);
      setScanMessage('Error scanning encounter QR code.');
      showModal();
    }
  };

  const handlePeerScan = async (data: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setScanMessage('Location permission is required to scan peer codes.');
        showModal();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Send to backend for validation
      const response = await QRService.validatePeerQR(
        data,
        latitude,
        longitude
      );

      if (response.status === 'success') {
        setScanMessage(`Match Success!\n\n${response.message || 'unknown'}.`);
      } else {
        setScanMessage(response.message || 'Failed to match peer.');
      }
      showModal();
    } catch (error) {
      console.error('Error during peer scan:', error);
      setScanMessage('An error occurred while scanning the peer code.');
      showModal();
    }
  };

  const handleEncryptedScan = async (data: string) => {
    // TODO: Implement when encrypted QR codes are fully specified
    setScanMessage('Encrypted QR codes are not yet supported.');
    showModal();
  };

  const handleRegularScan = async (data: string) => {
    try {
      console.log('Regular scan:', data);
      const response = await QRService.scanQRCode(data);
      console.log('response:', response);
      console.log('valid loc:', response?.location_valid);

      let message = 'This QR code is mysterious and unknown to the system.';

      if (!response?.location_valid) {
        message =
          'You are not in the correct location to get the rewards for this code.';
      } else {
        switch (response?.encounter_type) {
          case 'item_drop':
            message = `You have found ${response?.reward_data?.item_name}.`;
            break;
          case 'transportation':
            message = `You have been transported to ${response?.reward_data?.destination}.`;
            break;
          case 'encounter':
            let r_dat = response?.reward_data;
            message = `You have encountered a level ${r_dat?.difficulty_level} of type ${r_dat?.puzzle_type}`;
            break;
        }
      }

      setScanMessage(message);
      showModal();
    } catch (error) {
      console.error('Error during regular scan:', error);
      setScanMessage('An error occurred while scanning. Please try again.');
      showModal();
    }
  };

  const showModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setScanned(false);
    scannedRef.current = false;
    AuthService.getPlayerData();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text>QR scanning is not supported on web</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </CameraView>
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{scanMessage}</Text>
            <TouchableOpacity style={styles.button} onPress={closeModal}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
