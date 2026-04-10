import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMedicos, useHorariosDisponiveis } from '../../../hooks/useMedicos';
import { useCreateAgendamento } from '../../../hooks/useAgendamentos';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors, BorderRadius } from '../../../constants/colors';
import { Medico } from '../../../types/api.types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Step = 'medico' | 'data' | 'horario' | 'confirmacao';

const STEPS: Step[] = ['medico', 'data', 'horario', 'confirmacao'];

export default function NovoAgendamentoScreen() {
  const [step, setStep] = useState<Step>('medico');
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);

  const { data: medicos, isLoading: loadingMedicos } = useMedicos();
  const { data: horarios, isLoading: loadingHorarios } = useHorariosDisponiveis(
    medicoSelecionado?.id ?? '',
    dataSelecionada ? format(dataSelecionada, 'yyyy-MM-dd') : ''
  );
  const criarAgendamento = useCreateAgendamento();

  const stepLabels: Record<Step, string> = {
    medico: 'Escolha o médico',
    data: 'Escolha a data',
    horario: 'Escolha o horário',
    confirmacao: 'Confirmação',
  };

  const stepIndex = STEPS.indexOf(step);

  async function handleConfirmar() {
    if (!medicoSelecionado || !horarioSelecionado) return;
    try {
      await criarAgendamento.mutateAsync({
        medicoId: medicoSelecionado.id,
        dataHora: horarioSelecionado,
      });
      Alert.alert('Sucesso', 'Consulta agendada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(app)/agendamentos') },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível realizar o agendamento. Tente novamente.');
    }
  }

  const diasDisponiveis = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'medico' ? router.back() : setStep(getPrevStep(step)))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{stepLabels[step]}</Text>
          <Text style={styles.stepIndicator}>Passo {stepIndex + 1} de 4</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              i <= stepIndex && styles.progressDotActive,
              i < stepIndex && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {/* Step: Medico */}
      {step === 'medico' && (
        loadingMedicos ? <LoadingSpinner /> : (
          <FlatList
            data={medicos}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setMedicoSelecionado(item); setStep('data'); }}
                activeOpacity={0.7}
              >
                <Card style={styles.medicoCard}>
                  <View style={styles.medicoAvatar}>
                    <Ionicons name="person" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.medicoInfo}>
                    <Text style={styles.medicoName}>Dr(a). {item.nome}</Text>
                    {item.especialidade && (
                      <Text style={styles.medicoSpec}>{item.especialidade}</Text>
                    )}
                    {item.crm && (
                      <Text style={styles.medicoCrm}>CRM: {item.crm}</Text>
                    )}
                  </View>
                  <View style={styles.medicoArrow}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* Step: Data */}
      {step === 'data' && (
        <FlatList
          data={diasDisponiveis}
          keyExtractor={(d) => d.toISOString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = dataSelecionada?.toDateString() === item.toDateString();
            return (
              <TouchableOpacity
                onPress={() => { setDataSelecionada(item); setStep('horario'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.dateCard, selected && styles.dateCardSelected]}>
                  <View style={[styles.dateIconWrap, selected && styles.dateIconWrapSelected]}>
                    <Text style={[styles.dateNum, selected && styles.dateTextSelected]}>
                      {format(item, 'dd')}
                    </Text>
                    <Text style={[styles.dateMonth, selected && styles.dateTextSelected]}>
                      {format(item, 'MMM', { locale: ptBR })}
                    </Text>
                  </View>
                  <View style={styles.dateInfo}>
                    <Text style={[styles.dateDayName, selected && styles.dateTextSelected]}>
                      {format(item, 'EEEE', { locale: ptBR })}
                    </Text>
                    <Text style={[styles.dateValue, selected && styles.dateSubSelected]}>
                      {format(item, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={selected ? Colors.white : Colors.textMuted}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Step: Horario */}
      {step === 'horario' && (
        loadingHorarios ? <LoadingSpinner /> : (
          <FlatList
            data={horarios?.filter((h) => h.disponivel)}
            keyExtractor={(h) => h.dataHora}
            contentContainerStyle={styles.list}
            numColumns={3}
            columnWrapperStyle={styles.horarioRow}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.horarioHint}>
                Selecione um horario disponivel
              </Text>
            }
            renderItem={({ item }) => {
              const selected = horarioSelecionado === item.dataHora;
              return (
                <TouchableOpacity
                  style={[styles.horarioChip, selected && styles.horarioChipSelected]}
                  onPress={() => { setHorarioSelecionado(item.dataHora); setStep('confirmacao'); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={selected ? Colors.white : Colors.textMuted}
                  />
                  <Text style={[styles.horarioText, selected && styles.horarioTextSelected]}>
                    {format(new Date(item.dataHora), 'HH:mm')}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )
      )}

      {/* Step: Confirmacao */}
      {step === 'confirmacao' && medicoSelecionado && horarioSelecionado && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Card variant="elevated" style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
            </View>
            <Text style={styles.confirmTitle}>Resumo do agendamento</Text>

            <View style={styles.confirmDivider} />

            <View style={styles.confirmRow}>
              <View style={styles.confirmRowIcon}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmLabel}>Medico</Text>
                <Text style={styles.confirmValue}>Dr(a). {medicoSelecionado.nome}</Text>
              </View>
            </View>

            <View style={styles.confirmRow}>
              <View style={styles.confirmRowIcon}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmLabel}>Data e horario</Text>
                <Text style={styles.confirmValue}>
                  {format(new Date(horarioSelecionado), "dd 'de' MMMM 'de' yyyy 'as' HH:mm", {
                    locale: ptBR,
                  })}
                </Text>
              </View>
            </View>
          </Card>

          <Button
            title="Confirmar agendamento"
            onPress={handleConfirmar}
            loading={criarAgendamento.isPending}
            size="lg"
            icon="checkmark-circle-outline"
            style={{ marginTop: 8 }}
          />
          <Button
            title="Voltar e alterar"
            onPress={() => setStep('horario')}
            variant="ghost"
            icon="arrow-back-outline"
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getPrevStep(step: Step): Step {
  const idx = STEPS.indexOf(step);
  return STEPS[Math.max(0, idx - 1)];
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
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  stepIndicator: { fontSize: 12, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primaryMuted,
  },
  progressDotDone: {
    backgroundColor: Colors.primary,
  },
  list: { padding: 20, paddingTop: 8, gap: 10 },

  // Medico card
  medicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  medicoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicoInfo: { flex: 1 },
  medicoName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  medicoSpec: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  medicoCrm: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  medicoArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Date card
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dateCardSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateNum: { fontSize: 18, fontWeight: '800', color: Colors.primary, lineHeight: 20 },
  dateMonth: { fontSize: 10, fontWeight: '600', color: Colors.primaryDark, textTransform: 'uppercase' },
  dateInfo: { flex: 1 },
  dateDayName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  dateValue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  dateTextSelected: { color: Colors.white },
  dateSubSelected: { color: 'rgba(255,255,255,0.75)' },

  // Horario
  horarioHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  horarioRow: { gap: 10, marginBottom: 10 },
  horarioChip: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horarioChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  horarioText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  horarioTextSelected: { color: Colors.white },

  // Confirmation
  confirmCard: { gap: 14, alignItems: 'center', paddingVertical: 24 },
  confirmIconWrap: { marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  confirmDivider: { width: '100%', height: 1, backgroundColor: Colors.border },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  confirmRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  confirmValue: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 2 },
});
