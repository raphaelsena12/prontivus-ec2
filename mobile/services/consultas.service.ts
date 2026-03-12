import api from './api';
import { Consulta } from '../types/api.types';

async function getConsultas(): Promise<Consulta[]> {
  const response = await api.get('/api/paciente/consultas');
  const data = response.data;
  const result = data?.consultas ?? data?.agendamentos ?? data;
  return Array.isArray(result) ? result : [];
}

async function getConsultaById(id: string): Promise<Consulta> {
  const response = await api.get(`/api/paciente/consultas/${id}`);
  return response.data.consulta ?? response.data;
}

export const consultasService = { getConsultas, getConsultaById };
