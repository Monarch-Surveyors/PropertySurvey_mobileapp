import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  SESSION_EXPIRY: '@session_expiry',
};

export const StorageService = {
  async saveAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.log('Storage error:', error);
    }
  },

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    } catch (error) {
      console.log('Storage error:', error);
      return null;
    }
  },

  async saveUserData(userData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.log('Storage error:', error);
    }
  },

  async getUserData(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.log('Storage error:', error);
      return null;
    }
  },

  async saveSessionExpiry(expiryTime: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SESSION_EXPIRY, expiryTime.toString());
    } catch (error) {
      console.log('Storage error:', error);
    }
  },

  async getSessionExpiry(): Promise<number | null> {
    try {
      const expiry = await AsyncStorage.getItem(KEYS.SESSION_EXPIRY);
      return expiry ? parseInt(expiry, 10) : null;
    } catch (error) {
      console.log('Storage error:', error);
      return null;
    }
  },

  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.USER_DATA, KEYS.SESSION_EXPIRY]);
    } catch (error) {
      console.log('Storage error:', error);
    }
  },

  async isSessionValid(): Promise<boolean> {
    try {
      const expiry = await this.getSessionExpiry();
      if (!expiry) return false;
      return Date.now() < expiry;
    } catch (error) {
      console.log('Storage error:', error);
      return false;
    }
  },
};
