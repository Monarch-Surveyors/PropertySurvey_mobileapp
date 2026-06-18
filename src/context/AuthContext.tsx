import React, {createContext, useState, useEffect, useContext, ReactNode} from 'react';
import {StorageService} from '../services/storage';
import {NetworkService} from '../services/network';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  userData: any | null;
  login: (councilId: string, userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userData, setUserData] = useState<any | null>(null);

  useEffect(() => {
    checkAuthStatus();
    const unsubscribe = NetworkService.subscribe(setIsOnline);
    return () => unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await StorageService.getAuthToken();
      const sessionValid = await StorageService.isSessionValid();
      
      if (token && sessionValid) {
        const user = await StorageService.getUserData();
        setUserData(user);
        setIsAuthenticated(true);
      } else if (token && !sessionValid) {
        await StorageService.clearAuthData();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (councilId: string, userId: string, password: string) => {
    const mockToken = `token_${Date.now()}`;
    const expiryTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const user = {councilId, userId};

    await StorageService.saveAuthToken(mockToken);
    await StorageService.saveUserData(user);
    await StorageService.saveSessionExpiry(expiryTime);

    setUserData(user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await StorageService.clearAuthData();
    setUserData(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{isAuthenticated, isLoading, isOnline, userData, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
