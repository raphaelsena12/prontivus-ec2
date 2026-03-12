import api from './api';
import { SessaoTelemedicina, MedicoOnline } from '../types/api.types';

async function getSessoes(): Promise<SessaoTelemedicina[]> {
  const response = await api.get('/api/paciente/telemedicina');
  return response.data.sessoes ?? response.data ?? [];
}

async function getMedicosOnline(): Promise<MedicoOnline[]> {
  const response = await api.get('/api/paciente/medicos-online');
  return response.data.medicos ?? [];
}

async function criarPaymentIntent(data: {
  medicoTelemedicinaId: string;
  medicoId: string;
  valor: number;
  medicoNome: string;
  especialidade: string;
}): Promise<{ clientSecret: string; paymentIntentId: string; pagamentoId: string }> {
  const response = await api.post('/api/paciente/telemedicina/payment-intent', data);
  return response.data;
}

async function iniciarImediato(data: {
  paymentIntentId: string;
  pagamentoId: string;
  medicoId: string;
  medicoTelemedicinaId: string;
}): Promise<{ patientLink: string; sessionId: string }> {
  const response = await api.post('/api/paciente/telemedicina/iniciar-imediato', data);
  return response.data;
}

async function getCheckoutUrl(medicoId: string, dataHora: string): Promise<string> {
  const response = await api.post('/api/paciente/telemedicina/checkout', {
    medicoId,
    dataHora,
  });
  return response.data.url;
}

export const telemeditcinaService = {
  getSessoes,
  getMedicosOnline,
  criarPaymentIntent,
  iniciarImediato,
  getCheckoutUrl,
};
