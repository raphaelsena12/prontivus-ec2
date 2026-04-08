import api from './api';
import { ExamePaciente } from '../types/api.types';

async function getExames(): Promise<ExamePaciente[]> {
  const response = await api.get('/api/paciente/exames');
  const data = response.data;
  return data?.exames ?? [];
}

async function uploadExame(
  file: { uri: string; name: string; type: string },
  nome: string,
  observacoes?: string,
  dataExame?: string
): Promise<ExamePaciente> {
  const formData = new FormData();

  formData.append('arquivo', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  formData.append('nome', nome);
  if (observacoes) formData.append('observacoes', observacoes);
  if (dataExame) formData.append('dataExame', dataExame);

  const response = await api.post('/api/paciente/exames', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return response.data.exame;
}

async function deleteExame(id: string): Promise<void> {
  await api.delete(`/api/paciente/exames?id=${id}`);
}

export const examesService = { getExames, uploadExame, deleteExame };
