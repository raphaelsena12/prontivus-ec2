import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Modal, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { telemeditcinaService } from '../../../services/telemedicina.service';
import { MedicoOnline } from '../../../types/api.types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors, BorderRadius } from '../../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

function getAvatarColor(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function MedicoAvatar({ medico, size = 48 }: { medico: MedicoOnline; size?: number }) {
  const [imgError, setImgError] = useState(false);
  if (medico.fotoUrl && !imgError) {
    return (
      <Image
        source={{ uri: medico.fotoUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.3 }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.3,
      backgroundColor: getAvatarColor(medico.id),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.33 }}>
        {getInitials(medico.nome)}
      </Text>
    </View>
  );
}

// ── Modal de Confirmacao ─────────────────────────────────────────────────────

function ConsultaModal({
  medico, visible, onClose,
}: { medico: MedicoOnline | null; visible: boolean; onClose: () => void }) {
  const [criandoPI, setCriandoPI] = useState(false);

  async function handleContinuar() {
    if (!medico) return;
    setCriandoPI(true);
    try {
      const result = await telemeditcinaService.criarPaymentIntent({
        medicoTelemedicinaId: medico.medicoTelemedicinaId,
        medicoId: medico.id,
        valor: medico.valorConsulta,
        medicoNome: medico.nome,
        especialidade: medico.especialidade,
      });
      onClose();
      router.push({
        pathname: '/(app)/agendamentos/pagamento-telemedicina',
        params: {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
          pagamentoId: result.pagamentoId,
          medicoId: medico.id,
          medicoTelemedicinaId: medico.medicoTelemedicinaId,
          medicoNome: medico.nome,
          valor: String(medico.valorConsulta),
        },
      });
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error ?? 'Nao foi possivel iniciar o pagamento.');
    } finally {
      setCriandoPI(false);
    }
  }

  if (!medico) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.content}>
            {/* Title */}
            <Text style={modal.titulo}>Confirmar consulta</Text>

            {/* Doctor card */}
            <View style={modal.medicoCard}>
              <MedicoAvatar medico={medico} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={modal.medicoNome}>{medico.nome}</Text>
                <Text style={modal.medicoEsp}>{medico.especialidade}</Text>
                <Text style={modal.medicoCrm}>{medico.crm}</Text>
                {medico.tags.length > 0 && (
                  <View style={modal.tagsRow}>
                    {medico.tags.slice(0, 3).map(t => (
                      <View key={t} style={modal.tag}><Text style={modal.tagText}>{t}</Text></View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Value + duration */}
            <View style={modal.infoRow}>
              <View style={modal.infoBox}>
                <View style={modal.infoIconWrap}>
                  <Ionicons name="card-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={modal.infoLabel}>Valor da consulta</Text>
                <Text style={modal.infoValue}>R$ {medico.valorConsulta.toFixed(2).replace('.', ',')}</Text>
              </View>
              <View style={modal.infoBox}>
                <View style={[modal.infoIconWrap, { backgroundColor: Colors.accentLight }]}>
                  <Ionicons name="time-outline" size={16} color={Colors.accent} />
                </View>
                <Text style={modal.infoLabel}>Duracao estimada</Text>
                <Text style={modal.infoValue}>{medico.tempoConsultaMin} min</Text>
              </View>
            </View>

            {/* Bio */}
            {medico.bio && (
              <Text style={modal.bio} numberOfLines={3}>{medico.bio}</Text>
            )}

            {/* Notice */}
            <View style={modal.aviso}>
              <View style={modal.avisoIcon}>
                <Ionicons name="videocam" size={14} color={Colors.accent} />
              </View>
              <Text style={modal.avisoText}>
                Consulta por video dentro do app. Apos o pagamento, voce tera acesso imediato a sala.
              </Text>
            </View>

            {/* Flow info */}
            <View style={modal.flowRow}>
              <FlowStep icon="card-outline" label="Pagar" active />
              <View style={modal.flowLine} />
              <FlowStep icon="videocam-outline" label="Consultar" />
              <View style={modal.flowLine} />
              <FlowStep icon="checkmark-circle-outline" label="Concluir" />
            </View>

            <Button
              title={criandoPI ? 'Aguarde...' : 'Continuar para pagamento'}
              onPress={handleContinuar}
              disabled={criandoPI}
              loading={criandoPI}
              size="lg"
              icon="arrow-forward-outline"
            />
            <TouchableOpacity onPress={onClose} style={modal.cancelBtn}>
              <Text style={modal.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FlowStep({ icon, label, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean }) {
  return (
    <View style={modal.flowStep}>
      <View style={[modal.flowStepIcon, active && modal.flowStepIconActive]}>
        <Ionicons name={icon} size={16} color={active ? Colors.white : Colors.textMuted} />
      </View>
      <Text style={[modal.flowStepLabel, active && modal.flowStepLabelActive]}>{label}</Text>
    </View>
  );
}

// ── Card Medico ─────────────────────────────────────────────────────────────

function MedicoCard({ medico, onPress }: { medico: MedicoOnline; onPress: () => void }) {
  const online = medico.status === 'ONLINE';
  return (
    <Card style={styles.medicoCard}>
      <View style={styles.medicoCardBody}>
        <View style={styles.medicoCardHeader}>
          <View style={{ position: 'relative' }}>
            <MedicoAvatar medico={medico} size={52} />
            <View style={[styles.statusDot, { backgroundColor: online ? '#10B981' : '#F59E0B' }]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.medicoNome} numberOfLines={1}>{medico.nome}</Text>
            <Text style={styles.medicoEsp}>{medico.especialidade}</Text>
            <Text style={styles.medicoCrm}>{medico.crm}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: online ? '#ECFDF5' : '#FFFBEB' }]}>
            <View style={[styles.badgeDot, { backgroundColor: online ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.badgeText, { color: online ? '#065F46' : '#92400E' }]}>
              {online ? 'Online' : 'Ocupado'}
            </Text>
          </View>
        </View>

        {medico.bio && (
          <Text style={styles.medicosBio} numberOfLines={2}>{medico.bio}</Text>
        )}

        {medico.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {medico.tags.map(t => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        )}

        <View style={styles.medicoCardFooter}>
          <View>
            <Text style={styles.footerLabel}>Consulta a partir de</Text>
            <Text style={styles.footerValor}>R$ {medico.valorConsulta.toFixed(2).replace('.', ',')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.iniciarBtn, !online && styles.iniciarBtnDisabled]}
            onPress={onPress}
            disabled={!online}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={15} color={online ? '#fff' : Colors.textMuted} />
            <Text style={[styles.iniciarBtnText, !online && { color: Colors.textMuted }]}>
              {online ? 'Iniciar Consulta' : 'Em Atendimento'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

// ── Tela Principal ──────────────────────────────────────────────────────────

export default function TelemedicinaScreen() {
  const [tab, setTab] = useState<'medicos' | 'sessoes'>('medicos');
  const [search, setSearch] = useState('');
  const [especialidade, setEspecialidade] = useState('Todas');
  const [medicoModal, setMedicoModal] = useState<MedicoOnline | null>(null);

  const {
    data: medicos = [],
    isLoading: loadingMedicos,
    refetch: refetchMedicos,
    isRefetching,
  } = useQuery({
    queryKey: ['medicos-online'],
    queryFn: telemeditcinaService.getMedicosOnline,
    refetchInterval: 30_000,
  });

  const { data: sessoes, isLoading: loadingSessoes } = useQuery({
    queryKey: ['telemedicina'],
    queryFn: telemeditcinaService.getSessoes,
    enabled: tab === 'sessoes',
  });

  const especialidades = ['Todas', ...Array.from(new Set(medicos.map(m => m.especialidade))).sort()];

  const filtered = medicos.filter(m => {
    const matchEsp = especialidade === 'Todas' || m.especialidade === especialidade;
    const matchSearch = !search
      || m.nome.toLowerCase().includes(search.toLowerCase())
      || m.especialidade.toLowerCase().includes(search.toLowerCase())
      || m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchEsp && matchSearch;
  });

  const onlineList = filtered.filter(m => m.status === 'ONLINE');
  const ocupadoList = filtered.filter(m => m.status === 'EM_ATENDIMENTO');
  const onlineCount = medicos.filter(m => m.status === 'ONLINE').length;

  function entrarNaSessao(link: string, nomeMedico: string) {
    router.push({
      pathname: '/(app)/agendamentos/consulta-web',
      params: { url: link, titulo: `Dr(a). ${nomeMedico}` },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ConsultaModal
        medico={medicoModal}
        visible={!!medicoModal}
        onClose={() => setMedicoModal(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Telemedicina</Text>
        {tab === 'medicos' && (
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlinePillText}>
              {loadingMedicos ? '...' : `${onlineCount} online`}
            </Text>
          </View>
        )}
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color={Colors.accent} />
        <Text style={styles.infoBannerText}>
          Pague pelo app e realize sua consulta por video sem sair
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'medicos' && styles.tabActive]}
          onPress={() => setTab('medicos')}
        >
          <Ionicons
            name={tab === 'medicos' ? 'people' : 'people-outline'}
            size={16}
            color={tab === 'medicos' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, tab === 'medicos' && styles.tabTextActive]}>
            Medicos Online
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'sessoes' && styles.tabActive]}
          onPress={() => setTab('sessoes')}
        >
          <Ionicons
            name={tab === 'sessoes' ? 'list' : 'list-outline'}
            size={16}
            color={tab === 'sessoes' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, tab === 'sessoes' && styles.tabTextActive]}>
            Minhas Sessoes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab: Medicos Online */}
      {tab === 'medicos' && (
        <>
          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar medico, especialidade..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Specialty filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {especialidades.map(esp => (
              <TouchableOpacity
                key={esp}
                style={[styles.filterChip, especialidade === esp && styles.filterChipActive]}
                onPress={() => setEspecialidade(esp)}
              >
                <Text style={[styles.filterChipText, especialidade === esp && styles.filterChipTextActive]}>
                  {esp}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingMedicos ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              data={[...onlineList, ...ocupadoList]}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshing={isRefetching}
              onRefresh={refetchMedicos}
              ListHeaderComponent={
                onlineList.length > 0 ? (
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.sectionTitle}>Disponiveis Agora</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{onlineList.length}</Text>
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => {
                const sortedList = [...onlineList, ...ocupadoList];
                const showOcupadoHeader = item.status === 'EM_ATENDIMENTO' &&
                  (index === 0 || sortedList[index - 1]?.status !== 'EM_ATENDIMENTO');
                return (
                  <>
                    {showOcupadoHeader && (
                      <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.sectionTitle}>Em Atendimento</Text>
                        <View style={[styles.sectionBadge, { backgroundColor: '#FFFBEB' }]}>
                          <Text style={[styles.sectionBadgeText, { color: '#92400E' }]}>{ocupadoList.length}</Text>
                        </View>
                      </View>
                    )}
                    <MedicoCard medico={item} onPress={() => item.status === 'ONLINE' && setMedicoModal(item)} />
                  </>
                );
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="videocam-outline"
                  title={medicos.length === 0 ? 'Nenhum medico online' : 'Nenhum medico encontrado'}
                  description={medicos.length === 0
                    ? 'Tente novamente mais tarde ou agende uma consulta'
                    : 'Ajuste os filtros ou a busca'}
                />
              }
            />
          )}
        </>
      )}

      {/* Tab: Sessions */}
      {tab === 'sessoes' && (
        loadingSessoes ? <LoadingSpinner /> : (
          <FlatList
            data={sessoes}
            keyExtractor={s => s.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="videocam-outline"
                title="Nenhuma sessao disponivel"
                description="Suas consultas de telemedicina aparecerao aqui"
              />
            }
            renderItem={({ item }) => (
              <Card style={styles.sessaoCard}>
                <View style={styles.sessaoHeader}>
                  <View style={styles.sessaoIconWrap}>
                    <Ionicons name="videocam" size={20} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessaoDoctorName}>Dr(a). {item.consulta?.medico?.nome ?? '--'}</Text>
                    <Text style={styles.sessaoDate}>
                      {item.consulta?.dataHora ? format(new Date(item.consulta.dataHora), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) : '--'}
                    </Text>
                  </View>
                </View>
                {item.linkAcesso && (
                  <Button
                    title="Entrar na consulta"
                    onPress={() => entrarNaSessao(item.linkAcesso!, item.consulta.medico.nome)}
                    icon="videocam-outline"
                    variant="success"
                  />
                )}
              </Card>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
  },
  content: { padding: 24, gap: 16 },
  titulo: { fontSize: 20, fontWeight: '800', color: Colors.text },
  medicoCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: 14,
  },
  medicoNome: { fontSize: 15, fontWeight: '800', color: Colors.text },
  medicoEsp: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  medicoCrm: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 4,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  bio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  aviso: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'flex-start',
  },
  avisoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(13,148,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoText: { flex: 1, fontSize: 13, color: '#115E59', lineHeight: 18 },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  flowStep: { alignItems: 'center', gap: 4 },
  flowStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStepIconActive: { backgroundColor: Colors.primary },
  flowStepLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  flowStepLabelActive: { color: Colors.primary, fontWeight: '700' },
  flowLine: { width: 32, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  cancelBtn: { alignItems: 'center', marginTop: 4, paddingVertical: 8 },
  cancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 12 },
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  onlinePillText: { fontSize: 11, fontWeight: '600', color: '#065F46' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  infoBannerText: { flex: 1, fontSize: 12, color: '#115E59', fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { fontWeight: '700', color: Colors.text },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  filterScroll: { marginTop: 8 },
  filterContent: { paddingHorizontal: 16, gap: 6, paddingVertical: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  list: { padding: 16, gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginTop: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  sectionBadge: { backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  medicoCard: { padding: 0, overflow: 'hidden', gap: 0 },
  medicoCardBody: { padding: 16, gap: 10 },
  medicoCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  medicoNome: { fontSize: 15, fontWeight: '800', color: Colors.text },
  medicoEsp: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  medicoCrm: { fontSize: 11, color: Colors.textMuted },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  medicosBio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  medicoCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    marginTop: 2,
  },
  footerLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  footerValor: { fontSize: 17, fontWeight: '800', color: Colors.text },
  iniciarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  iniciarBtnDisabled: {
    backgroundColor: Colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },
  iniciarBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sessaoCard: { gap: 14 },
  sessaoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessaoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessaoDoctorName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sessaoDate: { fontSize: 13, color: Colors.textSecondary },
});
