import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useExames, useUploadExame, useDeleteExame } from '../../../hooks/useExames';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Colors, BorderRadius } from '../../../constants/colors';
import { ExamePaciente } from '../../../types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIconForType(tipo: string): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (tipo) {
    case 'imagem':
      return { name: 'image', color: '#8B5CF6', bg: '#F5F3FF' };
    case 'pdf':
      return { name: 'document', color: '#EF4444', bg: '#FEF2F2' };
    default:
      return { name: 'document-text', color: '#3B82F6', bg: '#EFF6FF' };
  }
}

export default function ExamesScreen() {
  const { data: exames, isLoading, refetch } = useExames();
  const uploadMutation = useUploadExame();
  const deleteMutation = useDeleteExame();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [nomeExame, setNomeExame] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar imagens.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `foto_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      setSelectedFile({ uri: asset.uri, name: fileName, type: mimeType });
      setNomeExame(fileName.replace(/\.[^.]+$/, ''));
      setModalVisible(true);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/pdf',
      });
      setNomeExame(asset.name.replace(/\.[^.]+$/, ''));
      setModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar exames.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `exame_${Date.now()}.jpg`;

      setSelectedFile({ uri: asset.uri, name: fileName, type: 'image/jpeg' });
      setNomeExame('');
      setModalVisible(true);
    }
  };

  const showUploadOptions = () => {
    Alert.alert('Anexar exame', 'Como deseja anexar o exame?', [
      { text: 'Tirar foto', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Documento (PDF)', onPress: pickDocument },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        nome: nomeExame || selectedFile.name,
        observacoes: observacoes || undefined,
      });
      setModalVisible(false);
      setSelectedFile(null);
      setNomeExame('');
      setObservacoes('');
      Alert.alert('Sucesso', 'Exame enviado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.error || 'Erro ao enviar exame. Tente novamente.');
    }
  };

  const handleDelete = (exame: ExamePaciente) => {
    Alert.alert('Remover exame', `Deseja remover "${exame.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(exame.id);
          } catch {
            Alert.alert('Erro', 'Erro ao remover exame.');
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Exames</Text>
          <Text style={styles.subtitle}>{exames?.length ?? 0} exame{(exames?.length ?? 0) !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <FlatList
        data={exames}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <EmptyState
            icon="flask-outline"
            title="Nenhum exame"
            description="Seus exames aparecerão aqui. Toque no botão + para anexar."
          />
        }
        renderItem={({ item }) => (
          <ExameCard
            exame={item}
            onPress={() => router.push(`/(app)/exames/${item.id}`)}
            onDelete={item.origem !== 'secretaria' ? () => handleDelete(item) : undefined}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={showUploadOptions}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Anexar exame</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedFile(null);
                  setNomeExame('');
                  setObservacoes('');
                }}
              >
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View style={styles.filePreview}>
                <Ionicons
                  name={selectedFile.type.startsWith('image/') ? 'image' : 'document'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Nome do exame</Text>
            <TextInput
              style={styles.input}
              value={nomeExame}
              onChangeText={setNomeExame}
              placeholder="Ex: Hemograma, Raio-X Torax"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Ex: Solicitado pelo Dr. Silva"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Button
              title={uploadMutation.isPending ? 'Enviando...' : 'Enviar exame'}
              onPress={handleUpload}
              loading={uploadMutation.isPending}
              disabled={!selectedFile}
              icon="cloud-upload-outline"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ExameCard({
  exame,
  onPress,
  onDelete,
}: {
  exame: ExamePaciente;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const icon = getIconForType(exame.tipoArquivo);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardBody}>
        <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.exameName} numberOfLines={1}>{exame.nome}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.exameMeta}>
              {format(new Date(exame.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              {exame.tamanho > 0 ? ` · ${formatFileSize(exame.tamanho)}` : ''}
            </Text>
            {exame.origem === 'secretaria' && (
              <View style={styles.origemBadge}>
                <Text style={styles.origemText}>Clinica</Text>
              </View>
            )}
          </View>
          {exame.observacoes ? (
            <Text style={styles.exameObs} numberOfLines={1}>{exame.observacoes}</Text>
          ) : null}
        </View>

        {onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.arrowWrap}>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  list: { padding: 20, paddingTop: 8, gap: 10, paddingBottom: 100 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  exameName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exameMeta: { fontSize: 12, color: Colors.textSecondary },
  origemBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  origemText: { fontSize: 10, fontWeight: '600', color: Colors.success },
  exameObs: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  fileName: { fontSize: 13, color: Colors.primary, fontWeight: '600', flex: 1 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
