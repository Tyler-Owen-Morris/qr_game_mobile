import { Platform } from 'react-native';
import AuthService from './auth';

const BASE_WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  public static instance: WebSocket | null = null;
  private static onMessageCallbacks: ((data: any) => void)[] = [];
  private static reconnectTimeout: NodeJS.Timeout | null = null;
  private static currentUrl: string | null = null;

  static connect(targetPlayerId?: string): void {
    if (Platform.OS === 'web') {
      console.warn('WebSocket not supported on web platform');
      return;
    }

    if (this.instance?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = AuthService.getToken();
    if (!token) {
      console.error('Cannot connect to WebSocket: No authentication token');
      return;
    }

    // Extract player ID from token (assuming JWT)
    console.log('websocket got passed player id:', targetPlayerId);
    const payload = JSON.parse(atob(token.split('.')[1]));
    const playerId = payload.sub;
    const url = targetPlayerId
      ? `${BASE_WS_URL}/ws/player/${targetPlayerId}?player2_id=${playerId}`
      : `${BASE_WS_URL}/ws/player/${playerId}`;
    console.log(
      'Connecting to:',
      url,
      'Current state:',
      this.instance?.readyState
    );
    if (
      this.instance?.readyState === WebSocket.OPEN &&
      this.currentUrl !== url
    ) {
      this.disconnect();
      this.instance = null;
    }

    // Connect to the player-specific WebSocket endpoint
    this.instance = new WebSocket(url);
    this.currentUrl = url;

    this.instance.onopen = () => {
      console.log('WebSocket connected');
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.instance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallbacks.forEach((callback) => callback(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.instance.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.instance.onclose = () => {
      console.log('WebSocket disconnected');
      this.instance = null;

      // Attempt to reconnect after 5 seconds
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, 5000);
      }
    };
  }

  static addMessageListener(callback: (data: any) => void): void {
    this.onMessageCallbacks.push(callback);
  }

  static removeMessageListener(callback: (data: any) => void): void {
    this.onMessageCallbacks = this.onMessageCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  static disconnect(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export default WebSocketService;
