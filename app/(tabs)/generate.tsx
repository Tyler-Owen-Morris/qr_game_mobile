import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import WebSocketService from '../../src/services/websocket';
import QRService, { PeerQRResponse } from '../../src/services/qr';
import { calculateDistance } from '../../utils/location';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/src/services/auth';
import { router } from 'expo-router';

export default function GenerateScreen() {
  const [qrData, setQrData] = useState<string>('');
  const [peerStatus, setPeerStatus] = useState<string>('');
  const [originLocation, setOriginLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0); // Start at 0 until generated
  const [isValid, setIsValid] = useState<boolean>(true);
  const isOnCooldown = useRef<boolean>(false);

  useEffect(() => {
    // initial code generation on screen load.
    generatePeerCode();
  }, []);

  useEffect(() => {
    // websocket setup
    if (Platform.OS !== 'web') {
      WebSocketService.connect();
      const handleMessage = (data: any) => {
        console.log('socketmsg', data.event, data.message);
        if (data.event === 'peer_pairing_success') {
          setPeerStatus(data.message || 'Peer connection successful!');
          setTimeout(() => {
            setPeerStatus('');
            const player_data = AuthService.getPlayerData();
            if (player_data != null) {
              const player1Id = player_data.id;
              console.log('Navigating to MiniGameScreen from:', player1Id);
              router.replace({
                pathname: '/minigamescreen',
                params: { player1Id, isPlayer1: 'true' },
              });
            }
          }, 3000);
        }
      };
      WebSocketService.addMessageListener(handleMessage);

      return () => {
        WebSocketService.removeMessageListener(handleMessage);
        // WebSocketService.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    // location and time UI updates
    let timer: NodeJS.Timeout;
    let locationWatcher: any;
    if (originLocation) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsValid(false); // Mark as invalid when timer hits 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      locationWatcher = Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000 },
        (newLocation) => {
          const distance = calculateDistance(
            originLocation.latitude,
            originLocation.longitude,
            newLocation.coords.latitude,
            newLocation.coords.longitude
          );
          setCurrentDistance(distance);
          if (distance > 50) {
            setIsValid(false); // Mark as invalid if too far
          }
        }
      );
    }

    return () => {
      if (timer) clearInterval(timer);
      if (locationWatcher)
        locationWatcher.then((watcher: any) => watcher.remove());
    };
  }, [originLocation]); // dependent on location changes

  const generatePeerCode = async () => {
    if (isOnCooldown.current) {
      setPeerStatus('Please wait before generating a new code');
      setTimeout(() => setPeerStatus(''), 3000);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('location permission granted');
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      isOnCooldown.current = true;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      console.log('location obtained', coords);

      const response: PeerQRResponse = await QRService.generatePeerQR(
        coords.latitude,
        coords.longitude
      );
      console.log('my PEER QR:', response.peer_qr);
      console.log('my lat:', coords.latitude);
      console.log('my lng:', coords.longitude);
      setQrData(response.peer_qr);
      setOriginLocation(coords);
      setTimeLeft(300); // 5-minute validity
      setIsValid(true);
    } catch (error) {
      console.error('Error generating peer code:', error);
      setPeerStatus('Error generating code');
      setTimeout(() => setPeerStatus(''), 3000);
    } finally {
      setTimeout(() => {
        isOnCooldown.current = false;
      }, 5000);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text>QR generation is not supported on web</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {qrData ? (
        <>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={250}
              color="black"
              backgroundColor="white"
            />
            {!isValid && (
              <View style={styles.invalidOverlay}>
                <Text style={styles.invalidText}>INVALID</Text>
              </View>
            )}
          </View>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={24} color="#FF4500" />
            <Text style={styles.timerText}>
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={20} color="white" />
            <Text style={styles.distanceText}>
              {currentDistance.toFixed(0)} m
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={generatePeerCode}>
            <Text style={styles.buttonText}>Generate New Code</Text>
          </TouchableOpacity>
          {peerStatus ? (
            <Text style={styles.statusText}>{peerStatus}</Text>
          ) : (
            <Text style={styles.helpText}>
              Have another player scan this code to connect
            </Text>
          )}
        </>
      ) : (
        <TouchableOpacity style={styles.button} onPress={generatePeerCode}>
          <Text style={styles.buttonText}>Generate Peer Code</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    position: 'relative',
  },
  invalidOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.6)', // Semi-transparent red
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalidText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timerContainer: {
    flexDirection: 'row', // Icon and text side-by-side
    alignItems: 'center', // Vertically center contents
    justifyContent: 'center', // Horizontally center contents
    backgroundColor: '#FFD700', // Gold background
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5, // Android shadow
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4500', // Orange-red color
    fontFamily: 'monospace', // Or your custom font
    marginLeft: 8, // Space between icon and text
  },
  distanceContainer: {
    flexDirection: 'row', // Icon and text side-by-side
    alignItems: 'center', // Vertically center contents
    justifyContent: 'center', // Horizontally center contents
    backgroundColor: '#00CED1', // Turquoise background
    padding: 8,
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#20B2AA',
  },
  distanceText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginLeft: 8, // Space between icon and text
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  helpText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});
