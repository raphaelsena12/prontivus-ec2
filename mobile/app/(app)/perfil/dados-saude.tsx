import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Colors, BorderRadius } from '../../../constants/colors';
import api from '../../../services/api';

interface DadosSaude {
  alergias: string;
  medicamentosEmUso: string;
}

export default function DadosSaudeScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dados, setDados] = useState<DadosSaude>({ alergias: '', medicamentosEmUso: '' });
  const [original, setOriginal] = useState<DadosSaude>({ alergias: '', medicamentosEmUso: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get('/api/paciente/meus-dados');
        if (cancelled) return;
        const normalized: DadosSaude = {
          alergias: res.data?.alergias ?? '',
          medicamentosEmUso: res.data?.medicamentosEmUso ?? '',
        };
        setDados(normalized);
        setOriginal(normalized);
      } catch (error) {
        if (!cancelled) {
          Alert.alert('Erro', 'Não foi possível carregar seus dados de saúde');
          console.error(error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges =
    dados.alergias.trim() !== original.alergias.trim() ||
    dados.medicamentosEmUso.trim() !== original.medicamentosEmUso.trim();

  async function handleSave() {
    try {
      setSaving(true);
      const res = await api.patch('/api/paciente/meus-dados', {
        alergias: dados.alergias.trim() || null,
        medicamentosEmUso: dados.medicamentosEmUso.trim() || null,
      });
      const normalized: DadosSaude = {
        alergias: res.data?.alergias ?? '',
        medicamentosEmUso: res.data?.medicamentosEmUso ?? '',
      };
      setDados(normalized);
      setOriginal(normalized);
      Alert.alert('Sucesso', 'Seus dados de saúde foram atualizados.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar seus dados de saúde');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados de saúde</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Informe suas alergias e medicamentos em uso. Essas informações ficam visíveis para a
          equipe médica durante o atendimento.
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.labelRow}>
                <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                <Text style={[styles.label, { color: '#B91C1C' }]}>Alergias</Text>
              </View>
              <TextInput
                style={styles.textarea}
                value={dados.alergias}
                onChangeText={(v) => setDados((d) => ({ ...d, alergias: v }))}
                placeholder="Ex.: Dipirona, penicilina, frutos do mar..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!saving}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Liste substâncias e reações, separando por vírgula. Deixe em branco se não houver.
              </Text>
            </Card>

            <Card style={styles.card}>
              <View style={styles.labelRow}>
                <Ionicons name="medkit-outline" size={18} color="#B45309" />
                <Text style={[styles.label, { color: '#B45309' }]}>Medicamentos em uso</Text>
              </View>
              <TextInput
                style={[styles.textarea, { minHeight: 110 }]}
                value={dados.medicamentosEmUso}
                onChangeText={(v) => setDados((d) => ({ ...d, medicamentosEmUso: v }))}
                placeholder="Ex.: Losartana 50mg 1x/dia; Metformina 850mg 2x/dia..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={1000}
                editable={!saving}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Inclua nome, dose e frequência. Deixe em branco se não usa medicação contínua.
              </Text>
            </Card>

            <Button
              title="Salvar alterações"
              onPress={handleSave}
              loading={saving}
              disabled={!hasChanges || saving}
              icon="save-outline"
            />
          </>
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
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  container: { padding: 20, gap: 16 },
  intro: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  loadingBox: { padding: 32, alignItems: 'center' },
  card: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, fontWeight: '700' },
  textarea: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    backgroundColor: Colors.white,
  },
  hint: { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
});
