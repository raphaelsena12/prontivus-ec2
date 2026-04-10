// ── Reducer para dados clínicos do atendimento ─────────────────────────────
// Consolida ~25 useState que participam do auto-save e da finalização,
// eliminando riscos de race conditions entre estados interdependentes.

export type AnalysisResults = {
  anamnese: string;
  raciocinioClinico?: string;
  cidCodes: Array<{ code: string; description: string; score: number }>;
  protocolos: Array<{ nome: string; descricao: string; justificativa?: string }>;
  exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string; justificativa?: string }>;
};

export type DocumentoGeradoLocal = {
  id: string;
  tipoDocumento: string;
  nomeDocumento: string;
  createdAt: string;
  pdfBlob?: Blob;
  assinado: boolean;
  assinando?: boolean;
  erroAssinatura?: string;
};

export type Prescricao = {
  medicamento: string;
  dosagem: string;
  posologia: string;
  duracao: string;
};

export type CidManual = { code: string; description: string };
export type ProtocoloManual = { nome: string; descricao: string };
export type ExameManual = {
  nome: string;
  tipo: string;
  codigoTussId?: string | null;
  codigoTuss?: string | null;
  exameId?: string | null;
  grupoId?: string | null;
};

export interface ClinicalState {
  // Anamnese
  editedAnamnese: string;
  isAnamneseEdited: boolean;
  anamneseConfirmed: boolean;

  // AI results
  analysisResults: AnalysisResults | null;

  // AI selections
  selectedCids: Set<number>;
  selectedExamesAI: Set<number>;
  selectedPrescricoesAI: Set<number>;
  selectedProtocolosAI: Set<number>;

  // Manual entries
  cidsManuais: CidManual[];
  protocolosManuais: ProtocoloManual[];
  examesManuais: ExameManual[];
  prescricoes: Prescricao[];
  orientacoes: string;

  // Documents
  documentosGerados: DocumentoGeradoLocal[];

  // Step tracking
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: Set<number>;

  // Auto-save indicator
  autoSaveStatus: "idle" | "saving" | "saved" | "error";
  lastAutoSaveTime: Date | null;
}

export const initialClinicalState: ClinicalState = {
  editedAnamnese: "",
  isAnamneseEdited: false,
  anamneseConfirmed: false,
  analysisResults: null,
  selectedCids: new Set(),
  selectedExamesAI: new Set(),
  selectedPrescricoesAI: new Set(),
  selectedProtocolosAI: new Set(),
  cidsManuais: [],
  protocolosManuais: [],
  examesManuais: [],
  prescricoes: [],
  orientacoes: "",
  documentosGerados: [],
  currentStep: 1,
  completedSteps: new Set(),
  autoSaveStatus: "idle",
  lastAutoSaveTime: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// ── Actions ──────────────────────────────────────────────────────────────────
export type ClinicalAction =
  // Anamnese
  | { type: "SET_EDITED_ANAMNESE"; payload: string }
  | { type: "SET_ANAMNESE_EDITED"; payload: boolean }
  | { type: "CONFIRM_ANAMNESE" }
  // AI
  | { type: "SET_ANALYSIS_RESULTS"; payload: AnalysisResults | null }
  | { type: "TOGGLE_CID"; payload: number }
  | { type: "SET_SELECTED_CIDS"; payload: Set<number> }
  | { type: "TOGGLE_EXAME_AI"; payload: number }
  | { type: "SET_SELECTED_EXAMES_AI"; payload: Set<number> }
  | { type: "TOGGLE_PRESCRICAO_AI"; payload: number }
  | { type: "SET_SELECTED_PRESCRICOES_AI"; payload: Set<number> }
  | { type: "TOGGLE_PROTOCOLO_AI"; payload: number }
  | { type: "SET_SELECTED_PROTOCOLOS_AI"; payload: Set<number> }
  // Manual CIDs
  | { type: "SET_CIDS_MANUAIS"; payload: CidManual[] }
  | { type: "ADD_CID_MANUAL"; payload: CidManual }
  | { type: "REMOVE_CID_MANUAL"; payload: string }
  // Manual protocols
  | { type: "SET_PROTOCOLOS_MANUAIS"; payload: ProtocoloManual[] }
  | { type: "ADD_PROTOCOLO_MANUAL"; payload: ProtocoloManual }
  | { type: "REMOVE_PROTOCOLO_MANUAL"; payload: number }
  // Manual exams
  | { type: "SET_EXAMES_MANUAIS"; payload: ExameManual[] }
  | { type: "ADD_EXAME_MANUAL"; payload: ExameManual }
  | { type: "REMOVE_EXAME_MANUAL"; payload: number }
  // Prescriptions
  | { type: "SET_PRESCRICOES"; payload: Prescricao[] }
  | { type: "ADD_PRESCRICAO"; payload: Prescricao }
  | { type: "UPDATE_PRESCRICAO"; payload: { index: number; data: Prescricao } }
  | { type: "REMOVE_PRESCRICAO"; payload: number }
  // Orientações
  | { type: "SET_ORIENTACOES"; payload: string }
  // Documents
  | { type: "ADD_DOCUMENTO"; payload: DocumentoGeradoLocal }
  | { type: "REMOVE_DOCUMENTO"; payload: string }
  | { type: "UPDATE_DOCUMENTO"; payload: { id: string; updates: Partial<DocumentoGeradoLocal> } }
  | { type: "SET_DOCUMENTOS"; payload: DocumentoGeradoLocal[] }
  // Steps
  | { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 | 5 }
  | { type: "COMPLETE_STEP"; payload: number }
  // Auto-save
  | { type: "AUTO_SAVE_START" }
  | { type: "AUTO_SAVE_SUCCESS"; payload: Date }
  | { type: "AUTO_SAVE_ERROR" }
  | { type: "AUTO_SAVE_RESET" }
  // Bulk restore
  | { type: "RESTORE_DRAFT"; payload: Partial<ClinicalState> };

export function clinicalReducer(state: ClinicalState, action: ClinicalAction): ClinicalState {
  switch (action.type) {
    // ── Anamnese ──
    case "SET_EDITED_ANAMNESE":
      return { ...state, editedAnamnese: action.payload };
    case "SET_ANAMNESE_EDITED":
      return { ...state, isAnamneseEdited: action.payload };
    case "CONFIRM_ANAMNESE":
      return { ...state, anamneseConfirmed: true };

    // ── AI Results ──
    case "SET_ANALYSIS_RESULTS":
      return { ...state, analysisResults: action.payload };

    // ── AI Selections ──
    case "TOGGLE_CID":
      return { ...state, selectedCids: toggleInSet(state.selectedCids, action.payload) };
    case "SET_SELECTED_CIDS":
      return { ...state, selectedCids: action.payload };
    case "TOGGLE_EXAME_AI":
      return { ...state, selectedExamesAI: toggleInSet(state.selectedExamesAI, action.payload) };
    case "SET_SELECTED_EXAMES_AI":
      return { ...state, selectedExamesAI: action.payload };
    case "TOGGLE_PRESCRICAO_AI":
      return { ...state, selectedPrescricoesAI: toggleInSet(state.selectedPrescricoesAI, action.payload) };
    case "SET_SELECTED_PRESCRICOES_AI":
      return { ...state, selectedPrescricoesAI: action.payload };
    case "TOGGLE_PROTOCOLO_AI":
      return { ...state, selectedProtocolosAI: toggleInSet(state.selectedProtocolosAI, action.payload) };
    case "SET_SELECTED_PROTOCOLOS_AI":
      return { ...state, selectedProtocolosAI: action.payload };

    // ── Manual CIDs ──
    case "SET_CIDS_MANUAIS":
      return { ...state, cidsManuais: action.payload };
    case "ADD_CID_MANUAL":
      return { ...state, cidsManuais: [...state.cidsManuais, action.payload] };
    case "REMOVE_CID_MANUAL":
      return { ...state, cidsManuais: state.cidsManuais.filter(c => c.code !== action.payload) };

    // ── Manual Protocols ──
    case "SET_PROTOCOLOS_MANUAIS":
      return { ...state, protocolosManuais: action.payload };
    case "ADD_PROTOCOLO_MANUAL":
      return { ...state, protocolosManuais: [...state.protocolosManuais, action.payload] };
    case "REMOVE_PROTOCOLO_MANUAL":
      return { ...state, protocolosManuais: state.protocolosManuais.filter((_, i) => i !== action.payload) };

    // ── Manual Exams ──
    case "SET_EXAMES_MANUAIS":
      return { ...state, examesManuais: action.payload };
    case "ADD_EXAME_MANUAL":
      return { ...state, examesManuais: [...state.examesManuais, action.payload] };
    case "REMOVE_EXAME_MANUAL":
      return { ...state, examesManuais: state.examesManuais.filter((_, i) => i !== action.payload) };

    // ── Prescriptions ──
    case "SET_PRESCRICOES":
      return { ...state, prescricoes: action.payload };
    case "ADD_PRESCRICAO":
      return { ...state, prescricoes: [...state.prescricoes, action.payload] };
    case "UPDATE_PRESCRICAO": {
      const next = [...state.prescricoes];
      next[action.payload.index] = action.payload.data;
      return { ...state, prescricoes: next };
    }
    case "REMOVE_PRESCRICAO":
      return { ...state, prescricoes: state.prescricoes.filter((_, i) => i !== action.payload) };

    // ── Orientações ──
    case "SET_ORIENTACOES":
      return { ...state, orientacoes: action.payload };

    // ── Documents ──
    case "ADD_DOCUMENTO":
      return { ...state, documentosGerados: [...state.documentosGerados, action.payload] };
    case "REMOVE_DOCUMENTO":
      return { ...state, documentosGerados: state.documentosGerados.filter(d => d.id !== action.payload) };
    case "UPDATE_DOCUMENTO":
      return {
        ...state,
        documentosGerados: state.documentosGerados.map(d =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        ),
      };
    case "SET_DOCUMENTOS":
      return { ...state, documentosGerados: action.payload };

    // ── Steps ──
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "COMPLETE_STEP": {
      const next = new Set(state.completedSteps);
      next.add(action.payload);
      return { ...state, completedSteps: next };
    }

    // ── Auto-save ──
    case "AUTO_SAVE_START":
      return { ...state, autoSaveStatus: "saving" };
    case "AUTO_SAVE_SUCCESS":
      return { ...state, autoSaveStatus: "saved", lastAutoSaveTime: action.payload };
    case "AUTO_SAVE_ERROR":
      return { ...state, autoSaveStatus: "error" };
    case "AUTO_SAVE_RESET":
      return { ...state, autoSaveStatus: "idle" };

    // ── Draft restore ──
    case "RESTORE_DRAFT":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}
