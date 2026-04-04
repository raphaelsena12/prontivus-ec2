import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrescricoes } from '../../../hooks/usePrescricoes';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors, BorderRadius } from '../../../constants/colors';
import { Prescricao } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PrescricoesScreen() {
  const { data: prescricoes, isLoading } = usePrescricoes();

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Receitas</Text>
        <Text style={styles.subtitle}>{prescricoes?.length ?? 0} prescricoes</Text>
      </View>

      <FlatList
        data={prescricoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nenhuma prescricao"
            description="Suas prescricoes medicas aparecerao aqui"
          />
        }
        renderItem={({ item }) => <PrescricaoCard prescricao={item} />}
      />
    </SafeAreaView>
  );
}

function PrescricaoCard({ prescricao }: { prescricao: Prescricao }) {
  const medCount = prescricao.medicamentos?.length ?? 0;

  return (
    <Card
      onPress={() => router.push(`/(app)/prescricoes/${prescricao.id}`)}
      style={styles.card}
    >
      <View style={styles.cardBody}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="document-text" size={22} color="#F59E0B" />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.doctor}>Dr(a). {prescricao.medico?.nome ?? '--'}</Text>
          <Text style={styles.date}>
            {format(new Date(prescricao.dataEmissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
          <View style={styles.medCountRow}>
            <View style={styles.medCountPill}>
              <Ionicons name="flask-outline" size={12} color={Colors.primary} />
              <Text style={styles.medCountText}>{medCount} medicamento{medCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  doctor: { fontSize: 15, fontWeight: '700', color: Colors.text },
  date: { fontSize: 13, color: Colors.textSecondary },
  medCountRow: { marginTop: 4 },
  medCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  medCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
