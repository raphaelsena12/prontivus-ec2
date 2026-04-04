import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { Colors } from '../../constants/colors';
import { router } from 'expo-router';

export default function AppLayout() {
  const { token, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading]);

  if (!token) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryLight,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            } : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryLight,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            } : undefined}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="consultas"
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryLight,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            } : undefined}>
              <Ionicons name={focused ? 'medical' : 'medical-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="prescricoes"
        options={{
          title: 'Receitas',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryLight,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            } : undefined}>
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryLight,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            } : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
