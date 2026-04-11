import api from './api';
import { Consulta, DocumentoConsulta } from '../types/api.types';

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

async function getDocumentosConsulta(consultaId: string): Promise<DocumentoConsulta[]> {
  const response = await api.get(`/api/paciente/consultas/${consultaId}/documentos`);
  return response.data.documentos ?? [];
}

async function getDocumentoUrl(consultaId: string, documentoId: string): Promise<string> {
  const response = await api.get(`/api/paciente/consultas/${consultaId}/documentos/${documentoId}/url`);
  return response.data.url;
}

export const consultasService = { getConsultas, getConsultaById, getDocumentosConsulta, getDocumentoUrl };
