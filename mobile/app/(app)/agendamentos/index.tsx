import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAgendamentos, useCancelarAgendamento } from '../../../hooks/useAgendamentos';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../constants/colors';
import { Agendamento } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
};

export default function AgendamentosScreen() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const cancelar = useCancelarAgendamento();

  if (isLoading) return <LoadingSpinner />;

  function handleCancelar(id: string) {
    Alert.alert('Cancelar consulta', 'Tem certeza que deseja cancelar este agendamento?', [
      { text: 'Não', style: 'cancel' },
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
        <Text style={styles.title}>Agendamentos</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/(app)/agendamentos/novo')}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={agendamentos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nenhum agendamento"
            description="Toque em + para agendar uma consulta"
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

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.doctorInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.doctorName}>Dr(a). {agendamento.medico?.nome ?? '—'}</Text>
            {agendamento.medico?.especialidade && (
              <Text style={styles.especialidade}>{agendamento.medico.especialidade}</Text>
            )}
          </View>
        </View>
        <Badge
          label={statusLabel[agendamento.status] ?? agendamento.status}
          status={agendamento.status}
        />
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.date}>
          {format(new Date(agendamento.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </View>

      {podeCancel && (
        <Button
          title="Cancelar"
          onPress={() => onCancelar(agendamento.id)}
          variant="outline"
          style={styles.cancelBtn}
          textStyle={styles.cancelText}
        />
      )}
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
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 20, paddingTop: 8, gap: 12 },
  card: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  doctorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  especialidade: { fontSize: 13, color: Colors.textSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, color: Colors.textSecondary },
  cancelBtn: { height: 36, borderColor: Colors.error },
  cancelText: { color: Colors.error, fontSize: 14 },
});
