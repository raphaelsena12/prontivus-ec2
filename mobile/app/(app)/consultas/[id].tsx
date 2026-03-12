import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConsulta } from '../../../hooks/useConsultas';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors } from '../../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
};

export default function ConsultaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: consulta, isLoading } = useConsulta(id);

  if (isLoading) return <LoadingSpinner />;
  if (!consulta) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes da consulta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.mainCard}>
          <View style={styles.doctorRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.doctorName}>Dr(a). {consulta.medico?.nome ?? '—'}</Text>
              {consulta.medico?.crm && <Text style={styles.crm}>CRM: {consulta.medico.crm}</Text>}
              {consulta.medico?.especialidade && (
                <Text style={styles.especialidade}>{consulta.medico.especialidade}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow
            icon="calendar-outline"
            label="Data e hora"
            value={format(new Date(consulta.dataHora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          />

          <InfoRow icon="pulse-outline" label="Status" value="">
            <Badge
              label={statusLabel[consulta.status] ?? consulta.status}
              status={consulta.status}
            />
          </InfoRow>

          {consulta.clinica && (
            <InfoRow icon="business-outline" label="Clínica" value={consulta.clinica.nome} />
          )}

          {consulta.observacoes && (
            <InfoRow icon="chatbubble-outline" label="Observações" value={consulta.observacoes} />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.primary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {children ?? <Text style={styles.infoValue}>{value}</Text>}
      </View>
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
  mainCard: { gap: 16 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  crm: { fontSize: 13, color: Colors.textSecondary },
  especialidade: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 15, color: Colors.text },
});
