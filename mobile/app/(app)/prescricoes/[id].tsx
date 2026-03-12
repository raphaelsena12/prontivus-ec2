import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrescricao } from '../../../hooks/usePrescricoes';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors } from '../../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PrescricaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: prescricao, isLoading } = usePrescricao(id);

  if (isLoading) return <LoadingSpinner />;
  if (!prescricao) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Prescrição</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.doctorName}>Dr(a). {prescricao.medico?.nome ?? '—'}</Text>
          <Text style={styles.date}>
            Emitida em{' '}
            {format(new Date(prescricao.dataEmissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Medicamentos</Text>

        {prescricao.medicamentos.map((med) => (
          <Card key={med.id} style={styles.medCard}>
            <Text style={styles.medName}>{med.nome}</Text>
            <View style={styles.medDetails}>
              <MedInfo icon="flask-outline" label="Dosagem" value={med.dosagem} />
              <MedInfo icon="time-outline" label="Posologia" value={med.posologia} />
              {med.duracao && (
                <MedInfo icon="calendar-outline" label="Duração" value={med.duracao} />
              )}
            </View>
          </Card>
        ))}

        {prescricao.observacoes && (
          <>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Card>
              <Text style={styles.observacoes}>{prescricao.observacoes}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedInfo({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.medInfoRow}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.medInfoLabel}>{label}:</Text>
      <Text style={styles.medInfoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  container: { padding: 20, gap: 16 },
  doctorName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  date: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  medCard: { gap: 10 },
  medName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  medDetails: { gap: 6 },
  medInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medInfoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  medInfoValue: { fontSize: 13, color: Colors.text },
  observacoes: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
