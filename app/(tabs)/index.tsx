import { useEffect, useState } from 'react';
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

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // setScanActive(true);
    console.log('Scanned data:', data);

    let parsedData;

    try {
      parsedData = JSON.parse(data); // Try parsing if it's a JSON string
    } catch (e) {
      console.warn('Invalid QR data format. Treating as a regular scan.');
      await handleRegularScan(data);
      // setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Check for missing or unexpected values
    if (!parsedData.type || typeof parsedData.type !== 'string') {
      console.warn(
        'Missing or invalid type field. Treating as a regular scan.'
      );
      await handleRegularScan(data);
      // setTimeout(() => setScanned(false), 2000);
      return;
    }

    switch (parsedData.type) {
      case 'login':
        if (
          !parsedData.session_id ||
          typeof parsedData.session_id !== 'string'
        ) {
          console.warn('Missing or invalid session_id for login.');
          await handleRegularScan(data);
        } else {
          await handleWebsiteLogin(parsedData.session_id);
        }
        break;

      case 'peer':
        await handlePeerScan(data);
        break;

      default:
        console.warn(
          `Unknown QR type: ${parsedData.type}. Treating as a regular scan.`
        );
        await handleRegularScan(data);
        break;
    }

    //setTimeout(() => setScanned(false), 2000);
  };

  const handleWebsiteLogin = async (data: string) => {
    try {
      const sessionId = data; //.replace('lgin-', '');
      const response = await AuthService.completeQRLogin(sessionId);
      console.log('Login success:', response);
      // TODO: Show success feedback to user
    } catch (error) {
      console.error('Login failed:', error);
      // TODO: Show error feedback to user
    }
  };

  const handlePeerScan = async (data: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Extract coordinates from peer code
      const [peerLat, peerLng] = data
        .replace('peer://', '')
        .split(',')
        .map(Number);

      // Calculate distance between points
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        peerLat,
        peerLng
      );

      if (distance > 100) {
        console.error('Too far from peer');
        // TODO: Show distance error to user
        return;
      }

      // TODO: Send peer scan to server
      console.log('Valid peer scan:', { data, location });
    } catch (error) {
      console.error('Error during peer scan:', error);
    }
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

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const showModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setScanned(false);
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
