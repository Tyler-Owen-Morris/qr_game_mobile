import { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import WebSocketService from '../../src/services/websocket';
import QRService from '@/src/services/qr';
import { calculateDistance } from '@/utils/location';

export default function GenerateScreen() {
  const [qrData, setQrData] = useState<string>('');
  const [peerStatus, setPeerStatus] = useState<string>('');

  useEffect(() => {
    generatePeerCode();

    // Connect to WebSocket for peer notifications
    if (Platform.OS !== 'web') {
      WebSocketService.connect();

      const handleMessage = (data: any) => {
        if (data.event === 'player_interaction') {
          setPeerStatus(data.message || 'Peer connection successful!');
          // Reset status after 3 seconds
          setTimeout(() => setPeerStatus(''), 3000);
        }
      };

      WebSocketService.addMessageListener(handleMessage);

      return () => {
        WebSocketService.removeMessageListener(handleMessage);
        WebSocketService.disconnect();
      };
    }
  }, []);

  const generatePeerCode = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const peerCode = `peer://${location.coords.latitude},${location.coords.longitude}`;
      setQrData(peerCode);
    } catch (error) {
      console.error('Error generating peer code:', error);
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
      {qrData && (
        <>
          <QRCode
            value={qrData}
            size={250}
            color="black"
            backgroundColor="white"
          />
          {peerStatus ? (
            <Text style={styles.statusText}>{peerStatus}</Text>
          ) : (
            <Text style={styles.helpText}>
              Have another player scan this code to connect
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
