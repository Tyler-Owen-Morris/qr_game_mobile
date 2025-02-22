import AuthService from './auth';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface QRScanResponse {
  status: string;
  message?: string;
  data?: any;
  location_valid?: boolean;
  encounter_type?: string;
  reward_data?: any;
  hunt_status?: string;
}

export interface PeerQRResponse {
  peer_qr: string;
}

export interface PeerScanResponse {
  status: string; // "success" or "error"
  message?: string; // e.g., "Peer matched!" or "Invalid code"
  matched_player_id?: string; // ID of the matched player, if successful
}

class QRService {
  static async scanQRCode(qrCode: string): Promise<QRScanResponse> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Unauthorized: No auth token found');
    }
    try {
      console.log('token:', token);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Adjust accuracy as needed
      });
      const { latitude, longitude } = location.coords;
      const response = await fetch(`${API_URL}/qr/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qr_code: qrCode,
          latitude: latitude,
          longitude: longitude,
        }),
      });

      if (response.status === 401) {
        try {
          await AuthService.reauthenticate();
          // After re-auth, retry the original function (passed as retryFn)
          return await this.scanQRCode(qrCode);
        } catch (error) {
          console.error('Re-authentication failed:', error);
        }
      }

      if (!response.ok) {
        throw new Error(`QR scan failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error scanning QR code:', error);
      throw error;
    }
  }
  static async generatePeerQR(
    latitude: number,
    longitude: number
  ): Promise<PeerQRResponse> {
    const token = AuthService.getToken();
    console.log('token:', token);
    if (!token) {
      throw new Error('Unauthorized: No auth token found');
    }
    try {
      const response = await fetch(`${API_URL}/player/peer_scan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: { latitude, longitude },
        }),
      });

      if (response.status === 401) {
        try {
          await AuthService.reauthenticate();
          // After re-auth, retry the original function (passed as retryFn)
          return await this.generatePeerQR(latitude, longitude);
        } catch (error) {
          console.error('Re-authentication failed:', error);
        }
      }

      if (!response.ok) {
        throw new Error(
          `Peer QR generation failed with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating peer QR:', error);
      throw error;
    }
  }
  static async validatePeerQR(
    qrCode: string,
    latitude: number,
    longitude: number
  ): Promise<PeerScanResponse> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Unauthorized: No auth token found');
    }
    try {
      const response = await fetch(`${API_URL}/player/peer_scan/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          peer_qr: qrCode,
          latitude,
          longitude,
        }),
      });

      if (response.status === 401) {
        try {
          await AuthService.reauthenticate();
          // After re-auth, retry the original function (passed as retryFn)
          return await this.validatePeerQR(qrCode, latitude, longitude);
        } catch (error) {
          console.error('Re-authentication failed:', error);
        }
      }

      if (!response.ok) {
        throw new Error(
          `Peer QR validation failed with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating peer QR:', error);
      throw error;
    }
  }
}

export default QRService;
