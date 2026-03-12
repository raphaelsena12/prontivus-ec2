import api from './api';
import { Prescricao } from '../types/api.types';

async function getPrescricoes(): Promise<Prescricao[]> {
  const response = await api.get('/api/paciente/prescricoes');
  const data = response.data;
  const result = data?.prescricoes ?? data;
  return Array.isArray(result) ? result : [];
}

async function getPrescricaoById(id: string): Promise<Prescricao> {
  const response = await api.get(`/api/paciente/prescricoes/${id}`);
  return response.data.prescricao ?? response.data;
}

export const prescricoesService = { getPrescricoes, getPrescricaoById };
