import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...Platform.select({
            ios: {
              backgroundColor: 'transparent',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
            android: {
              backgroundColor: '#ffffff',
              elevation: 8,
            },
            web: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e5e5e5',
            },
          }),
        },
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => (
                <BlurView
                  tint="light"
                  intensity={95}
                  style={StyleSheet.absoluteFill}
                />
              )
            : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="scan" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Pair',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="hunts"
        options={{
          title: 'Hunts',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="disc" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
