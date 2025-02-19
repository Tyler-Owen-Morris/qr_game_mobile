import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const STORAGE_KEYS = {
  USERNAME: '@auth_username',
  PASSWORD: '@auth_password',
  TOKEN: '@auth_token',
};

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface QRLoginResponse {
  status: string;
  message?: string;
}

class AuthService {
  private static token: string | null = null;
  private static player_data: object | null = null;

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

  static getPlayerData(): object | null {
    return this.player_data;
  }

  static setPlayerData(data: object): void {
    this.player_data = data;
  }

  static async loadStoredCredentials(): Promise<{
    username: string;
    password: string;
  } | null> {
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
      console.log('username,pass', username, password);

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
      const my_user_data = await this.fetchUserData();
      console.log('my user:', my_user_data);
      this.setPlayerData(my_user_data);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  static async fetchUserData(): Promise<any> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) throw new Error('No auth token found');

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch user data');

      const userData = await response.json();
      await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
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
