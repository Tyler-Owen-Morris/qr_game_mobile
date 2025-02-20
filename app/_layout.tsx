import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AuthService from '../src/services/auth';
import { ScanHistoryProvider } from '@/src/context/ScanHistoryContext';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useEffect(() => {
    window.frameworkReady?.();

    // Create anonymous user on app start
    const initializeUser = async () => {
      try {
        await AuthService.createAnonymousUser();
      } catch (error) {
        console.error('Failed to initialize user:', error);
      }
    };

    initializeUser();
  }, []);

  return (
    <>
      <ScanHistoryProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ScanHistoryProvider>
    </>
  );
}
