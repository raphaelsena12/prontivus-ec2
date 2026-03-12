import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/auth.store';
import { authService } from '../../../services/auth.service';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';

export default function PerfilScreen() {
  const { user, token, clearAuth } = useAuthStore();

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          if (token) await authService.logout(token);
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar e nome */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.name}>{user?.nome ?? 'Paciente'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Menu */}
        <Card style={styles.menuCard}>
          <MenuItem
            icon="calendar-outline"
            label="Meus agendamentos"
            onPress={() => router.push('/(app)/agendamentos')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="medical-outline"
            label="Minhas consultas"
            onPress={() => router.push('/(app)/consultas')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="document-text-outline"
            label="Minhas prescrições"
            onPress={() => router.push('/(app)/prescricoes')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="videocam-outline"
            label="Telemedicina"
            onPress={() => router.push('/(app)/agendamentos/telemedicina')}
          />
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  container: { padding: 20, gap: 20 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  email: { fontSize: 14, color: Colors.textSecondary },
  menuCard: { gap: 0, padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
