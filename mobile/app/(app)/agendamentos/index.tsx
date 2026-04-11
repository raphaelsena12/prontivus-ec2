import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAgendamentos, useCancelarAgendamento } from '../../../hooks/useAgendamentos';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors, BorderRadius } from '../../../constants/colors';
import { Agendamento } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string })?.apiBaseUrl ??
  'http://localhost:3000';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
};

export default function AgendamentosScreen() {
  const { data: agendamentos, isLoading, refetch, isRefetching } = useAgendamentos();
  const cancelar = useCancelarAgendamento();

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner />;

  function handleCancelar(id: string) {
    Alert.alert('Cancelar consulta', 'Tem certeza que deseja cancelar este agendamento?', [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: () => cancelar.mutate(id),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agendamentos</Text>
          <Text style={styles.subtitle}>{agendamentos?.length ?? 0} registros</Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/(app)/agendamentos/telemedicina')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.newButtonText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agendamentos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nenhum agendamento"
            description="Toque em '+ Novo' para agendar uma consulta"
          />
        }
        renderItem={({ item }) => (
          <AgendamentoCard agendamento={item} onCancelar={handleCancelar} />
        )}
      />
    </SafeAreaView>
  );
}

function AgendamentoCard({
  agendamento,
  onCancelar,
}: {
  agendamento: Agendamento;
  onCancelar: (id: string) => void;
}) {
  const podeCancel = agendamento.status === 'AGENDADA' || agendamento.status === 'CONFIRMADA';
  const dataFormatada = format(new Date(agendamento.dataHora), "dd MMM", { locale: ptBR });
  const horaFormatada = format(new Date(agendamento.dataHora), "HH:mm");
  const diaFormatado = format(new Date(agendamento.dataHora), "EEEE", { locale: ptBR });
  const isTelemedicina = agendamento.modalidade === 'TELEMEDICINA';
  const session = agendamento.telemedicineSession;
  const canJoin = isTelemedicina && session?.patientToken &&
    ['scheduled', 'waiting', 'in_progress'].includes(session.status) &&
    podeCancel;

  function handleOpenTelemedicina() {
    if (!session?.patientToken) return;
    const url = `${BASE_URL}/telemedicina/acesso?token=${session.patientToken}&skipConsent=1`;
    router.push({ pathname: '/(app)/agendamentos/consulta-web', params: { url, titulo: 'Teleconsulta' } });
  }

  return (
    <Card style={styles.card}>
      <View style={styles.cardBody}>
        {/* Date pill */}
        <View style={styles.datePill}>
          <Text style={styles.datePillDay}>{dataFormatada}</Text>
          <Text style={styles.datePillTime}>{horaFormatada}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.doctorName}>Dr(a). {agendamento.medico?.nome ?? '--'}</Text>
          {agendamento.medico?.especialidade && (
            <Text style={styles.especialidade}>{agendamento.medico.especialidade}</Text>
          )}
          {agendamento.tipo && (
            <Text style={styles.tipoText}>{agendamento.tipo}</Text>
          )}
          <Text style={styles.dayText}>{diaFormatado}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusCol}>
          <Badge
            label={statusLabel[agendamento.status] ?? agendamento.status}
            status={agendamento.status}
            size="sm"
          />
          {isTelemedicina && (
            <View style={styles.teleBadge}>
              <Ionicons name="videocam" size={10} color="#10B981" />
              <Text style={styles.teleBadgeText}>Tele</Text>
            </View>
          )}
        </View>
      </View>

      {/* Ações */}
      <View style={styles.cardActions}>
        {canJoin && (
          <TouchableOpacity
            style={styles.teleBtn}
            onPress={handleOpenTelemedicina}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={16} color={Colors.white} />
            <Text style={styles.teleBtnText}>Entrar na consulta</Text>
          </TouchableOpacity>
        )}
        {isTelemedicina && !canJoin && podeCancel && !session && (
          <View style={styles.telePendingRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.telePendingText}>Link ainda não disponível</Text>
          </View>
        )}
        {podeCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => onCancelar(agendamento.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.cancelText}>Cancelar agendamento</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  list: { padding: 20, paddingTop: 8, gap: 12 },
  card: { gap: 0, padding: 0, overflow: 'hidden' },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  datePill: {
    width: 56,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  datePillDay: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  datePillTime: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  cardInfo: { flex: 1, gap: 2 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  especialidade: { fontSize: 13, color: Colors.textSecondary },
  tipoText: { fontSize: 12, color: Colors.textMuted },
  dayText: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  teleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  teleBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  cardActions: { gap: 0 },
  teleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    backgroundColor: '#10B981',
  },
  teleBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  telePendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  telePendingText: { fontSize: 12, color: Colors.textMuted },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.errorLight,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
});
