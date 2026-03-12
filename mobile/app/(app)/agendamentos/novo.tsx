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
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMedicos, useHorariosDisponiveis } from '../../../hooks/useMedicos';
import { useCreateAgendamento } from '../../../hooks/useAgendamentos';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Colors } from '../../../constants/colors';
import { Medico } from '../../../types/api.types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Step = 'medico' | 'data' | 'horario' | 'confirmacao';

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

  // Gera os próximos 14 dias para seleção
  const diasDisponiveis = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step === 'medico' ? router.back() : setStep(getPrevStep(step)))}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{stepLabels[step]}</Text>
      </View>

      {/* Step: Médico */}
      {step === 'medico' && (
        loadingMedicos ? <LoadingSpinner /> : (
          <FlatList
            data={medicos}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setMedicoSelecionado(item); setStep('data'); }}>
                <Card style={styles.itemCard}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>Dr(a). {item.nome}</Text>
                    {item.especialidade && <Text style={styles.itemSub}>{item.especialidade}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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
          renderItem={({ item }) => {
            const selected = dataSelecionada?.toDateString() === item.toDateString();
            return (
              <TouchableOpacity
                onPress={() => { setDataSelecionada(item); setStep('horario'); }}
              >
                <Card style={StyleSheet.flatten([styles.dateCard, selected && styles.dateCardSelected])}>
                  <Text style={StyleSheet.flatten([styles.dateDayName, selected && styles.dateTextSelected])}>
                    {format(item, 'EEEE', { locale: ptBR })}
                  </Text>
                  <Text style={StyleSheet.flatten([styles.dateValue, selected && styles.dateTextSelected])}>
                    {format(item, "dd 'de' MMMM", { locale: ptBR })}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Step: Horário */}
      {step === 'horario' && (
        loadingHorarios ? <LoadingSpinner /> : (
          <FlatList
            data={horarios?.filter((h) => h.disponivel)}
            keyExtractor={(h) => h.dataHora}
            contentContainerStyle={styles.list}
            numColumns={3}
            columnWrapperStyle={styles.horarioRow}
            renderItem={({ item }) => {
              const selected = horarioSelecionado === item.dataHora;
              return (
                <TouchableOpacity
                  style={[styles.horarioChip, selected && styles.horarioChipSelected]}
                  onPress={() => { setHorarioSelecionado(item.dataHora); setStep('confirmacao'); }}
                >
                  <Text style={[styles.horarioText, selected && styles.horarioTextSelected]}>
                    {format(new Date(item.dataHora), 'HH:mm')}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )
      )}

      {/* Step: Confirmação */}
      {step === 'confirmacao' && medicoSelecionado && horarioSelecionado && (
        <ScrollView contentContainerStyle={styles.list}>
          <Card style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Resumo do agendamento</Text>

            <View style={styles.confirmRow}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
              <Text style={styles.confirmText}>Dr(a). {medicoSelecionado.nome}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.confirmText}>
                {format(new Date(horarioSelecionado), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </Text>
            </View>
          </Card>

          <Button
            title="Confirmar agendamento"
            onPress={handleConfirmar}
            loading={criarAgendamento.isPending}
            style={styles.confirmBtn}
          />
          <Button
            title="Voltar"
            onPress={() => setStep('horario')}
            variant="ghost"
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getPrevStep(step: Step): Step {
  const steps: Step[] = ['medico', 'data', 'horario', 'confirmacao'];
  const idx = steps.indexOf(step);
  return steps[Math.max(0, idx - 1)];
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
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  list: { padding: 20, paddingTop: 8, gap: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.textSecondary },
  dateCard: { gap: 4 },
  dateCardSelected: { backgroundColor: Colors.primary },
  dateDayName: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  dateValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  dateTextSelected: { color: Colors.white },
  horarioRow: { gap: 10, marginBottom: 10 },
  horarioChip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horarioChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  horarioText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  horarioTextSelected: { color: Colors.white },
  confirmCard: { gap: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmText: { fontSize: 15, color: Colors.text },
  confirmBtn: { marginTop: 8 },
});
