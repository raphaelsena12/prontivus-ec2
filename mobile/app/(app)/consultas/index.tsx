import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
import Constants from 'expo-constants';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string })?.apiBaseUrl ??
  'http://localhost:3000';

const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
};

export default function ConsultasScreen() {
  const { data: consultas, isLoading, refetch, isRefetching } = useConsultas();
  const [selected, setSelected] = useState<Consulta | null>(null);

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

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
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="medical-outline"
            title="Nenhuma consulta"
            description="Suas consultas aparecerão aqui"
          />
        }
        renderItem={({ item }) => (
          <ConsultaCard consulta={item} onPress={() => setSelected(item)} />
        )}
      />

      <ConsultaDetailModal
        consulta={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

// ── Modal de Detalhes ─────────────────────────────────────────────────────────

function getTelemedicinaUrl(patientToken: string): string {
  return `${BASE_URL}/telemedicina/acesso?token=${patientToken}&skipConsent=1`;
}

function ConsultaDetailModal({
  consulta,
  visible,
  onClose,
}: {
  consulta: Consulta | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!consulta) return null;

  const isTelemedicina = consulta.modalidade === 'TELEMEDICINA';
  const session = consulta.telemedicineSession;
  const canJoinTelemedicina = isTelemedicina && session?.patientToken &&
    ['scheduled', 'waiting', 'in_progress'].includes(session.status) &&
    consulta.status !== 'CANCELADA' && consulta.status !== 'REALIZADA';

  function handleOpenTelemedicina() {
    if (!session?.patientToken) return;
    const url = getTelemedicinaUrl(session.patientToken);
    router.push({ pathname: '/(app)/agendamentos/consulta-web', params: { url, titulo: 'Teleconsulta' } });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          {/* Header */}
          <View style={modal.header}>
            <View style={modal.headerIcon}>
              <Ionicons name="medical" size={20} color={Colors.primary} />
            </View>
            <Text style={modal.title}>Detalhes da Consulta</Text>
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
                <Text style={modal.doctorName}>Dr(a). {consulta.medico?.nome ?? '--'}</Text>
                {consulta.medico?.crm && (
                  <Text style={modal.doctorCrm}>CRM: {consulta.medico.crm}</Text>
                )}
                {consulta.medico?.especialidade && (
                  <View style={modal.specBadge}>
                    <Text style={modal.specText}>{consulta.medico.especialidade}</Text>
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
                <Text style={modal.infoLabel}>Data</Text>
                <Text style={modal.infoValue}>
                  {format(new Date(consulta.dataHora), "dd/MM/yyyy", { locale: ptBR })}
                </Text>
                <Text style={modal.infoSub}>
                  {format(new Date(consulta.dataHora), "EEEE, HH:mm", { locale: ptBR })}
                </Text>
              </View>
              <View style={modal.infoBox}>
                <View style={[modal.infoIconWrap, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="pulse-outline" size={16} color={Colors.success} />
                </View>
                <Text style={modal.infoLabel}>Status</Text>
                <Badge
                  label={statusLabel[consulta.status] ?? consulta.status}
                  status={consulta.status}
                />
              </View>
            </View>

            {/* Modalidade */}
            <View style={modal.detailItem}>
              <View style={[modal.detailIcon, { backgroundColor: isTelemedicina ? '#ECFDF5' : '#EFF6FF' }]}>
                <Ionicons
                  name={isTelemedicina ? 'videocam-outline' : 'location-outline'}
                  size={16}
                  color={isTelemedicina ? '#10B981' : '#3B82F6'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.detailLabel}>Modalidade</Text>
                <Text style={modal.detailValue}>
                  {isTelemedicina ? 'Telemedicina' : 'Presencial'}
                </Text>
              </View>
            </View>

            {/* Clínica */}
            {consulta.clinica && (
              <View style={modal.detailItem}>
                <View style={[modal.detailIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="business-outline" size={16} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modal.detailLabel}>Clínica</Text>
                  <Text style={modal.detailValue}>{consulta.clinica.nome}</Text>
                </View>
              </View>
            )}

            {/* Tipo */}
            {consulta.tipo && (
              <View style={modal.detailItem}>
                <View style={[modal.detailIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="medkit-outline" size={16} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modal.detailLabel}>Tipo</Text>
                  <Text style={modal.detailValue}>{consulta.tipo}</Text>
                </View>
              </View>
            )}

            {/* Telemedicina - Link de acesso */}
            {isTelemedicina && (
              <View style={modal.detailItem}>
                <View style={[modal.detailIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="link-outline" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modal.detailLabel}>Acesso Telemedicina</Text>
                  {canJoinTelemedicina ? (
                    <TouchableOpacity onPress={handleOpenTelemedicina} style={modal.teleBtn}>
                      <Ionicons name="videocam" size={16} color={Colors.white} />
                      <Text style={modal.teleBtnText}>Entrar na consulta</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[modal.detailValue, { color: Colors.textMuted }]}>
                      {consulta.status === 'CANCELADA' ? 'Consulta cancelada' :
                       consulta.status === 'REALIZADA' ? 'Consulta finalizada' :
                       !session ? 'Link ainda não disponível' :
                       'Indisponível'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Observações */}
            {consulta.observacoes && (
              <View style={modal.detailItem}>
                <View style={[modal.detailIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="chatbubble-outline" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modal.detailLabel}>Observações</Text>
                  <Text style={modal.detailValue}>{consulta.observacoes}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={modal.footer}>
            {canJoinTelemedicina ? (
              <TouchableOpacity onPress={handleOpenTelemedicina} style={modal.footerTeleBtn}>
                <Ionicons name="videocam" size={18} color={Colors.white} />
                <Text style={modal.footerTeleBtnText}>Entrar na Teleconsulta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} style={modal.footerBtn}>
                <Text style={modal.footerBtnText}>Fechar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ConsultaCard({ consulta, onPress }: { consulta: Consulta; onPress: () => void }) {
  const dataFormatada = format(new Date(consulta.dataHora), "dd MMM", { locale: ptBR });
  const horaFormatada = format(new Date(consulta.dataHora), "HH:mm");
  const isTelemedicina = consulta.modalidade === 'TELEMEDICINA';

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardBody}>
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

        <View style={styles.cardInfo}>
          <Text style={styles.doctorName}>Dr(a). {consulta.medico?.nome ?? '--'}</Text>
          {consulta.medico?.especialidade && (
            <Text style={styles.especialidade}>{consulta.medico.especialidade}</Text>
          )}
          {consulta.tipo && (
            <Text style={styles.tipoConsulta}>{consulta.tipo}</Text>
          )}
          <View style={styles.badgeRow}>
            <Badge
              label={statusLabel[consulta.status] ?? consulta.status}
              status={consulta.status}
              size="sm"
            />
            {isTelemedicina && (
              <View style={styles.teleBadge}>
                <Ionicons name="videocam" size={10} color="#10B981" />
                <Text style={styles.teleBadgeText}>Tele</Text>
              </View>
            )}
          </View>
        </View>

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
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
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
  infoSub: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
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
  teleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10B981', borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4,
  },
  teleBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  footerTeleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', borderRadius: BorderRadius.md,
    paddingVertical: 14,
  },
  footerTeleBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  list: { padding: 20, paddingTop: 8, gap: 10 },
  card: { padding: 0 },
  cardBody: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14,
  },
  datePill: {
    width: 56, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, gap: 2,
  },
  datePillDone: { backgroundColor: Colors.successLight },
  datePillCancel: { backgroundColor: Colors.errorLight },
  datePillDay: {
    fontSize: 12, fontWeight: '800', color: Colors.primary, textTransform: 'capitalize',
  },
  datePillTime: { fontSize: 11, fontWeight: '600', color: Colors.primaryDark },
  datePillTextDone: { color: Colors.successDark },
  datePillTextCancel: { color: Colors.errorDark },
  cardInfo: { flex: 1, gap: 3 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  especialidade: { fontSize: 13, color: Colors.textSecondary },
  tipoConsulta: { fontSize: 12, color: Colors.textMuted },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  teleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  teleBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  arrowWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
});
