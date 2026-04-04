import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConsulta } from '../../../hooks/useConsultas';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors, BorderRadius } from '../../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Nao compareceu',
};

export default function ConsultaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: consulta, isLoading } = useConsulta(id);

  if (isLoading) return <LoadingSpinner />;
  if (!consulta) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da consulta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Doctor card */}
        <Card variant="elevated" style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>Dr(a). {consulta.medico?.nome ?? '--'}</Text>
              {consulta.medico?.crm && <Text style={styles.crm}>CRM: {consulta.medico.crm}</Text>}
              {consulta.medico?.especialidade && (
                <View style={styles.specBadge}>
                  <Text style={styles.specText}>{consulta.medico.especialidade}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.infoLabel}>Data e hora</Text>
            <Text style={styles.infoValue}>
              {format(new Date(consulta.dataHora), "dd/MM/yyyy", { locale: ptBR })}
            </Text>
            <Text style={styles.infoSub}>
              {format(new Date(consulta.dataHora), "EEEE, HH:mm", { locale: ptBR })}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="pulse-outline" size={18} color={Colors.success} />
            </View>
            <Text style={styles.infoLabel}>Status</Text>
            <Badge
              label={statusLabel[consulta.status] ?? consulta.status}
              status={consulta.status}
            />
          </View>
        </View>

        {consulta.clinica && (
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="business-outline" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Clinica</Text>
                <Text style={styles.detailValue}>{consulta.clinica.nome}</Text>
              </View>
            </View>
          </Card>
        )}

        {consulta.observacoes && (
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="chatbubble-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Observacoes</Text>
                <Text style={styles.detailValue}>{consulta.observacoes}</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  container: { padding: 20, gap: 14 },

  // Doctor card
  doctorCard: { paddingVertical: 20 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  crm: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  specBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  specText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoSub: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },

  // Detail card
  detailCard: { gap: 0 },
  detailRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  detailValue: { fontSize: 15, color: Colors.text, marginTop: 2, lineHeight: 22 },
});
