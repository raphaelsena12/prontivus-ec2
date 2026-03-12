import api from './api';
import { Agendamento } from '../types/api.types';

async function getAgendamentos(): Promise<Agendamento[]> {
  const response = await api.get('/api/paciente/agendamentos');
  const data = response.data;
  const result = data?.consultas ?? data?.agendamentos ?? data;
  return Array.isArray(result) ? result : [];
}

async function createAgendamento(payload: {
  medicoId: string;
  dataHora: string;
  sessionId?: string;
}): Promise<{ consulta: Agendamento }> {
  const response = await api.post('/api/paciente/agendamentos', payload);
  return response.data;
}

async function cancelarAgendamento(id: string): Promise<void> {
  await api.patch(`/api/paciente/agendamentos/${id}`, { status: 'CANCELADA' });
}

export const agendamentosService = {
  getAgendamentos,
  createAgendamento,
  cancelarAgendamento,
};
