import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useExames, useDeleteExame } from '../../../hooks/useExames';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { Colors, BorderRadius } from '../../../constants/colors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exames, isLoading } = useExames();
  const deleteMutation = useDeleteExame();

  const exame = exames?.find((e) => e.id === id);

  if (isLoading) return <LoadingSpinner />;

  if (!exame) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Exame não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isImage = exame.tipoArquivo === 'imagem';

  const handleOpenExternal = async () => {
    if (exame.url) {
      await WebBrowser.openBrowserAsync(exame.url);
    } else {
      Alert.alert('Erro', 'URL do arquivo não disponível.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Remover exame', `Deseja remover "${exame.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(exame.id);
            router.back();
          } catch {
            Alert.alert('Erro', 'Erro ao remover exame.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{exame.nome}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Preview */}
        {isImage && exame.url ? (
          <TouchableOpacity onPress={handleOpenExternal} activeOpacity={0.9}>
            <Image
              source={{ uri: exame.url }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.docPreview} onPress={handleOpenExternal}>
            <Ionicons
              name={exame.tipoArquivo === 'pdf' ? 'document' : 'document-text'}
              size={48}
              color={exame.tipoArquivo === 'pdf' ? '#EF4444' : '#3B82F6'}
            />
            <Text style={styles.docPreviewText}>Toque para abrir</Text>
          </TouchableOpacity>
        )}

        {/* Details */}
        <View style={styles.detailsCard}>
          <DetailRow label="Nome" value={exame.nome} />
          <DetailRow label="Arquivo" value={exame.nomeArquivo} />
          <DetailRow label="Tipo" value={exame.tipoArquivo.toUpperCase()} />
          <DetailRow label="Tamanho" value={formatFileSize(exame.tamanho)} />
          <DetailRow
            label="Enviado em"
            value={format(new Date(exame.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          />
          {exame.dataExame && (
            <DetailRow
              label="Data do exame"
              value={format(new Date(exame.dataExame), "dd/MM/yyyy", { locale: ptBR })}
            />
          )}
          {exame.observacoes && <DetailRow label="Observações" value={exame.observacoes} />}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Abrir arquivo"
            onPress={handleOpenExternal}
            icon="open-outline"
            variant="outline"
          />
          <Button
            title="Remover exame"
            onPress={handleDelete}
            icon="trash-outline"
            variant="danger"
            loading={deleteMutation.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  imagePreview: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
  },
  docPreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  docPreviewText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 15, color: Colors.text },
  actions: { gap: 12 },
});
