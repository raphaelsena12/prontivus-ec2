import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { useAgendamentos } from '../../hooks/useAgendamentos';
import { useConsultas } from '../../hooks/useConsultas';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
};

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: agendamentos } = useAgendamentos();
  const { data: consultas } = useConsultas();

  const proximoAgendamento = agendamentos?.find(
    (a) => a.status === 'AGENDADA' || a.status === 'CONFIRMADA'
  );
  const totalConsultas = consultas?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.name}>{user?.nome ?? 'Paciente'} 👋</Text>
          </View>
        </View>

        {/* Próximo agendamento */}
        {proximoAgendamento && (
          <Card style={styles.nextCard}>
            <Text style={styles.sectionLabel}>Próxima consulta</Text>
            <Text style={styles.nextDate}>
              {format(new Date(proximoAgendamento.dataHora), "dd 'de' MMMM, HH:mm", {
                locale: ptBR,
              })}
            </Text>
            <Text style={styles.nextDoctor}>Dr(a). {proximoAgendamento.medico?.nome ?? '—'}</Text>
            <Badge
              label={statusLabel[proximoAgendamento.status] ?? proximoAgendamento.status}
              status={proximoAgendamento.status}
            />
          </Card>
        )}

        {/* Ações rápidas */}
        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.actions}>
          <ActionCard
            icon="calendar-outline"
            label="Agendar consulta"
            onPress={() => router.push('/(app)/agendamentos/novo')}
          />
          <ActionCard
            icon="medical-outline"
            label="Minhas consultas"
            onPress={() => router.push('/(app)/consultas')}
          />
          <ActionCard
            icon="document-text-outline"
            label="Prescrições"
            onPress={() => router.push('/(app)/prescricoes')}
          />
          <ActionCard
            icon="videocam-outline"
            label="Telemedicina"
            onPress={() => router.push('/(app)/agendamentos/telemedicina')}
          />
        </View>

        {/* Resumo */}
        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.summary}>
          <SummaryCard label="Consultas" value={String(totalConsultas)} icon="medical" />
          <SummaryCard
            label="Agendamentos"
            value={String(agendamentos?.length ?? 0)}
            icon="calendar"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={24} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card style={styles.summaryCard}>
      <Ionicons name={icon} size={28} color={Colors.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, gap: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 16, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text },
  nextCard: { backgroundColor: Colors.primary, gap: 6 },
  sectionLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  nextDate: { fontSize: 20, fontWeight: '700', color: Colors.white },
  nextDoctor: { fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  summary: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 28, fontWeight: '700', color: Colors.text },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
});
