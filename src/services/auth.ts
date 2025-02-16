import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

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

  static getToken(): string | null {
    return this.token;
  }

  static setToken(token: string): void {
    this.token = token;
  }

  static async createAnonymousUser(): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error logging in:', error);
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
