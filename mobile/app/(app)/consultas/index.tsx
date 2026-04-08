import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConsultas } from '../../../hooks/useConsultas';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors, BorderRadius } from '../../../constants/colors';
import { Consulta } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
};

export default function ConsultasScreen() {
  const { data: consultas, isLoading } = useConsultas();

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Consultas</Text>
        <Text style={styles.subtitle}>{consultas?.length ?? 0} registros</Text>
      </View>

      <FlatList
        data={consultas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="medical-outline"
            title="Nenhuma consulta"
            description="Suas consultas aparecerão aqui"
          />
        }
        renderItem={({ item }) => <ConsultaCard consulta={item} />}
      />
    </SafeAreaView>
  );
}

function ConsultaCard({ consulta }: { consulta: Consulta }) {
  const dataFormatada = format(new Date(consulta.dataHora), "dd MMM", { locale: ptBR });
  const horaFormatada = format(new Date(consulta.dataHora), "HH:mm");

  return (
    <Card
      onPress={() => router.push(`/(app)/consultas/${consulta.id}`)}
      style={styles.card}
    >
      <View style={styles.cardBody}>
        {/* Date pill */}
        <View style={[
          styles.datePill,
          consulta.status === 'REALIZADA' && styles.datePillDone,
          consulta.status === 'CANCELADA' && styles.datePillCancel,
        ]}>
          <Text style={[
            styles.datePillDay,
            consulta.status === 'REALIZADA' && styles.datePillTextDone,
            consulta.status === 'CANCELADA' && styles.datePillTextCancel,
          ]}>
            {dataFormatada}
          </Text>
          <Text style={[
            styles.datePillTime,
            consulta.status === 'REALIZADA' && styles.datePillTextDone,
            consulta.status === 'CANCELADA' && styles.datePillTextCancel,
          ]}>
            {horaFormatada}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.doctorName}>Dr(a). {consulta.medico?.nome ?? '--'}</Text>
          {consulta.medico?.especialidade && (
            <Text style={styles.especialidade}>{consulta.medico.especialidade}</Text>
          )}
          <Badge
            label={statusLabel[consulta.status] ?? consulta.status}
            status={consulta.status}
            size="sm"
          />
        </View>

        {/* Arrow */}
        <View style={styles.arrowWrap}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  list: { padding: 20, paddingTop: 8, gap: 10 },
  card: { padding: 0 },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  datePillDone: {
    backgroundColor: Colors.successLight,
  },
  datePillCancel: {
    backgroundColor: Colors.errorLight,
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
  datePillTextDone: {
    color: Colors.successDark,
  },
  datePillTextCancel: {
    color: Colors.errorDark,
  },
  cardInfo: { flex: 1, gap: 3 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  especialidade: { fontSize: 13, color: Colors.textSecondary },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
