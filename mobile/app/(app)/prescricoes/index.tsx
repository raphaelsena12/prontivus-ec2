import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrescricoes } from '../../../hooks/usePrescricoes';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors } from '../../../constants/colors';
import { Prescricao } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PrescricoesScreen() {
  const { data: prescricoes, isLoading } = usePrescricoes();

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Prescrições</Text>
      </View>

      <FlatList
        data={prescricoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nenhuma prescrição"
            description="Suas prescrições aparecerão aqui"
          />
        }
        renderItem={({ item }) => <PrescricaoCard prescricao={item} />}
      />
    </SafeAreaView>
  );
}

function PrescricaoCard({ prescricao }: { prescricao: Prescricao }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/prescricoes/${prescricao.id}`)}
      activeOpacity={0.8}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text" size={20} color={Colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.doctor}>Dr(a). {prescricao.medico?.nome ?? '—'}</Text>
            <Text style={styles.date}>
              {format(new Date(prescricao.dataEmissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>

        <Text style={styles.medicCount}>
          {prescricao.medicamentos?.length ?? 0} medicamento(s)
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  list: { padding: 20, paddingTop: 8, gap: 12 },
  card: { gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  doctor: { fontSize: 15, fontWeight: '600', color: Colors.text },
  date: { fontSize: 13, color: Colors.textSecondary },
  medicCount: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
});
