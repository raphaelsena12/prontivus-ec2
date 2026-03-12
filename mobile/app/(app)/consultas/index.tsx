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
import { Colors } from '../../../constants/colors';
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
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/consultas/${consulta.id}`)}
      activeOpacity={0.8}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.doctorInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.doctorName}>Dr(a). {consulta.medico?.nome ?? '—'}</Text>
              {consulta.medico?.especialidade && (
                <Text style={styles.especialidade}>{consulta.medico.especialidade}</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.date}>
              {format(new Date(consulta.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
          <Badge
            label={statusLabel[consulta.status] ?? consulta.status}
            status={consulta.status}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  list: { padding: 20, paddingTop: 8, gap: 12 },
  card: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doctorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, color: Colors.textSecondary },
});
