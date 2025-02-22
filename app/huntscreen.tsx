import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import AuthService from '@/src/services/auth';
import { calculateDistance, calculateBearing } from '@/utils/location';
import { Magnetometer } from 'expo-sensors';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function HuntScreen() {
  const { huntId } = useLocalSearchParams<{ huntId: string }>();
  const [hunt, setHunt] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  useEffect(() => {
    const loadHunt = async () => {
      setLoading(true);
      try {
        const token = await AuthService.getToken();
        const response = await fetch(`${API_URL}/hunts/hunt/${huntId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch hunt');
        const data = await response.json();
        setHunt(data);
      } catch (error) {
        console.error('Error loading hunt:', error);
        setModalMessage('Failed to load hunt.');
        setModalVisible(true);
      } finally {
        setLoading(false);
      }
    };

    const watchPosition = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setModalMessage('Location permission required.');
        setModalVisible(true);
        return;
      }
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000 },
        (position) => {
          setCurrentPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      );
    };

    const subscription = Magnetometer.addListener((data) => {
      // Calculate heading from magnetometer data
      let heading = Math.atan2(data.y, data.x) * (180 / Math.PI); // Convert to degrees
      heading = (heading + 360) % 360; // Normalize to 0-360
      setDeviceHeading(heading);
    });

    // Set magnetometer update interval (e.g., every 100ms)
    Magnetometer.setUpdateInterval(100);

    loadHunt();
    watchPosition();

    return () => {
      subscription.remove();
    };
  }, [huntId]);

  useEffect(() => {
    if (currentPosition && hunt?.current_step) {
      const dist = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        hunt.current_step.latitude,
        hunt.current_step.longitude
      );
      setDistance(dist);
      const bear = calculateBearing(
        currentPosition.latitude,
        currentPosition.longitude,
        hunt.current_step.latitude,
        hunt.current_step.longitude
      );
      setBearing(bear);
      //   console.log('bearing:', bear);
    }
  }, [currentPosition, hunt]);

  const startScan = () => {
    setIsScannerVisible(true); // Show the scanner modal
  };

  const handleHuntScan = async (qrCode: string) => {
    setLoading(true);
    try {
      const token = await AuthService.getToken();
      console.log('payload:', {
        hunt_id: huntId,
        qr_code: qrCode,
        latitude: currentPosition?.latitude,
        longitude: currentPosition?.longitude,
      });
      const response = await fetch(`${API_URL}/hunts/scan`, {
        // Use API_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hunt_id: huntId,
          qr_code: qrCode,
          latitude: currentPosition?.latitude,
          longitude: currentPosition?.longitude,
        }),
      });
      if (!response.ok) throw new Error('Failed to scan');
      const data = await response.json();
      if (data.status === 'success') {
        setHunt((prev: any) => ({ ...prev, current_step: data.next_step }));
        setModalMessage('Step completed! On to the next one.');
        setModalVisible(true);
      } else if (data.status === 'completed') {
        setModalMessage(`Hunt completed! Reward: ${data.reward} points`);
        setModalVisible(true);
        setTimeout(() => router.push('/(tabs)/profile'), 2000);
      }
    } catch (error) {
      console.error('Error scanning hunt QR:', error);
      setModalMessage('Failed to validate QR. Try again.');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const cancelHunt = () => {
    // For now, just navigate back to the tabs screen
    router.push('/(tabs)');
  };

  if (loading || !hunt) {
    return (
      <ActivityIndicator size="large" color="#4c669f" style={styles.loading} />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{hunt.name}</Text>
      {hunt.current_step ? (
        <>
          <Text style={styles.info}>
            Distance: {distance ? `${distance.toFixed(0)}m` : 'Calculating...'}
          </Text>
          <Text style={styles.info}>
            Hint: {hunt.current_step.hint || 'No hint available'}
          </Text>
          <View style={styles.arrowContainer}>
            <View
              style={[
                styles.arrowWrapper,
                {
                  transform: [
                    { rotate: `${(bearing ?? 0) - deviceHeading}deg` },
                  ],
                },
              ]}
            >
              <View style={styles.arrowHead} />
              <View style={styles.arrowShaft} />
            </View>
          </View>
          {distance && distance < 50 && (
            <TouchableOpacity style={styles.scanButton} onPress={startScan}>
              <Text style={styles.buttonText}>Scan Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#ff4444' }]} // Red color to indicate cancel
            onPress={cancelHunt}
          >
            <Text style={styles.buttonText}>Resume Later</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.info, { fontSize: 34, marginVertical: 100 }]}>
            Hunt Completed!
          </Text>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#ff4444' }]} // Red color to indicate cancel
            onPress={cancelHunt}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </>
      )}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <HuntScanner
        visible={isScannerVisible}
        onScan={(data) => handleHuntScan(data)}
        onClose={() => setIsScannerVisible(false)}
      />
    </View>
  );
}

const HuntScanner = ({
  visible,
  onScan,
  onClose,
}: {
  visible: boolean;
  onScan: (data: string) => void;
  onClose: () => void;
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(true);
  //   const [scanned, setScanned] = useState<boolean>(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    console.log('Scanned data:', data);
    onScan(data); // Pass the scanned QR code to handleHuntScan
    onClose(); // Close the scanner
    setTimeout(() => (scannedRef.current = false), 2000); // Reset after 2s
  };

  if (hasPermission === null) {
    return (
      <View style={styles.modalContainer}>
        <Text style={styles.modalText}>Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.modalContainer}>
        <Text style={styles.modalText}>No camera access granted.</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.scannerModalContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </CameraView>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginTop: '15%',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#555',
    marginVertical: 10,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#4c669f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
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
  arrowContainer: {
    width: '100%', // Larger container for the full arrow
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  arrowWrapper: {
    width: 40, // Width of the entire arrow (head base width)
    height: 60, // Height of shaft + head
    justifyContent: 'flex-end', // Puts shaft at bottom, head at top
    alignItems: 'center',
  },
  arrowShaft: {
    width: 10, // Thickness of the shaft
    height: 40, // Length of the shaft
    backgroundColor: '#4c669f', // Blue to match your theme
    borderRadius: 2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 20, // Half of the head’s base width
    borderRightWidth: 20, // Half of the head’s base width
    borderBottomWidth: 20, // Height of the triangular head
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4c669f', // Blue triangle
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '80%',
    height: '60%',
    borderRadius: 10,
    overflow: 'hidden',
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
  closeButton: {
    backgroundColor: '#dc3545', // Matches ScanScreen’s cancelButton
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
});
