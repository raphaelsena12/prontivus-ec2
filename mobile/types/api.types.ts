export type TipoUsuario = 'PACIENTE' | 'MEDICO' | 'SECRETARIA' | 'ADMIN_CLINICA' | 'SUPER_ADMIN';

export type StatusConsulta =
  | 'AGENDADA'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'REALIZADA'
  | 'NAO_COMPARECEU';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  clinicaId?: string;
}

export interface Medico {
  id: string;
  nome: string;
  crm: string;
  especialidade?: string;
  foto?: string;
}

export interface Clinica {
  id: string;
  nome: string;
}

export interface TelemedicineSessionInfo {
  id: string;
  patientToken: string;
  status: string;
}

export interface Consulta {
  id: string;
  dataHora: string;
  status: StatusConsulta;
  medico: Medico;
  clinica?: Clinica;
  observacoes?: string;
  tipo?: string;
  modalidade?: 'PRESENCIAL' | 'TELEMEDICINA';
  telemedicineSession?: TelemedicineSessionInfo | null;
}

export interface Agendamento extends Consulta {
  sessionId?: string;
}

export interface Prescricao {
  id: string;
  dataEmissao: string;
  medico: Medico;
  medicamentos: Medicamento[];
  observacoes?: string;
}

export interface Medicamento {
  id: string;
  nome: string;
  dosagem: string;
  posologia: string;
  duracao?: string;
}

export interface HorarioDisponivel {
  dataHora: string;
  disponivel: boolean;
}

export interface SessaoTelemedicina {
  id: string;
  consulta: Consulta;
  linkAcesso?: string;
  status: string;
}

export interface MedicoOnline {
  id: string;
  medicoTelemedicinaId: string;
  nome: string;
  especialidade: string;
  crm: string;
  status: 'ONLINE' | 'EM_ATENDIMENTO';
  valorConsulta: number;
  tempoConsultaMin: number;
  bio: string | null;
  tags: string[];
  fotoUrl: string | null;
}

export interface ExamePaciente {
  id: string;
  nome: string;
  tipoArquivo: string; // "imagem", "pdf", "documento"
  nomeArquivo: string;
  mimeType: string;
  tamanho: number;
  s3Key: string;
  observacoes?: string;
  dataExame?: string;
  url?: string;
  createdAt: string;
  origem?: 'paciente' | 'secretaria';
}

export interface DocumentoConsulta {
  id: string;
  tipoDocumento: string;
  nomeDocumento: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
