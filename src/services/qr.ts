import AuthService from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface QRScanResponse {
  status: string;
  message?: string;
  data?: any;
  location_valid?: boolean;
  encounter_type?: string;
  reward_data?: any;
}

export interface PeerQRResponse {
  peer_qr: string;
}

class QRService {
  static async scanQRCode(qrCode: string): Promise<QRScanResponse> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Unauthorized: No auth token found');
    }
    try {
      console.log('token:', token);
      const response = await fetch(`${API_URL}/qr/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qr_code: qrCode,
          latitude: 37.7749,
          longitude: -122.4194,
        }),
      });

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
    if (!token) {
      throw new Error('Unauthorized: No auth token found');
    }
    try {
      const response = await fetch(`${API_URL}/peer_scan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: { latitude, longitude },
        }),
      });

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
}

export default QRService;
