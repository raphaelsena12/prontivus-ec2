import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { useAgendamentos } from '../../hooks/useAgendamentos';
import { useConsultas } from '../../hooks/useConsultas';
import { usePrescricoes } from '../../hooks/usePrescricoes';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors, BorderRadius, Spacing } from '../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Nao compareceu',
};

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: agendamentos } = useAgendamentos();
  const { data: consultas } = useConsultas();
  const { data: prescricoes } = usePrescricoes();

  const proximoAgendamento = agendamentos?.find(
    (a) => a.status === 'AGENDADA' || a.status === 'CONFIRMADA'
  );
  const totalConsultas = consultas?.length ?? 0;
  const totalAgendamentos = agendamentos?.length ?? 0;
  const totalPrescricoes = prescricoes?.length ?? 0;

  const firstName = user?.nome?.split(' ')[0] ?? 'Paciente';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Ola,</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(app)/perfil')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Next appointment card */}
        {proximoAgendamento ? (
          <Card variant="primary" style={styles.nextCard}>
            <View style={styles.nextCardHeader}>
              <View style={styles.nextCardIcon}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.nextCardLabel}>Proxima consulta</Text>
            </View>
            <Text style={styles.nextDate}>
              {format(new Date(proximoAgendamento.dataHora), "dd 'de' MMMM", {
                locale: ptBR,
              })}
            </Text>
            <Text style={styles.nextTime}>
              {format(new Date(proximoAgendamento.dataHora), "EEEE, HH:mm", {
                locale: ptBR,
              })}
            </Text>
            <View style={styles.nextDivider} />
            <View style={styles.nextDoctorRow}>
              <View style={styles.nextDoctorAvatar}>
                <Ionicons name="person" size={16} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextDoctorName}>
                  Dr(a). {proximoAgendamento.medico?.nome ?? '--'}
                </Text>
                {proximoAgendamento.medico?.especialidade && (
                  <Text style={styles.nextDoctorSpec}>
                    {proximoAgendamento.medico.especialidade}
                  </Text>
                )}
              </View>
              <Badge
                label={statusLabel[proximoAgendamento.status] ?? proximoAgendamento.status}
                status={proximoAgendamento.status}
                showDot={false}
                size="sm"
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.noAppointmentCard}>
            <View style={styles.noAppointmentContent}>
              <View style={styles.noAppointmentIcon}>
                <Ionicons name="calendar-outline" size={28} color={Colors.primaryMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noAppointmentTitle}>Nenhuma consulta agendada</Text>
                <Text style={styles.noAppointmentSub}>Agende sua proxima consulta</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.noAppointmentBtn}
              onPress={() => router.push('/(app)/agendamentos/novo')}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.noAppointmentBtnText}>Agendar</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Quick actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Acesso rapido</Text>
        </View>
        <View style={styles.actions}>
          <ActionCard
            icon="calendar-outline"
            label="Agendar consulta"
            subtitle="Marque um horario"
            color="#7C3AED"
            bgColor="#F5F3FF"
            onPress={() => router.push('/(app)/agendamentos/novo')}
          />
          <ActionCard
            icon="videocam-outline"
            label="Telemedicina"
            subtitle="Consulta online"
            color="#0D9488"
            bgColor="#CCFBF1"
            onPress={() => router.push('/(app)/agendamentos/telemedicina')}
          />
          <ActionCard
            icon="medical-outline"
            label="Consultas"
            subtitle="Historico completo"
            color="#3B82F6"
            bgColor="#EFF6FF"
            onPress={() => router.push('/(app)/consultas')}
          />
          <ActionCard
            icon="document-text-outline"
            label="Receitas"
            subtitle="Suas prescricoes"
            color="#F59E0B"
            bgColor="#FFFBEB"
            onPress={() => router.push('/(app)/prescricoes')}
          />
        </View>

        {/* Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumo</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar"
            label="Agendamentos"
            value={totalAgendamentos}
            color="#7C3AED"
            bgColor="#F5F3FF"
          />
          <StatCard
            icon="medical"
            label="Consultas"
            value={totalConsultas}
            color="#3B82F6"
            bgColor="#EFF6FF"
          />
          <StatCard
            icon="document-text"
            label="Receitas"
            value={totalPrescricoes}
            color="#10B981"
            bgColor="#ECFDF5"
          />
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
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
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {},
  greeting: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: Colors.text, marginTop: 2 },
  avatarButton: {},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },

  // Next appointment
  nextCard: {
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  nextCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nextCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextDate: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
  },
  nextTime: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  nextDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  nextDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextDoctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDoctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  nextDoctorSpec: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  // No appointment
  noAppointmentCard: { gap: 14 },
  noAppointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noAppointmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAppointmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  noAppointmentSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed' as const,
  },
  noAppointmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
