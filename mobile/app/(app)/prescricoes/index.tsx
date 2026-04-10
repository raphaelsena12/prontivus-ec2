import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
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
  const [selected, setSelected] = useState<Prescricao | null>(null);

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Receitas</Text>
        <Text style={styles.subtitle}>{prescricoes?.length ?? 0} prescrições</Text>
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
            description="Suas prescrições médicas aparecerão aqui"
          />
        }
        renderItem={({ item }) => (
          <PrescricaoCard prescricao={item} onPress={() => setSelected(item)} />
        )}
      />

      <PrescricaoDetailModal
        prescricao={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

// ── Modal de Detalhes ─────────────────────────────────────────────────────────

function PrescricaoDetailModal({
  prescricao,
  visible,
  onClose,
}: {
  prescricao: Prescricao | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!prescricao) return null;

  const medCount = prescricao.medicamentos?.length ?? 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          {/* Header */}
          <View style={modal.header}>
            <View style={modal.headerIcon}>
              <Ionicons name="document-text" size={20} color="#F59E0B" />
            </View>
            <Text style={modal.title}>Detalhes da Receita</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modal.scroll} showsVerticalScrollIndicator={false}>
            {/* Médico */}
            <View style={modal.doctorCard}>
              <View style={modal.doctorAvatar}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.doctorName}>Dr(a). {prescricao.medico?.nome ?? '--'}</Text>
                {prescricao.medico?.crm && (
                  <Text style={modal.doctorCrm}>CRM: {prescricao.medico.crm}</Text>
                )}
                {prescricao.medico?.especialidade && (
                  <View style={modal.specBadge}>
                    <Text style={modal.specText}>{prescricao.medico.especialidade}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Info grid */}
            <View style={modal.infoRow}>
              <View style={modal.infoBox}>
                <View style={[modal.infoIconWrap, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={modal.infoLabel}>Emissão</Text>
                <Text style={modal.infoValue}>
                  {format(new Date(prescricao.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}
                </Text>
              </View>
              <View style={modal.infoBox}>
                <View style={[modal.infoIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="flask-outline" size={16} color="#F59E0B" />
                </View>
                <Text style={modal.infoLabel}>Medicamentos</Text>
                <Text style={modal.infoValue}>{medCount}</Text>
              </View>
            </View>

            {/* Medicamentos */}
            {prescricao.medicamentos?.length > 0 && (
              <View style={modal.medsSection}>
                <Text style={modal.medsSectionTitle}>Medicamentos</Text>
                {prescricao.medicamentos.map((med, idx) => (
                  <View key={med.id} style={modal.medCard}>
                    <View style={modal.medNumber}>
                      <Text style={modal.medNumberText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modal.medName}>{med.nome}</Text>
                      {med.dosagem && (
                        <View style={modal.medInfoRow}>
                          <Ionicons name="medical-outline" size={12} color={Colors.textMuted} />
                          <Text style={modal.medInfoText}>Dosagem: {med.dosagem}</Text>
                        </View>
                      )}
                      {med.posologia && (
                        <View style={modal.medInfoRow}>
                          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                          <Text style={modal.medInfoText}>Posologia: {med.posologia}</Text>
                        </View>
                      )}
                      {med.duracao && (
                        <View style={modal.medInfoRow}>
                          <Ionicons name="hourglass-outline" size={12} color={Colors.textMuted} />
                          <Text style={modal.medInfoText}>Duração: {med.duracao}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Observações */}
            {prescricao.observacoes && (
              <View style={modal.detailItem}>
                <View style={[modal.detailIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="chatbubble-outline" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modal.detailLabel}>Observações</Text>
                  <Text style={modal.detailValue}>{prescricao.observacoes}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={modal.footer}>
            <TouchableOpacity onPress={onClose} style={modal.footerBtn}>
              <Text style={modal.footerBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function PrescricaoCard({ prescricao, onPress }: { prescricao: Prescricao; onPress: () => void }) {
  const medCount = prescricao.medicamentos?.length ?? 0;

  return (
    <Card onPress={onPress} style={styles.card}>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, gap: 10,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  doctorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: 14, marginBottom: 14,
  },
  doctorAvatar: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  doctorName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  doctorCrm: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  specBadge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start', marginTop: 4,
  },
  specText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoBox: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: 12, gap: 4,
  },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  infoLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  medsSection: { marginBottom: 14 },
  medsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.text,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  medCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: 14, marginBottom: 8,
  },
  medNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  medNumberText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  medName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  medInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  medInfoText: { fontSize: 13, color: Colors.textSecondary },
  detailItem: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  detailIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 15, color: Colors.text, marginTop: 2, lineHeight: 22 },
  footer: {
    padding: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  footerBtn: { alignItems: 'center', paddingVertical: 10 },
  footerBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});

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
