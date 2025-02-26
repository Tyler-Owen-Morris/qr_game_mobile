import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const STORAGE_KEYS = {
  USERNAME: '@auth_username',
  PASSWORD: '@auth_password',
  TOKEN: '@auth_token',
};

interface StoredCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface QRLoginResponse {
  status: string;
  message?: string;
}

interface PlayerData {
  id: string;
  username: string;
  score: number;
  level: number;
  created_at: string; // ISO timestamp
  scan_counts: {
    total: number;
    discovery: number;
    peers: number;
  };
  recent_scans: ScanRecord[];
}

interface ScanRecord {
  qr_code_id: string | null;
  scan_time: string; // ISO timestamp
  success: boolean;
  scan_type: 'peer' | 'discovery'; // If there are other types, update accordingly
}

class AuthService {
  private static token: string | null = null;
  private static player_data: PlayerData | null = null;

  static getToken(): string | null {
    return this.token;
  }

  static setToken(token: string): void {
    this.token = token;
    // Store token in AsyncStorage
    AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token).catch((error) => {
      console.error('Error storing token:', error);
    });
  }

  static getPlayerData(): PlayerData | null {
    return this.player_data;
  }

  static setPlayerData(data: PlayerData): void {
    this.player_data = data;
  }

  static async loadStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const [username, password] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERNAME),
        AsyncStorage.getItem(STORAGE_KEYS.PASSWORD),
      ]);

      if (username && password) {
        return { username, password };
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
    return null;
  }

  static async storeCredentials(
    username: string,
    password: string
  ): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username),
        AsyncStorage.setItem(STORAGE_KEYS.PASSWORD, password),
      ]);
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  }

  static async createAnonymousUser(): Promise<void> {
    try {
      // First, try to load and use stored credentials
      const storedCredentials = await this.loadStoredCredentials();

      if (storedCredentials) {
        try {
          // Attempt to login with stored credentials
          await this.login(
            storedCredentials.username,
            storedCredentials.password
          );
          return; // If login successful, we're done
        } catch (error) {
          console.log('Stored credentials failed, creating new user');
          // If login fails, continue with creating new user
        }
      }
      const username = `explorer_${Math.random().toString(36).substring(2, 9)}`;
      const password = Math.random().toString(36).substring(2, 15);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to create anonymous user');
      }

      // Store the new credentials
      await this.storeCredentials(username, password);

      // Login with the created credentials
      await this.login(username, password);
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      throw error;
    }
  }

  static async login(username: string, password: string): Promise<void> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      // console.log('username,pass', username, password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data: LoginResponse = await response.json();
      this.setToken(data.access_token);

      //get the user information
      const my_user_data: PlayerData = await this.fetchUserData();
      // console.log('my user:', my_user_data);
      this.setPlayerData(my_user_data);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  static async reauthenticate(): Promise<void> {
    try {
      const credentials = await this.loadStoredCredentials();
      if (!credentials || !credentials.username || !credentials.password) {
        throw new Error('No stored credentials available');
      }

      await this.login(credentials.username, credentials.password);
    } catch (error) {
      console.error('Error re-authenticating:', error);
      await this.logout(); // Clear credentials on failure
      throw error;
    }
  }

  static async logout(): Promise<void> {
    this.token = null;
    this.player_data = null;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USERNAME,
      STORAGE_KEYS.PASSWORD,
    ]);
  }

  static async fetchUserData(): Promise<PlayerData> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) throw new Error('No auth token found');

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        try {
          await this.reauthenticate();
          // After re-auth, retry the original function (passed as retryFn)
          return await this.fetchUserData();
        } catch (error) {
          console.error('Re-authentication failed:', error);
        }
      }

      if (!response.ok) throw new Error('Failed to fetch user data');

      const userData = await response.json();
      await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  static async completeQRLogin(sessionId: string): Promise<QRLoginResponse> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_URL}/auth/qr-login-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      console.log('my token:', this.token);
      console.log(JSON.stringify({ session_id: sessionId }));
      console.log('qr-login-complete response:', response.status);

      if (response.status === 401) {
        try {
          await this.reauthenticate();
          // After re-auth, retry the original function (passed as retryFn)
          return await this.completeQRLogin(sessionId);
        } catch (error) {
          console.error('Re-authentication failed:', error);
        }
      }
      if (!response.ok) {
        throw new Error('QR login completion failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing QR login:', error);
      throw error;
    }
  }
}

export default AuthService;
