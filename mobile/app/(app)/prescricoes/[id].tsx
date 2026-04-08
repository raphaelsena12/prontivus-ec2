import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrescricao } from '../../../hooks/usePrescricoes';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors, BorderRadius } from '../../../constants/colors';
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescricao</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Doctor info */}
        <Card variant="elevated" style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>Dr(a). {prescricao.medico?.nome ?? '--'}</Text>
              <Text style={styles.doctorDate}>
                Emitida em{' '}
                {format(new Date(prescricao.dataEmissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Medications section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="flask" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>
            Medicamentos ({prescricao.medicamentos.length})
          </Text>
        </View>

        {prescricao.medicamentos.map((med, index) => (
          <Card key={med.id} style={styles.medCard}>
            <View style={styles.medHeader}>
              <View style={styles.medNumber}>
                <Text style={styles.medNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.medName}>{med.nome}</Text>
            </View>

            <View style={styles.medDetails}>
              <MedInfo icon="flask-outline" label="Dosagem" value={med.dosagem} color="#2563EB" bgColor="#EFF6FF" />
              <MedInfo icon="time-outline" label="Posologia" value={med.posologia} color="#3B82F6" bgColor="#EFF6FF" />
              {med.duracao && (
                <MedInfo icon="calendar-outline" label="Duracao" value={med.duracao} color="#10B981" bgColor="#ECFDF5" />
              )}
            </View>
          </Card>
        ))}

        {prescricao.observacoes && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="chatbubble" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>
            <Card>
              <Text style={styles.observacoes}>{prescricao.observacoes}</Text>
            </Card>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MedInfo({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.medInfoRow}>
      <View style={[styles.medInfoIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medInfoLabel}>{label}</Text>
        <Text style={styles.medInfoValue}>{value}</Text>
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
  container: { padding: 20, gap: 12 },

  // Doctor
  doctorCard: { paddingVertical: 18 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  doctorDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },

  // Medication card
  medCard: { gap: 14 },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  medName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  medDetails: { gap: 10 },
  medInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfoLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  medInfoValue: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  observacoes: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
