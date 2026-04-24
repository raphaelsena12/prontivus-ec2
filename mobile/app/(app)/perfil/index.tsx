import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/auth.store';
import { authService } from '../../../services/auth.service';
import { Card } from '../../../components/ui/Card';
import { Colors, BorderRadius } from '../../../constants/colors';

export default function PerfilScreen() {
  const { user, clearAuth } = useAuthStore();

  const initials = user?.nome
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'P';

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.nome ?? 'Paciente'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="person-outline" size={12} color={Colors.primary} />
            <Text style={styles.roleText}>Paciente</Text>
          </View>
        </View>

        {/* Menu */}
        <Card style={styles.menuCard}>
          <MenuItem
            icon="calendar-outline"
            label="Meus agendamentos"
            subtitle="Consultas futuras"
            color="#2563EB"
            bgColor="#EFF6FF"
            onPress={() => router.push('/(app)/agendamentos')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="medical-outline"
            label="Minhas consultas"
            subtitle="Histórico completo"
            color="#3B82F6"
            bgColor="#EFF6FF"
            onPress={() => router.push('/(app)/consultas')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="document-text-outline"
            label="Minhas prescrições"
            subtitle="Receitas médicas"
            color="#F59E0B"
            bgColor="#FFFBEB"
            onPress={() => router.push('/(app)/prescricoes')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="videocam-outline"
            label="Telemedicina"
            subtitle="Consultas online"
            color="#0D9488"
            bgColor="#CCFBF1"
            onPress={() => router.push('/(app)/agendamentos/telemedicina')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="heart-outline"
            label="Dados de saúde"
            subtitle="Alergias e medicamentos"
            color="#E11D48"
            bgColor="#FFE4E6"
            onPress={() => router.push('/(app)/perfil/dados-saude')}
          />
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          </View>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        {/* Version info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Prontivus v1.0.0</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  color,
  bgColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  container: { padding: 20, gap: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarOuter: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text },
  email: { fontSize: 14, color: Colors.textSecondary },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Menu
  menuCard: { gap: 0, padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  menuSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 16 },

  // Version
  versionSection: { alignItems: 'center' },
  versionText: { fontSize: 12, color: Colors.textMuted },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error },
});
