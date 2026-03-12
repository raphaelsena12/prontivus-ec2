import api from './api';
import { Medico, HorarioDisponivel } from '../types/api.types';

async function getMedicos(): Promise<Medico[]> {
  const response = await api.get('/api/paciente/medicos');
  return response.data.medicos ?? response.data ?? [];
}

async function getHorariosDisponiveis(
  medicoId: string,
  data: string
): Promise<HorarioDisponivel[]> {
  const response = await api.get('/api/paciente/horarios-disponiveis', {
    params: { medicoId, data },
  });
  return response.data.horarios ?? response.data ?? [];
}

export const medicosService = { getMedicos, getHorariosDisponiveis };
