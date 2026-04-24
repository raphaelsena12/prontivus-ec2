"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Calendar,
  Phone,
  Mail,
  Clock,
  FileText,
  Download,
  Mic,
  Activity,
  Heart,
  Droplet,
  Weight,
  AlertCircle,
  FileImage,
  FilePlus,
  Video,
  VideoOff,
  MicOff,
  Monitor,
  MessageSquare,
  Send,
  Maximize2,
  Minimize2,
  Settings,
  Camera,
  Share2,
  Loader2,
  Save,
  ArrowLeft,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Upload,
  List,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  Pill,
  ClipboardList,
  FileCheck,
  Stethoscope,
  Plus,
  Trash2,
  Printer,
  Ruler,
  TrendingUp,
  FileText as FileTextIcon,
  X,
  Wifi,
  Phone as PhoneIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebar } from '@/components/ui/sidebar';
import { formatDate, formatTime, maskCPF, calcularIdade } from '@/lib/utils';
import { useTranscription } from '@/hooks/use-transcription';
import { ProcessingModal } from '@/components/processing-modal';
import { MedicalAnalysisResults } from '@/components/medical-analysis-results';
import { MicrophoneSelectorModal } from '@/components/microphone-selector-modal';
import { DocumentosConsultaDialog } from '@/components/documentos-consulta-dialog';
import { DadosSaudeDialog } from '@/components/atendimento/patient/DadosSaudeDialog';
import { GuiaTissExamesModal, type ExameSolicitado, type PrioridadeTISS, type GuiaSADTDadosAdicionais } from '@/components/guia-tiss-exames-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, CalendarDays } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// ─── Novos componentes do redesign ───────────────────────────────────────────
import { PatientHistory } from '@/components/atendimento/patient/PatientHistory';
import { TranscriptionBar } from '@/components/atendimento/consultation/TranscriptionBar';
import { TranscriptionChatPanel } from '@/components/atendimento/consultation/TranscriptionChatPanel';
import { Step2Anamnesis } from '@/components/atendimento/consultation/steps/Step2Anamnesis';
import { AISidebar, type AIContext } from '@/components/atendimento/consultation/AISidebar';
import { AvatarWithS3 } from '@/components/avatar-with-s3';
import { AutoSaveIndicator } from './components/auto-save-indicator';
import {
  clinicalReducer,
  initialClinicalState,
  type ClinicalState,
  type ClinicalAction,
  type AnalysisResults,
  type DocumentoGeradoLocal,
  type Prescricao,
  type CidManual,
  type ExameManual,
  type ProtocoloManual,
} from './atendimento-reducer';

interface Consulta {
  id: string;
  dataHora: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
    email: string | null;
    dataNascimento: string;
    observacoes?: string | null;
    alergias?: string | null;
    medicamentosEmUso?: string | null;
    numeroProntuario: number | null;
    usuarioId: string | null;
    usuario: {
      avatar: string | null;
    } | null;
  };
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  procedimento: {
    id: string;
    nome: string;
  } | null;
  pressaoSistolica?: number | null;
  pressaoDiastolica?: number | null;
  frequenciaCardiaca?: number | null;
  saturacaoO2?: number | string | null;
  temperatura?: number | string | null;
  peso?: number | string | null;
  altura?: number | string | null;
}

interface Prontuario {
  id: string;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  orientacoesConduta: string | null;
  orientacoes: string | null;
  evolucao: string | null;
}

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  time: string;
}

interface AtendimentoContentProps {
  consultaId: string;
  // Props de telemedicina (opcionais — injetadas pela page de sessão)
  telemedicinaProps?: {
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    isMicOn: boolean;
    onToggleMic: (v: boolean) => void;
    isCameraOn: boolean;
    onToggleCamera: (v: boolean) => void;
    isScreenSharing: boolean;
    onToggleScreenSharing: (v: boolean) => void;
    connectionQuality: "excellent" | "good" | "unstable";
    patientPresent: boolean;
    patientLink?: string;
    chatMessages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onEncerrar: () => void;
    remoteAudioRef?: React.RefObject<HTMLAudioElement | null>;
  };
}

export function AtendimentoContent({ consultaId, telemedicinaProps }: AtendimentoContentProps) {
  const router = useRouter();
  const { open: sidebarOpen, setOpen: setSidebarOpen, isMobile } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [activeTab, setActiveTab] = useState<string>('informacoes');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [historicoConsultas, setHistoricoConsultas] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  type HistoricoConsultaClinica = {
    consultaId: string;
    dataHora: string;
    cids: Array<{ code: string; description: string }>;
    exames: Array<{ nome: string; tipo: string | null }>;
    prescricoes: Array<{ medicamento: string; dosagem: string | null; posologia: string; duracao: string | null }>;
  };
  const [historicoClinico, setHistoricoClinico] = useState<HistoricoConsultaClinica[]>([]);
  const [expandedConsultas, setExpandedConsultas] = useState<Set<string>>(new Set());
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'processing' | 'analyzing' | 'generating'>('processing');
  const [processingContext, setProcessingContext] = useState<'anamnese' | 'suggestions'>('anamnese');
  // ── Reducer para dados clínicos (anamnese, CIDs, exames, prescrições, documentos, steps) ──
  const [clinical, dispatch] = useReducer(clinicalReducer, initialClinicalState);
  const {
    editedAnamnese,
    isAnamneseEdited,
    anamneseConfirmed,
    analysisResults,
    selectedCids,
    selectedExamesAI,
    selectedPrescricoesAI,
    selectedProtocolosAI,
    cidsManuais,
    protocolosManuais,
    examesManuais,
    prescricoes,
    orientacoes,
    documentosGerados,
    currentStep,
    completedSteps,
    autoSaveStatus,
    lastAutoSaveTime,
  } = clinical;

  // ── Dispatchers de conveniência (compatibilidade com código existente) ──
  const setEditedAnamnese = (v: string) => dispatch({ type: "SET_EDITED_ANAMNESE", payload: v });
  const setIsAnamneseEdited = (v: boolean) => dispatch({ type: "SET_ANAMNESE_EDITED", payload: v });
  const setAnalysisResults = (v: AnalysisResults | null | ((prev: AnalysisResults | null) => AnalysisResults | null)) => {
    if (typeof v === "function") dispatch({ type: "SET_ANALYSIS_RESULTS", payload: v(analysisResults) });
    else dispatch({ type: "SET_ANALYSIS_RESULTS", payload: v });
  };
  const setSelectedCids = (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof v === "function") dispatch({ type: "SET_SELECTED_CIDS", payload: v(selectedCids) });
    else dispatch({ type: "SET_SELECTED_CIDS", payload: v });
  };
  const setSelectedExamesAI = (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof v === "function") dispatch({ type: "SET_SELECTED_EXAMES_AI", payload: v(selectedExamesAI) });
    else dispatch({ type: "SET_SELECTED_EXAMES_AI", payload: v });
  };
  const setSelectedPrescricoesAI = (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof v === "function") dispatch({ type: "SET_SELECTED_PRESCRICOES_AI", payload: v(selectedPrescricoesAI) });
    else dispatch({ type: "SET_SELECTED_PRESCRICOES_AI", payload: v });
  };
  const setSelectedProtocolosAI = (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof v === "function") dispatch({ type: "SET_SELECTED_PROTOCOLOS_AI", payload: v(selectedProtocolosAI) });
    else dispatch({ type: "SET_SELECTED_PROTOCOLOS_AI", payload: v });
  };
  const setCidsManuais = (v: CidManual[] | ((prev: CidManual[]) => CidManual[])) => {
    if (typeof v === "function") dispatch({ type: "SET_CIDS_MANUAIS", payload: v(cidsManuais) });
    else dispatch({ type: "SET_CIDS_MANUAIS", payload: v });
  };
  const setProtocolosManuais = (v: ProtocoloManual[] | ((prev: ProtocoloManual[]) => ProtocoloManual[])) => {
    if (typeof v === "function") dispatch({ type: "SET_PROTOCOLOS_MANUAIS", payload: v(protocolosManuais) });
    else dispatch({ type: "SET_PROTOCOLOS_MANUAIS", payload: v });
  };
  const setExamesManuais = (v: ExameManual[] | ((prev: ExameManual[]) => ExameManual[])) => {
    if (typeof v === "function") dispatch({ type: "SET_EXAMES_MANUAIS", payload: v(examesManuais) });
    else dispatch({ type: "SET_EXAMES_MANUAIS", payload: v });
  };
  const setPrescricoes = (v: Prescricao[] | ((prev: Prescricao[]) => Prescricao[])) => {
    if (typeof v === "function") dispatch({ type: "SET_PRESCRICOES", payload: v(prescricoes) });
    else dispatch({ type: "SET_PRESCRICOES", payload: v });
  };
  const setOrientacoes = (v: string) => dispatch({ type: "SET_ORIENTACOES", payload: v });
  const setDocumentosGerados = (v: DocumentoGeradoLocal[] | ((prev: DocumentoGeradoLocal[]) => DocumentoGeradoLocal[])) => {
    if (typeof v === "function") dispatch({ type: "SET_DOCUMENTOS", payload: v(documentosGerados) });
    else dispatch({ type: "SET_DOCUMENTOS", payload: v });
  };
  const setCurrentStep = (v: 1 | 2 | 3 | 4 | 5) => dispatch({ type: "SET_STEP", payload: v });
  const setCompletedSteps = (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof v === "function") {
      const next = v(completedSteps);
      next.forEach(s => dispatch({ type: "COMPLETE_STEP", payload: s }));
    } else {
      v.forEach(s => dispatch({ type: "COMPLETE_STEP", payload: s }));
    }
  };
  const setAnamneseConfirmed = (v: boolean) => { if (v) dispatch({ type: "CONFIRM_ANAMNESE" }); };
  const setAutoSaveStatus = (v: 'idle' | 'saving' | 'saved' | 'error') => {
    switch (v) {
      case 'saving': dispatch({ type: "AUTO_SAVE_START" }); break;
      case 'saved': dispatch({ type: "AUTO_SAVE_SUCCESS", payload: new Date() }); break;
      case 'error': dispatch({ type: "AUTO_SAVE_ERROR" }); break;
      case 'idle': dispatch({ type: "AUTO_SAVE_RESET" }); break;
    }
  };
  const [isEditingAnamnese, setIsEditingAnamnese] = useState(false);
  const [documentoSearch, setDocumentoSearch] = useState("");
  const [documentoSuggestions, setDocumentoSuggestions] = useState<Array<{ id: string; nome: string }>>([]);
  const [isMicrophoneSelectorOpen, setIsMicrophoneSelectorOpen] = useState(false);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | undefined>();
  // prescricoes, orientacoes, selectedCids, selectedExamesAI, selectedPrescricoesAI, selectedProtocolosAI → clinical reducer
  const [medicamentoDialogOpen, setMedicamentoDialogOpen] = useState(false);
  const [medicamentoSearch, setMedicamentoSearch] = useState("");
  const [medicamentos, setMedicamentos] = useState<Array<{ id: string; nome: string; principioAtivo: string | null; laboratorio: string | null; apresentacao: string | null; concentracao: string | null; unidade: string | null; controle: string | null }>>([]);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [manipulados, setManipulados] = useState<Array<{ id: string; descricao: string; informacoes: string | null }>>([]);
  const [loadingManipulados, setLoadingManipulados] = useState(false);
  const [activeMedicamentoTab, setActiveMedicamentoTab] = useState<"medicamentos" | "manipulados">("medicamentos");
  const [selectedPrescricaoIndex, setSelectedPrescricaoIndex] = useState<number | null>(null);
  const [pendingMedicamento, setPendingMedicamento] = useState<{
    nome: string;
    dosagem: string;
    posologia: string;
    duracao: string;
    manual?: boolean;
  } | null>(null);
  // DocumentoGeradoLocal type and documentosGerados → clinical reducer
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [dadosSaudeDialogOpen, setDadosSaudeDialogOpen] = useState(false);
  const [tissModalOpen, setTissModalOpen] = useState(false);
  const [tissGerandoGuia, setTissGerandoGuia] = useState(false);
  const [examesPrioridade, setExamesPrioridade] = useState<PrioridadeTISS>("eletiva");
  const [selectedConsultaForDocumentos, setSelectedConsultaForDocumentos] = useState<string | null>(null);
  const [selectedConsultaDataForDocumentos, setSelectedConsultaDataForDocumentos] = useState<string | null>(null);
  const [selectedAIModel] = useState<'openai'>('openai');
  const [examesAnexados, setExamesAnexados] = useState<Array<{
    id: string;
    nome: string;
    tipo: string;
    s3Key: string;
    data: Date;
    isImage: boolean;
    isPdf: boolean;
    originalFileName?: string;
    consultaId?: string;
    consultaData?: Date | string | null;
    isFromCurrentConsulta?: boolean;
  }>>([]);
  const [loadingExames, setLoadingExames] = useState(false);
  const [uploadingExame, setUploadingExame] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [categoriaExame, setCategoriaExame] = useState<"Laboratorial" | "Imagem" | "Outros" | "">("");
  const [arquivosExame, setArquivosExame] = useState<File[]>([]);
  // cidsManuais, protocolosManuais, examesManuais → clinical reducer
  const [cidDialogOpen, setCidDialogOpen] = useState(false);
  const [cidSearchDialogOpen, setCidSearchDialogOpen] = useState(false);
  const [protocoloDialogOpen, setProtocoloDialogOpen] = useState(false);
  const [exameDialogOpen, setExameDialogOpen] = useState(false);
  const [novoCidCode, setNovoCidCode] = useState("");
  const [novoCidDescription, setNovoCidDescription] = useState("");
  const [cidSearch, setCidSearch] = useState("");
  const [cidsCadastrados, setCidsCadastrados] = useState<Array<{ id: string; codigo: string; descricao: string; categoria: string | null }>>([]);
  const [loadingCidsCadastrados, setLoadingCidsCadastrados] = useState(false);
  const [selectedCidsCatalogoIds, setSelectedCidsCatalogoIds] = useState<Set<string>>(new Set());
  const [novoExameNome, setNovoExameNome] = useState("");
  const [novoExameTipo, setNovoExameTipo] = useState("");
  const [exameSearchDialogOpen, setExameSearchDialogOpen] = useState(false);
  const [exameSearch, setExameSearch] = useState("");
  const [examesParaIA, setExamesParaIA] = useState<Set<string>>(new Set());
  const [transcricaoFinalizada, setTranscricaoFinalizada] = useState(false);
  const [anamneseModoManual, setAnamneseModoManual] = useState(false);
  const [resumoClinicoDialogOpen, setResumoClinicoDialogOpen] = useState(false);
  const [gerandoResumoClinico, setGerandoResumoClinico] = useState(false);
  const [resumoClinico, setResumoClinico] = useState<string | null>(null);
  const [medicamentosEmUso, setMedicamentosEmUso] = useState<Array<{ nome: string; posologia: string; dataPrescricao: string }>>([]);
  const [loadingMedicamentosEmUso, setLoadingMedicamentosEmUso] = useState(false);
  const [examesCadastrados, setExamesCadastrados] = useState<Array<{ id: string; nome: string; descricao: string; tipo: string; codigoTuss: { id: string; codigoTuss: string; descricao: string; categoriaExame: string | null } | null }>>([]);
  const [loadingExamesCadastrados, setLoadingExamesCadastrados] = useState(false);
  const [gruposExames, setGruposExames] = useState<Array<{ id: string; nome: string; descricao: string | null; exames: Array<{ exame: { id: string; nome: string; tipo: string | null; descricao: string | null; codigoTuss: { id: string; codigoTuss: string; descricao: string; categoriaExame: string | null } | null } }> }>>([]);
  const [loadingGruposExames, setLoadingGruposExames] = useState(false);
  const [activeExameTab, setActiveExameTab] = useState<"exames" | "grupos">("exames");
  const [selectedExamesIds, setSelectedExamesIds] = useState<Set<string>>(new Set());
  const [selectedGruposIds, setSelectedGruposIds] = useState<Set<string>>(new Set());

  // ─── UI states do redesign (não afetam lógica de negócio) ─────────────────
  // currentStep, completedSteps, anamneseConfirmed → clinical reducer
  const [consultationMode, setConsultationMode] = useState<'manual'|'ai'>('ai');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [loadingFichaPreview, setLoadingFichaPreview] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [cidAlertVisible, setCidAlertVisible] = useState(false);
  const [retornoModalOpen, setRetornoModalOpen] = useState(false);
  const [retornoAgendado, setRetornoAgendado] = useState(false);
  const [retornoDias, setRetornoDias] = useState<number>(30);
  const [docConfigModalOpen, setDocConfigModalOpen] = useState(false);
  const [docConfigModelId, setDocConfigModelId] = useState<string>("");
  const [docMedicamentosSelecionados, setDocMedicamentosSelecionados] = useState<Set<number>>(new Set());
  const [docExamesSelecionados, setDocExamesSelecionados] = useState<Set<number>>(new Set());
  const [sinaisVitaisFocusField, setSinaisVitaisFocusField] = useState<string | null>(null);
  const [sinaisVitaisForm, setSinaisVitaisForm] = useState({
    pressaoSistolica: "", pressaoDiastolica: "", frequenciaCardiaca: "",
    saturacaoO2: "", temperatura: "", peso: "", altura: "",
  });
  const sinaisVitaisFormRef = React.useRef({
    pressaoSistolica: "", pressaoDiastolica: "", frequenciaCardiaca: "",
    saturacaoO2: "", temperatura: "", peso: "", altura: "",
  });
  const setVitaisForm = (v: typeof sinaisVitaisForm) => {
    sinaisVitaisFormRef.current = v;
    setSinaisVitaisForm(v);
  };
  const [savingSinaisVitais, setSavingSinaisVitais] = useState(false);
  const [certStatus, setCertStatus] = useState<{ configured: boolean; expired: boolean; checked: boolean }>({ configured: false, expired: false, checked: false });
  const [docConfigOpts, setDocConfigOpts] = useState({
    cpf: true, endereco: false, assinar: false,
    diasAfastamento: 1, observacoes: "",
    mesesValidade: "", horaInicio: "", horaFim: "",
    nomeAcompanhante: "", uf: "", dataValidade: "",
    convenio: "", justificativa: "", textoLivre: "",
  });

  // autoSaveStatus, lastAutoSaveTime → clinical reducer
  const autoSaveResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modo foco ──────────────────────────────────────────────────────────────
  const toggleFocusMode = useCallback(() => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    if (!isMobile) setSidebarOpen(!next);
    if (next) {
      document.body.classList.add('atendimento-focus-mode');
    } else {
      document.body.classList.remove('atendimento-focus-mode');
    }
  }, [isFullscreen, isMobile, setSidebarOpen]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('atendimento-focus-mode');
      if (!isMobile) setSidebarOpen(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook de transcrição
  const {
    isTranscribing,
    isPreparing,
    isPaused,
    transcription,
    stoppedUnexpectedly,
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
    processTranscription,
  } = useTranscription();

  // Controla se o painel de chat da transcrição está minimizado.
  // Quando minimizado, mostra apenas a pill flutuante (TranscriptionBar) no rodapé.
  const [chatMinimized, setChatMinimized] = useState(false);

  // ── Verificação de certificado digital ──────────────────────────────────────
  const checkCertificado = useCallback(async (): Promise<{ configured: boolean; expired: boolean }> => {
    try {
      const res = await fetch("/api/medico/certificado");
      if (!res.ok) return { configured: false, expired: false };
      const data = await res.json();
      const configured = !!data.configured;
      const expired = configured && data.certificado?.validTo
        ? new Date(data.certificado.validTo).getTime() < Date.now()
        : false;
      setCertStatus({ configured, expired, checked: true });
      return { configured, expired };
    } catch {
      return { configured: false, expired: false };
    }
  }, []);

  useEffect(() => { checkCertificado(); }, [checkCertificado]);

  // ── Autosave / recovery de rascunho ─────────────────────────────────────────
  const draftKey = `draft-consulta-${consultaId}`;

  // Salva rascunho no localStorage sempre que estados críticos mudarem
  useEffect(() => {
    if (!editedAnamnese && !analysisResults && transcription.length === 0) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        savedAt: new Date().toISOString(),
        transcription,
        editedAnamnese,
        analysisResults,
        currentStep,
        prescricoes,
        cidsManuais,
        examesManuais,
      }));
    } catch {
      // localStorage cheio ou indisponível — ignorar silenciosamente
    }
  }, [transcription, editedAnamnese, analysisResults, currentStep, prescricoes, cidsManuais, examesManuais]);

  // Ao montar, verifica se existe rascunho e oferece restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const minutesAgo = Math.round((Date.now() - new Date(draft.savedAt).getTime()) / 60000);
      if (minutesAgo > 480) {
        // Rascunho com mais de 8h — descarta automaticamente
        localStorage.removeItem(draftKey);
        return;
      }
      if (draft.editedAnamnese || draft.transcription?.length > 0) {
        toast.info(
          `Rascunho encontrado (${minutesAgo < 1 ? "agora mesmo" : `há ${minutesAgo} min`}). Restaurar?`,
          {
            duration: 10000,
            action: {
              label: "Restaurar",
              onClick: () => {
                if (draft.transcription?.length) {
                  // transcription é do hook, não pode ser injetada diretamente — só anamnese e resultados
                }
                if (draft.editedAnamnese) setEditedAnamnese(draft.editedAnamnese);
                if (draft.analysisResults) setAnalysisResults(draft.analysisResults);
                if (draft.currentStep) setCurrentStep(draft.currentStep);
                if (draft.prescricoes) setPrescricoes(draft.prescricoes);
                if (draft.cidsManuais) setCidsManuais(draft.cidsManuais);
                if (draft.examesManuais) setExamesManuais(draft.examesManuais);
                toast.success("Rascunho restaurado com sucesso");
              },
            },
            cancel: {
              label: "Descartar",
              onClick: () => localStorage.removeItem(draftKey),
            },
          }
        );
      }
    } catch {
      // localStorage inválido — ignorar
    }
  // Apenas no mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave periódico no backend (a cada 60s se houver dados) ──────────────
  const autoSaveRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAutoSaveRef = React.useRef<string>("");

  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      // Só salvar se existe anamnese ou dados preenchidos
      const hasData = prontuario?.anamnese || editedAnamnese || analysisResults?.anamnese ||
        cidsManuais.length > 0 || examesManuais.length > 0 || prescricoes.length > 0 ||
        (analysisResults?.cidCodes && selectedCids.size > 0) ||
        (analysisResults?.exames && selectedExamesAI.size > 0);

      if (!hasData) return;

      // Evitar saves duplicados comparando hash simples dos dados
      const dataHash = JSON.stringify({
        anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
        exameFisico: prontuario?.exameFisico || "",
        diagnostico: prontuario?.diagnostico || "",
        conduta: prontuario?.conduta || "",
        orientacoesConduta: prontuario?.orientacoesConduta || "",
        orientacoes,
        evolucao: prontuario?.evolucao || "",
        cidsManuais,
        examesManuais: examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo })),
        prescricoes,
        selectedCids: Array.from(selectedCids),
        selectedExamesAI: Array.from(selectedExamesAI),
        selectedPrescricoesAI: Array.from(selectedPrescricoesAI),
      });

      if (dataHash === lastAutoSaveRef.current) return;
      lastAutoSaveRef.current = dataHash;

      try {
        setAutoSaveStatus('saving');
        await fetch("/api/medico/atendimento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultaId,
            anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
            exameFisico: prontuario?.exameFisico || "",
            diagnostico: prontuario?.diagnostico || "",
            conduta: prontuario?.conduta || "",
            orientacoesConduta: prontuario?.orientacoesConduta || "",
            orientacoes,
            evolucao: prontuario?.evolucao || "",
            cids: [
              ...(analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || []),
              ...cidsManuais,
            ],
            exames: [
              ...(analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || []),
              ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo })),
            ],
            prescricoes: [
              ...prescricoes,
              ...(analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [])
                .filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
            ],
            finalizar: false,
          }),
        });
        setAutoSaveStatus('saved');
        if (autoSaveResetRef.current) clearTimeout(autoSaveResetRef.current);
        autoSaveResetRef.current = setTimeout(() => setAutoSaveStatus('idle'), 5000);
      } catch {
        setAutoSaveStatus('error');
        if (autoSaveResetRef.current) clearTimeout(autoSaveResetRef.current);
        autoSaveResetRef.current = setTimeout(() => setAutoSaveStatus('idle'), 8000);
      }
    }, 60000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId, prontuario, editedAnamnese, analysisResults, cidsManuais, examesManuais, prescricoes, orientacoes, selectedCids, selectedExamesAI, selectedPrescricoesAI]);

  // Exibe valores do form (fonte de verdade para edição inline)
  const _pesoNum = sinaisVitaisForm.peso ? Number(sinaisVitaisForm.peso) : null;
  const _alturaNum = sinaisVitaisForm.altura ? Number(sinaisVitaisForm.altura) : null;
  const imc = _pesoNum && _alturaNum && _alturaNum > 0 ? _pesoNum / (_alturaNum * _alturaNum) : null;

  const vitals = [
    {
      icon: Heart,
      label: "Pressão",
      field: "pressaoSistolica",
      value: sinaisVitaisForm.pressaoSistolica && sinaisVitaisForm.pressaoDiastolica
        ? `${sinaisVitaisForm.pressaoSistolica}/${sinaisVitaisForm.pressaoDiastolica}`
        : sinaisVitaisForm.pressaoSistolica || "-",
      unit: "mmHg",
      status: "normal",
      iconColor: "text-red-500"
    },
    {
      icon: Activity,
      label: "Frequência",
      field: "frequenciaCardiaca",
      value: sinaisVitaisForm.frequenciaCardiaca || "-",
      unit: "bpm",
      status: "normal",
      iconColor: "text-blue-500"
    },
    {
      icon: Droplet,
      label: "Saturação",
      field: "saturacaoO2",
      value: sinaisVitaisForm.saturacaoO2 || "-",
      unit: "%",
      status: "normal",
      iconColor: "text-cyan-500"
    },
    {
      icon: Weight,
      label: "Peso",
      field: "peso",
      value: sinaisVitaisForm.peso || "-",
      unit: "kg",
      status: "normal",
      iconColor: "text-orange-500"
    },
    {
      icon: Ruler,
      label: "Altura",
      field: "altura",
      value: sinaisVitaisForm.altura || "-",
      unit: "m",
      status: "normal",
      iconColor: "text-green-500"
    },
    {
      icon: TrendingUp,
      label: "IMC",
      field: "imc",
      value: imc ? imc.toFixed(1) : "-",
      unit: "kg/m²",
      status: "normal",
      iconColor: "text-purple-500"
    },
  ];

  const exams: any[] = [];

  // Determinar se é telemedicina baseado no tipo de consulta
  const isTelemedicina = consulta?.tipoConsulta?.nome?.toLowerCase().includes('telemedicina') || false;

  // Tabs — unificadas para ambos os modos
  const tabs = [
    { id: 'informacoes', label: 'Informações', icon: User },
    { id: 'contexto-consulta', label: 'Contexto da consulta', icon: FileText },
  ];


  useEffect(() => {
    fetchConsulta();
    
    // Timer para duração da sessão
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - sessionStartTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionDuration(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [consultaId]);

  // Parar transcrição quando sair das abas de atendimento ou telemedicina
  useEffect(() => {
    if (activeTab !== 'telemedicina' && activeTab !== 'contexto-consulta') {
      if (isTranscribing) {
        stopTranscription();
      }
    }
  }, [activeTab, isTranscribing, stopTranscription]);

  // Ao iniciar uma nova transcrição (ou começar a preparar),
  // garantir que o painel de chat abra (não minimizado).
  useEffect(() => {
    if (isTranscribing || isPreparing) setChatMinimized(false);
  }, [isTranscribing, isPreparing]);

  useEffect(() => {
    if (consulta?.paciente?.id) {
      fetchHistoricoConsultas(consulta.paciente.id);
      fetchMedicamentosEmUso(consulta.paciente.id);
      fetchHistoricoClinico(consulta.paciente.id);
    }
  }, [consulta?.paciente?.id]);

  // Buscar exames anexados quando a consulta for carregada
  useEffect(() => {
    if (consultaId) {
      fetchExamesAnexados();
    }
  }, [consultaId]);

  const fetchExamesAnexados = async () => {
    try {
      setLoadingExames(true);
      console.log("[Frontend] Buscando exames para consultaId:", consultaId);
      const response = await fetch(`/api/medico/exames/list?consultaId=${consultaId}`);
      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("[Frontend] Erro ao parsear resposta de erro:", e);
        }
        console.error("[Frontend] Erro na resposta:", response.status, errorData);
        throw new Error(errorData.error || `Erro ${response.status} ao buscar exames`);
      }
      const data = await response.json();
      console.log("[Frontend] Exames recebidos:", data.exames?.length || 0, data.exames);
      setExamesAnexados(data.exames || []);
    } catch (error) {
      console.error("[Frontend] Erro ao buscar exames:", error);
      toast.error("Erro ao buscar exames anexados");
    } finally {
      setLoadingExames(false);
    }
  };

  const handleUploadExame = async () => {
    if (!categoriaExame || arquivosExame.length === 0) {
      toast.error("Selecione a categoria e ao menos um arquivo");
      return;
    }

    try {
      setUploadingExame(true);

      let sucessos = 0;
      const falhas: string[] = [];

      // Upload sequencial para garantir numeração correta (o servidor consulta
      // o banco a cada request para calcular o próximo número).
      for (const arquivo of arquivosExame) {
        const formData = new FormData();
        formData.append("consultaId", consultaId);
        formData.append("categoria", categoriaExame);
        formData.append("file", arquivo);

        try {
          const response = await fetch("/api/medico/exames/upload", {
            method: "POST",
            body: formData,
          });

          const contentType = response.headers.get("content-type") || "";

          if (!response.ok) {
            let msg = `Erro ${response.status}`;
            if (contentType.includes("application/json")) {
              const err = await response.json();
              msg = err.error || msg;
            }
            falhas.push(`${arquivo.name}: ${msg}`);
            continue;
          }

          if (!contentType.includes("application/json")) {
            falhas.push(`${arquivo.name}: sessão expirada`);
            continue;
          }

          await response.json();
          sucessos++;
        } catch (err: any) {
          falhas.push(`${arquivo.name}: ${err.message || "erro de rede"}`);
        }
      }

      if (sucessos > 0) {
        toast.success(
          sucessos === 1
            ? "Exame anexado com sucesso!"
            : `${sucessos} exames anexados com sucesso!`
        );
      }
      if (falhas.length > 0) {
        toast.error(`Falha em ${falhas.length} arquivo(s): ${falhas.slice(0, 3).join("; ")}`);
      }

      if (sucessos > 0) {
        setUploadDialogOpen(false);
        setCategoriaExame("");
        setArquivosExame([]);
        setTimeout(async () => {
          await fetchExamesAnexados();
        }, 500);
      }
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error.message || "Erro ao fazer upload do exame");
    } finally {
      setUploadingExame(false);
    }
  };

  const handleDeleteExame = async (exameId: string) => {
    if (!confirm("Tem certeza que deseja remover este exame?")) {
      return;
    }

    try {
      const response = await fetch(`/api/medico/exames/delete?exameId=${exameId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao deletar exame");
      }

      toast.success("Exame removido com sucesso!");
      await fetchExamesAnexados();
    } catch (error: any) {
      console.error("Erro ao deletar exame:", error);
      toast.error(error.message || "Erro ao remover exame");
    }
  };


  const handleDownloadExame = async (exameId: string, s3Key: string) => {
    try {
      const response = await fetch(`/api/medico/exames/url?exameId=${exameId}`);
      if (!response.ok) throw new Error("Erro ao obter URL do exame");
      const data = await response.json();
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Erro ao baixar exame:", error);
      toast.error("Erro ao baixar exame");
    }
  };

  // Buscar medicamentos ou manipulados quando o dialog abrir ou quando a tab mudar
  useEffect(() => {
    if (medicamentoDialogOpen) {
      if (activeMedicamentoTab === "medicamentos") {
        fetchMedicamentos();
      } else {
        fetchManipulados();
      }
    }
  }, [medicamentoDialogOpen, activeMedicamentoTab]);

  // Buscar quando o termo de busca mudar (com debounce)
  useEffect(() => {
    if (medicamentoDialogOpen) {
      const timeoutId = setTimeout(() => {
        if (activeMedicamentoTab === "medicamentos") {
          fetchMedicamentos();
        } else {
          fetchManipulados();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [medicamentoSearch, medicamentoDialogOpen, activeMedicamentoTab]);

  // Pré-selecionar exames já adicionados ao reabrir o dialog
  useEffect(() => {
    if (exameSearchDialogOpen) {
      const preExames = new Set(examesManuais.filter(e => e.exameId).map(e => e.exameId!));
      setSelectedExamesIds(preExames);
      const preGrupos = new Set(examesManuais.filter(e => e.grupoId).map(e => e.grupoId!));
      setSelectedGruposIds(preGrupos);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exameSearchDialogOpen]);

  useEffect(() => {
    if (cidSearchDialogOpen) {
      const preSelecionados = new Set(
        cidsCadastrados
          .filter((cid) => cidsManuais.some((m) => m.code === cid.codigo))
          .map((cid) => cid.id)
      );
      setSelectedCidsCatalogoIds(preSelecionados);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidSearchDialogOpen]);

  useEffect(() => {
    if (cidSearchDialogOpen) {
      fetchCidsCadastrados();
    }
  }, [cidSearchDialogOpen, cidSearch]);

  // Buscar exames apenas quando digitar 3+ caracteres
  useEffect(() => {
    if (exameSearchDialogOpen && exameSearch.trim().length >= 3) {
      fetchExamesCadastrados();
      if (activeExameTab === "grupos") fetchGruposExames();
    } else if (exameSearchDialogOpen) {
      setExamesCadastrados([]);
      setGruposExames([]);
    }
  }, [exameSearchDialogOpen, exameSearch]);

  // Buscar grupos de exames quando a tab mudar (se já tem busca suficiente)
  useEffect(() => {
    if (exameSearchDialogOpen && activeExameTab === "grupos" && exameSearch.trim().length >= 3) {
      fetchGruposExames();
    }
  }, [exameSearchDialogOpen, activeExameTab]);

  const fetchMedicamentos = async () => {
    try {
      setLoadingMedicamentos(true);
      const params = new URLSearchParams();
      if (medicamentoSearch) {
        params.append("search", medicamentoSearch);
      }
      const response = await fetch(`/api/medico/medicamentos?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar medicamentos");
      const data = await response.json();
      setMedicamentos(data.medicamentos || []);
    } catch (error) {
      console.error("Erro ao buscar medicamentos:", error);
      toast.error("Erro ao buscar medicamentos");
    } finally {
      setLoadingMedicamentos(false);
    }
  };

  const fetchManipulados = async () => {
    try {
      setLoadingManipulados(true);
      const params = new URLSearchParams();
      if (medicamentoSearch) {
        params.append("search", medicamentoSearch);
      }
      params.append("limit", "50"); // Buscar mais resultados
      const response = await fetch(`/api/medico/manipulados?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar manipulados");
      const data = await response.json();
      setManipulados(data.manipulados || []);
    } catch (error) {
      console.error("Erro ao buscar manipulados:", error);
      toast.error("Erro ao buscar manipulados");
    } finally {
      setLoadingManipulados(false);
    }
  };

  const fetchExamesCadastrados = async () => {
    try {
      setLoadingExamesCadastrados(true);
      const params = new URLSearchParams();
      if (exameSearch && activeExameTab === "exames") {
        params.append("search", exameSearch);
      }
      const response = await fetch(`/api/medico/exames?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar exames");
      const data = await response.json();
      setExamesCadastrados(data.exames || []);
    } catch (error) {
      console.error("Erro ao buscar exames:", error);
      toast.error("Erro ao buscar exames");
    } finally {
      setLoadingExamesCadastrados(false);
    }
  };

  const fetchGruposExames = async () => {
    try {
      setLoadingGruposExames(true);
      const params = new URLSearchParams();
      if (exameSearch && activeExameTab === "grupos") {
        params.append("search", exameSearch);
      }
      params.append("limit", "1000");
      const response = await fetch(`/api/medico/grupos-exames?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar grupos de exames");
      const data = await response.json();
      setGruposExames(data.gruposExames || []);
    } catch (error) {
      console.error("Erro ao buscar grupos de exames:", error);
      toast.error("Erro ao buscar grupos de exames");
    } finally {
      setLoadingGruposExames(false);
    }
  };

  const fetchCidsCadastrados = async () => {
    try {
      setLoadingCidsCadastrados(true);
      const params = new URLSearchParams();
      if (cidSearch.trim()) params.append("search", cidSearch.trim());
      params.append("limit", "300");
      const response = await fetch(`/api/medico/cids?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar CIDs");
      const data = await response.json();
      setCidsCadastrados(data.cids || []);
    } catch (error) {
      console.error("Erro ao buscar CIDs:", error);
      toast.error("Erro ao buscar CIDs");
    } finally {
      setLoadingCidsCadastrados(false);
    }
  };

  const handleToggleCidCatalogo = (id: string) => {
    setSelectedCidsCatalogoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirmarCidsCatalogo = () => {
    const manuaisDigitados = cidsManuais.filter(
      (cid) => !cidsCadastrados.some((catalogo) => catalogo.codigo === cid.code)
    );
    const selecionados = cidsCadastrados
      .filter((cid) => selectedCidsCatalogoIds.has(cid.id))
      .map((cid) => ({ code: cid.codigo, description: cid.descricao }));

    setCidsManuais([...manuaisDigitados, ...selecionados]);
    setCidSearchDialogOpen(false);
    setCidSearch("");
    setSelectedCidsCatalogoIds(new Set());
  };

  const handleCancelarCidsCatalogo = () => {
    setCidSearchDialogOpen(false);
    setCidSearch("");
    setSelectedCidsCatalogoIds(new Set());
  };

  const handleToggleExame = (id: string) => {
    setSelectedExamesIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleGrupo = (id: string) => {
    setSelectedGruposIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirmarExames = () => {
    // Preservar apenas exames digitados manualmente (sem vínculo com catálogo)
    const examesDigitados = examesManuais.filter(e => !e.exameId && !e.grupoId);
    const novosExames: typeof examesManuais = [];

    examesCadastrados
      .filter(e => selectedExamesIds.has(e.id))
      .forEach(exame => {
        const isTuss = exame.id.startsWith("tuss:");
        novosExames.push({
          nome: exame.nome,
          tipo: exame.tipo,
          codigoTussId: exame.codigoTuss?.id ?? null,
          codigoTuss: exame.codigoTuss?.codigoTuss ?? null,
          exameId: isTuss ? undefined : exame.id,
        });
      });

    gruposExames
      .filter(g => selectedGruposIds.has(g.id))
      .forEach(grupoExame => {
        grupoExame.exames.forEach(item => {
          novosExames.push({
            nome: item.exame.nome,
            tipo: item.exame.tipo || "Não especificado",
            codigoTussId: item.exame.codigoTuss?.id ?? null,
            codigoTuss: item.exame.codigoTuss?.codigoTuss ?? null,
            grupoId: grupoExame.id,
          });
        });
      });

    setExamesManuais([...examesDigitados, ...novosExames]);
    setSelectedExamesIds(new Set());
    setSelectedGruposIds(new Set());
    setExameSearchDialogOpen(false);
    setExameSearch("");
  };

  const handleCancelarExames = () => {
    setSelectedExamesIds(new Set());
    setSelectedGruposIds(new Set());
    setExameSearchDialogOpen(false);
    setExameSearch("");
  };

  const toggleExameParaIA = (id: string) => {
    setExamesParaIA(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalisarComIA = async () => {
    setTranscricaoFinalizada(false);
    await handleProcessTranscription();
  };

  // ─── Helpers de navegação do stepper ─────────────────────────────────────
  const advanceToStep = (step: 1|2|3|4|5) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step - 1 as number);
      return next;
    });
    setCurrentStep(step);
    // Scroll para o topo da área de consulta
    setTimeout(() => {
      document.getElementById('consultation-zone')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Fase 1: gerar apenas anamnese a partir da transcrição ─────────────────
  const handleGenerateAnamnese = async () => {
    console.log("🚀 handleGenerateAnamnese chamado");
    const transcriptionText = transcription
      .filter((e) => !e.isPartial)
      .map((e) => e.text)
      .join(" ") || transcription.map((e) => e.text).join(" ");

    console.log("📋 Transcrição para processar:", transcriptionText.substring(0, 200) + "...");

    if (!transcriptionText.trim()) {
      console.error("❌ Transcrição vazia!");
      toast.error("Nenhuma transcrição disponível para processar");
      return;
    }

    console.log("⏳ Iniciando processamento...");
    setIsProcessing(true);
    setProcessingContext('anamnese');
    setProcessingStage('processing');
    setAnalysisResults(null);

    try {
      setTimeout(() => setProcessingStage('analyzing'), 800);

      const response = await fetch("/api/medico/gerar-anamnese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcriptionText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao gerar anamnese");
      }

      // Streaming: lê chunks progressivamente e atualiza a anamnese em tempo real
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let anamneseAccumulated = "";

      if (reader) {
        // Sai do modal de processamento assim que o primeiro chunk chega
        setIsProcessing(false);
        setIsEditingAnamnese(true);
        setConsultationMode('manual');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          anamneseAccumulated += chunk;
          setEditedAnamnese(anamneseAccumulated);
          setAnalysisResults({ anamnese: anamneseAccumulated, cidCodes: [], protocolos: [], exames: [], prescricoes: [] });
        }
      } else {
        anamneseAccumulated = await response.text();
      }

      const anamneseFormatted = anamneseAccumulated.replace(/\\n/g, '\n').replace(/\\r/g, '');
      setEditedAnamnese(anamneseFormatted);
      setAnalysisResults({ anamnese: anamneseFormatted, cidCodes: [], protocolos: [], exames: [], prescricoes: [] });
      setProntuario((prev) => ({ ...prev, anamnese: anamneseFormatted } as Prontuario));
      setTranscricaoFinalizada(false);
      toast.success("Anamnese gerada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar anamnese");
      console.error(error);
    } finally {
      setIsProcessing(false);
      setProcessingStage('processing');
    }
  };

  // ── Auto-gerar anamnese ao encerrar transcrição ────────────────────────────
  useEffect(() => {
    if (transcricaoFinalizada && transcription.length > 0 && !isProcessing) {
      console.log("🔄 Transcrição finalizada, preparando para gerar anamnese...", {
        transcricaoFinalizada,
        transcriptionLength: transcription.length,
        isProcessing,
        hasAnamnese: !!(analysisResults?.anamnese || prontuario?.anamnese)
      });
      
      // Pequeno delay para garantir que a transcrição está completa
      const timer = setTimeout(() => {
        const transcriptionText = transcription
          .filter((e) => !e.isPartial)
          .map((e) => e.text)
          .join(" ") || transcription.map((e) => e.text).join(" ");
        
        console.log("📝 Texto da transcrição:", transcriptionText.substring(0, 200) + "...");
        
        if (transcriptionText.trim()) {
          console.log("✅ Iniciando geração de anamnese...");
          handleGenerateAnamnese();
        } else {
          console.warn("⚠️ Transcrição vazia, não é possível gerar anamnese");
          toast.error("Transcrição vazia. Não é possível gerar anamnese.");
          setTranscricaoFinalizada(false);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcricaoFinalizada, transcription.length]);

  // Mantido para compatibilidade com fluxo legado (telemedicina etc.)
  const handleStep1Complete = async () => {
    await handleGenerateAnamnese();
  };

  const handleConfirmAnamnese = () => {
    setAnamneseConfirmed(true);
    toast.success('Anamnese confirmada');
  };

  // ── Fase 2: gerar CID, exames e prescrições com contexto confirmado ────────
  const handleGenerateSuggestions = async (context?: AIContext) => {
    const anamneseText = analysisResults?.anamnese || prontuario?.anamnese || "";
    if (!anamneseText.trim()) {
      toast.error("Confirme a anamnese antes de gerar sugestões");
      return;
    }

    setIsProcessing(true);
    setProcessingContext('suggestions');
    setProcessingStage('analyzing');

    try {
      setTimeout(() => setProcessingStage('generating'), 800);

      // Montar contexto a partir das seleções do médico
      const alergias = context?.alergias ? patient.allergies : [];
      const medicamentos = context?.medicamentos
        ? medicamentosEmUso.map((m) => `${m.nome} ${m.posologia || ""}`.trim())
        : [];
      const examesIds = context?.examesIds ?? [];

      const response = await fetch("/api/medico/gerar-sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anamnese: anamneseText, alergias, medicamentosEmUso: medicamentos, examesIds }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao gerar sugestões");
      }

      const data = await response.json();
      setAnalysisResults((prev) => ({
        anamnese: prev?.anamnese || anamneseText,
        raciocinioClinico: data.raciocinioClinico || '',
        cidCodes: data.cidCodes || [],
        protocolos: data.protocolos || [],
        exames: data.exames || [],
        prescricoes: (data.prescricoes || []).map((p: any) => ({ ...p, duracao: p.quantidade || p.duracao || "" })),
      }));
      toast.success("Sugestões geradas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar sugestões");
      console.error(error);
    } finally {
      setIsProcessing(false);
      setProcessingStage('processing');
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocumentosGerados((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSignDocument = async (id: string) => {
    const doc = documentosGerados.find((d) => d.id === id);
    if (!doc?.pdfBlob) {
      toast.warning("PDF não disponível para assinatura");
      return;
    }
    if (doc.assinado) {
      toast.info("Documento já está assinado");
      return;
    }

    // Verificar certificado antes de assinar
    const cert = await checkCertificado();
    if (!cert.configured) {
      toast.error("Certificado digital não configurado. Acesse seu Perfil para carregar o certificado (.pfx/.p12) antes de assinar.");
      return;
    }
    if (cert.expired) {
      toast.error("Certificado digital expirado. Acesse seu Perfil para atualizar o certificado antes de assinar.");
      return;
    }

    setDocumentosGerados((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, assinando: true, erroAssinatura: undefined } : d
      )
    );

    try {
      const formData = new FormData();
      formData.append("consultaId", consultaId);
      formData.append("tipoDocumento", doc.tipoDocumento);
      formData.append("nomeDocumento", doc.nomeDocumento);
      formData.append("pdfFile", doc.pdfBlob, `${doc.tipoDocumento}.pdf`);

      const res = await fetch("/api/medico/documentos/assinar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = `Erro ao assinar (HTTP ${res.status})`;
        try {
          const err = await res.json();
          message = err.error || message;
        } catch {
          const txt = await res.text();
          if (txt) message = txt;
        }
        throw new Error(message);
      }

      const signedBlob = await res.blob();
      
      // Log para debug: verificar se o blob mudou
      const originalSize = doc.pdfBlob?.size || 0;
      const signedSize = signedBlob.size;
      console.log("[Assinatura] Tamanhos:", {
        original: originalSize,
        assinado: signedSize,
        diferenca: signedSize - originalSize,
        mudou: signedSize !== originalSize,
      });

      setDocumentosGerados((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, pdfBlob: signedBlob, assinado: true, assinando: false }
            : d
        )
      );

      toast.success(`Documento assinado com sucesso! (${(signedSize / 1024).toFixed(1)} KB)`);
    } catch (e: any) {
      const msg = e?.message || "Erro ao assinar documento";
      setDocumentosGerados((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, assinando: false, erroAssinatura: msg } : d
        )
      );
      toast.error(msg);
    }
  };

  const handleSelectMedicamento = (medicamento: typeof medicamentos[0]) => {
    if (selectedPrescricaoIndex === null) {
      // Adicionar nova prescrição
      const dosagem = medicamento.concentracao && medicamento.unidade
        ? `${medicamento.concentracao}${medicamento.unidade}`
        : medicamento.apresentacao || "";
      setPrescricoes([...prescricoes, {
        medicamento: medicamento.nome,
        dosagem,
        posologia: "", // Posologia sempre vazia ao adicionar novo medicamento
        duracao: medicamento.apresentacao || "",
      }]);
    } else {
      // Atualizar prescrição existente - manter posologia existente
      const next = [...prescricoes];
      const dosagem = medicamento.concentracao && medicamento.unidade
        ? `${medicamento.concentracao}${medicamento.unidade}`
        : medicamento.apresentacao || "";
      next[selectedPrescricaoIndex] = {
        ...next[selectedPrescricaoIndex],
        medicamento: medicamento.nome,
        dosagem,
        // Manter a posologia existente, não alterar
        posologia: next[selectedPrescricaoIndex].posologia,
        duracao: medicamento.apresentacao || next[selectedPrescricaoIndex].duracao,
      };
      setPrescricoes(next);
    }
    setMedicamentoDialogOpen(false);
    setMedicamentoSearch("");
    setSelectedPrescricaoIndex(null);
  };

  const handleSelectManipulado = (manipulado: typeof manipulados[0]) => {
    if (selectedPrescricaoIndex === null) {
      // Adicionar nova prescrição
      setPrescricoes([...prescricoes, {
        medicamento: manipulado.descricao,
        dosagem: "",
        posologia: manipulado.informacoes || "",
        duracao: "",
      }]);
    } else {
      // Atualizar prescrição existente - manter posologia existente se já tiver
      const next = [...prescricoes];
      next[selectedPrescricaoIndex] = {
        ...next[selectedPrescricaoIndex],
        medicamento: manipulado.descricao,
        dosagem: next[selectedPrescricaoIndex].dosagem,
        posologia: manipulado.informacoes || next[selectedPrescricaoIndex].posologia,
        duracao: next[selectedPrescricaoIndex].duracao,
      };
      setPrescricoes(next);
    }
    setMedicamentoDialogOpen(false);
    setMedicamentoSearch("");
    setSelectedPrescricaoIndex(null);
  };

  const handlePreSelectMedicamento = (med: typeof medicamentos[0]) => {
    const dosagem = med.concentracao && med.unidade
      ? `${med.concentracao}${med.unidade}`
      : med.apresentacao || "";
    setPendingMedicamento({
      nome: med.nome,
      dosagem,
      posologia: "",
      duracao: "",
    });
  };

  const handlePreSelectManipulado = (manipulado: typeof manipulados[0]) => {
    setPendingMedicamento({
      nome: manipulado.descricao,
      dosagem: "",
      posologia: manipulado.informacoes || "",
      duracao: "",
    });
  };

  const handleConfirmPendingMedicamento = () => {
    if (!pendingMedicamento) return;
    if (selectedPrescricaoIndex === null) {
      setPrescricoes([...prescricoes, {
        medicamento: pendingMedicamento.nome,
        dosagem: pendingMedicamento.dosagem,
        posologia: pendingMedicamento.posologia,
        duracao: pendingMedicamento.duracao,
      }]);
    } else {
      const next = [...prescricoes];
      next[selectedPrescricaoIndex] = {
        ...next[selectedPrescricaoIndex],
        medicamento: pendingMedicamento.nome,
        dosagem: pendingMedicamento.dosagem,
        posologia: pendingMedicamento.posologia,
        duracao: pendingMedicamento.duracao,
      };
      setPrescricoes(next);
    }
    setPendingMedicamento(null);
    setMedicamentoDialogOpen(false);
    setMedicamentoSearch("");
    setSelectedPrescricaoIndex(null);
  };

  const getTarjaBadgeClass = (controle?: string | null) => {
    const value = (controle || "").toLowerCase();
    if (!value) return "bg-slate-100 text-slate-700 border-slate-300";

    if (value.includes("preta")) {
      return "bg-slate-900 text-white border-slate-900";
    }

    if (value.includes("vermelha")) {
      return "bg-red-100 text-red-800 border-red-300";
    }

    if (value.includes("amarela")) {
      return "bg-amber-100 text-amber-800 border-amber-300";
    }

    if (value.includes("controlado")) {
      return "bg-violet-100 text-violet-800 border-violet-300";
    }

    if (value.includes("simples")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }

    return "bg-slate-100 text-slate-700 border-slate-300";
  };

  // Debug: monitorar mudanças em analysisResults
  useEffect(() => {
    console.log("=== analysisResults mudou ===");
    console.log("analysisResults existe?", !!analysisResults);
    if (analysisResults) {
      console.log("Anamnese:", analysisResults.anamnese?.substring(0, 100));
      console.log("CID Codes:", analysisResults.cidCodes?.length, analysisResults.cidCodes);
      console.log("Exames:", analysisResults.exames?.length, analysisResults.exames);
      console.log("Estado completo:", analysisResults);
      console.log("Active Tab:", activeTab);
    } else {
      console.log("analysisResults é null/undefined");
    }
  }, [analysisResults, activeTab]);

  // Sincronizar editedAnamnese quando analysisResults muda
  useEffect(() => {
    if (analysisResults?.anamnese) {
      setEditedAnamnese(analysisResults.anamnese);
      setIsAnamneseEdited(false);
    }
  }, [analysisResults?.anamnese]);

  const fetchConsulta = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/medico/atendimento?consultaId=${consultaId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.consulta) {
        throw new Error("Consulta não encontrada");
      }
      
      setConsulta(data.consulta);
      const toStr = (v: unknown) => v != null ? String(v) : "";
      setVitaisForm({
        pressaoSistolica: toStr(data.consulta.pressaoSistolica),
        pressaoDiastolica: toStr(data.consulta.pressaoDiastolica),
        frequenciaCardiaca: toStr(data.consulta.frequenciaCardiaca),
        saturacaoO2: toStr(data.consulta.saturacaoO2),
        temperatura: toStr(data.consulta.temperatura),
        peso: toStr(data.consulta.peso),
        altura: toStr(data.consulta.altura),
      });

      if (data.prontuario) {
        setProntuario(data.prontuario);
        // Se já existia anamnese salva, preencher o campo editado também
        if (data.prontuario.anamnese) {
          setEditedAnamnese(data.prontuario.anamnese);
        }
        if (data.prontuario.orientacoes) {
          setOrientacoes(data.prontuario.orientacoes);
        }
      }

      // Restaurar CIDs, exames e prescrições salvos anteriormente
      if (data.savedCids?.length > 0) {
        setCidsManuais(data.savedCids.map((c: { code: string; description: string }) => ({
          code: c.code,
          description: c.description,
        })));
      }
      if (data.savedExames?.length > 0) {
        setExamesManuais(data.savedExames.map((e: { nome: string; tipo: string | null }) => ({
          nome: e.nome,
          tipo: e.tipo || "",
        })));
      }
      if (data.savedPrescricoes?.length > 0) {
        setPrescricoes(data.savedPrescricoes.map((p: { medicamento: string; dosagem: string | null; posologia: string; duracao: string | null }) => ({
          medicamento: p.medicamento,
          dosagem: p.dosagem || "",
          posologia: p.posologia,
          duracao: p.duracao || "",
        })));
      }

      // Definir aba inicial baseado no tipo de consulta
      // Ambos os modos usam o mesmo layout — aba inicial é contexto-consulta
      setActiveTab('contexto-consulta');
    } catch (error: any) {
      const errorMessage = error.message || "Erro ao carregar dados do atendimento";
      toast.error(errorMessage);
      console.error("Erro ao buscar dados do atendimento:", error);
      router.push("/medico/fila-atendimento");
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicamentosEmUso = async (pacienteId: string) => {
    try {
      setLoadingMedicamentosEmUso(true);
      const response = await fetch(`/api/medico/paciente/${pacienteId}/prescricoes`);
      if (!response.ok) throw new Error("Erro ao buscar medicamentos em uso");
      const data = await response.json();
      
      // Pegar as 10 prescrições mais recentes e formatar
      const medicamentos = data.prescricoes
        ?.slice(0, 10)
        .flatMap((presc: any) => 
          presc.medicamentos?.map((med: any) => ({
            nome: med.medicamento?.nome || med.medicamento || "Medicamento não especificado",
            posologia: med.posologia || "Não especificado",
            dataPrescricao: formatDate(new Date(presc.dataPrescricao || presc.consulta?.dataHora || Date.now())),
          })) || []
        ) || [];
      
      setMedicamentosEmUso(medicamentos);
    } catch (error) {
      console.error("Erro ao buscar medicamentos em uso:", error);
      setMedicamentosEmUso([]);
    } finally {
      setLoadingMedicamentosEmUso(false);
    }
  };

  const fetchHistoricoConsultas = async (pacienteId: string) => {
    try {
      setLoadingHistorico(true);
      const response = await fetch(`/api/medico/paciente/${pacienteId}/consultas`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar histórico de consultas");
      }

      const data = await response.json();
      setHistoricoConsultas(data.consultas || []);
    } catch (error) {
      console.error("Erro ao carregar histórico de consultas:", error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fetchHistoricoClinico = async (pacienteId: string) => {
    try {
      const params = new URLSearchParams({ limit: "3", excluirConsultaId: consultaId });
      const response = await fetch(`/api/medico/pacientes/${pacienteId}/historico-consulta?${params}`);
      if (!response.ok) return;
      const data = await response.json();
      setHistoricoClinico(data || []);
    } catch (e) {
      console.error("Erro ao buscar histórico clínico:", e);
    }
  };

  const handleRepetirItens = (itens: {
    cids: Array<{ code: string; description: string }>;
    exames: Array<{ nome: string; tipo: string | null }>;
    prescricoes: Array<{ medicamento: string; dosagem: string | null; posologia: string; duracao: string | null }>;
  }) => {
    if (itens.cids.length > 0) {
      setCidsManuais(prev => {
        const existing = new Set(prev.map(c => c.code));
        const novos = itens.cids.filter(c => !existing.has(c.code));
        return [...prev, ...novos];
      });
    }
    if (itens.exames.length > 0) {
      setExamesManuais(prev => {
        const existing = new Set(prev.map(e => e.nome.toLowerCase()));
        const novos = itens.exames
          .filter(e => !existing.has(e.nome.toLowerCase()))
          .map(e => ({ nome: e.nome, tipo: e.tipo || "" }));
        return [...prev, ...novos];
      });
    }
    if (itens.prescricoes.length > 0) {
      setPrescricoes(prev => {
        const existing = new Set(prev.map(p => p.medicamento.toLowerCase()));
        const novos = itens.prescricoes
          .filter(p => !existing.has(p.medicamento.toLowerCase()))
          .map(p => ({
            medicamento: p.medicamento,
            dosagem: p.dosagem || "",
            posologia: p.posologia,
            duracao: p.duracao || "",
          }));
        return [...prev, ...novos];
      });
    }
  };

  const handleViewFichaAtendimento = async (consultaId: string) => {
    try {
      // Buscar documentos da consulta
      const response = await fetch(`/api/medico/consultas/${consultaId}/documentos`);
      if (!response.ok) {
        throw new Error("Erro ao buscar documentos");
      }
      const data = await response.json();
      
      // Procurar a ficha de atendimento
      const fichaAtendimento = data.documentos?.find((doc: any) => doc.tipoDocumento === "ficha-atendimento");
      
      if (!fichaAtendimento) {
        toast.error("Ficha de atendimento não encontrada para esta consulta");
        return;
      }

      if (!fichaAtendimento.s3Key) {
        toast.error("Ficha de atendimento não disponível");
        return;
      }

      // Buscar URL do documento
      const docResponse = await fetch(`/api/medico/documentos/${fichaAtendimento.id}`);
      if (!docResponse.ok) {
        const errorData = await docResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao buscar ficha de atendimento");
      }

      const docData = await docResponse.json();
      if (docData.url) {
        window.open(docData.url, "_blank");
      } else {
        throw new Error("URL da ficha de atendimento não encontrada");
      }
    } catch (error: any) {
      console.error("Erro ao visualizar ficha de atendimento:", error);
      toast.error(error.message || "Erro ao visualizar ficha de atendimento");
    }
  };

  const handleGerarResumoClinico = async () => {
    if (!consulta?.paciente?.id) {
      toast.error("Paciente não encontrado");
      return;
    }

    setGerandoResumoClinico(true);
    setResumoClinico(null);

    try {
      const response = await fetch("/api/medico/resumo-clinico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pacienteId: consulta.paciente.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar resumo clínico");
      }

      const data = await response.json();
      setResumoClinico(data.resumo);
      toast.success("Resumo clínico gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar resumo clínico:", error);
      toast.error(error.message || "Erro ao gerar resumo clínico");
      setResumoClinico(null);
    } finally {
      setGerandoResumoClinico(false);
    }
  };

  const handleProcessTranscription = async () => {
    console.log("handleProcessTranscription chamado. Transcrição:", transcription);
    console.log("Total de entradas:", transcription.length);
    
    // Mostrar modal imediatamente, mesmo antes de verificar
    setIsProcessing(true);
    setProcessingStage('processing');
    setAnalysisResults(null);
    
    if (transcription.length === 0) {
      toast.error("Nenhuma transcrição disponível para processar");
      setIsProcessing(false);
      return;
    }
    
    // Verificar se há pelo menos uma entrada com texto
    const hasText = transcription.some(entry => entry.text && entry.text.trim().length > 0);
    if (!hasText) {
      toast.error("Nenhuma transcrição disponível para processar");
      setIsProcessing(false);
      return;
    }

    try {
      // Simular estágios de processamento
      setTimeout(() => setProcessingStage('analyzing'), 1000);
      setTimeout(() => setProcessingStage('generating'), 2000);

      // Passar o modelo selecionado e os exames selecionados para o processamento
      const results = await processTranscription({ consultaId });
      
      console.log("=== Resultados do processamento ===");
      console.log("Results:", results);
      console.log("CID Codes recebidos:", results?.cidCodes);
      console.log("CID Codes length:", results?.cidCodes?.length);
      console.log("===================================");
      
      if (results) {
        console.log("Definindo analysisResults:", results);
        // Garantir que prescricoes existe (pode ser undefined em respostas antigas)
        setAnalysisResults({
          anamnese: results.anamnese,
          cidCodes: results.cidCodes || [],
          protocolos: (results as any).protocolos || [],
          exames: results.exames || [],
          prescricoes: ((results as any).prescricoes || []).map((p: any) => ({ ...p, duracao: p.quantidade || p.duracao || "" })),
        });
        // Mudar para aba Manual para exibir os campos preenchidos
        setConsultationMode('manual');
        // Atualizar prontuário com a anamnese gerada
        setProntuario((prev) => ({
          ...prev,
          anamnese: results.anamnese,
        } as Prontuario));
        // Mostrar visualização formatada por padrão
        setIsEditingAnamnese(false);
        console.log("analysisResults definido, modal deve fechar e resultados devem aparecer");
      } else {
        console.warn("processTranscription retornou null ou undefined");
        toast.error("Nenhum resultado retornado do processamento");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar transcrição");
      console.error(error);
    } finally {
      setIsProcessing(false);
      setProcessingStage('processing');
    }
  };

  const handlePreviewFicha = async () => {
    try {
      setLoadingFichaPreview(true);

      const selectedCidsList = [
        ...(analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || []),
        ...cidsManuais,
      ];
      const selectedExamesList = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || [];
      const allExames = [...selectedExamesList, ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo }))];
      const selectedProtocolosList = analysisResults?.protocolos?.filter((_, i) => selectedProtocolosAI.has(i)).map(p => ({ nome: p.nome, descricao: p.descricao })) || [];
      const allProtocolos = [...selectedProtocolosList, ...protocolosManuais.map(p => ({ nome: p.nome, descricao: p.descricao }))];

      // Atestados e declarações gerados na consulta (excluindo ficha de atendimento e receitas)
      const tiposAtestado = new Set([
        "atestado-afastamento", "atestado-afastamento-cid", "atestado-afastamento-sem-cid",
        "atestado-afastamento-historico-cid", "atestado-afastamento-indeterminado",
        "atestado-aptidao-fisica-mental", "atestado-aptidao-piscinas", "atestado-aptidao-fisica",
        "declaracao-comparecimento", "declaracao-comparecimento-acompanhante",
        "declaracao-comparecimento-horario-cid",
      ]);
      const atestados = documentosGerados
        .filter(d => tiposAtestado.has(d.tipoDocumento))
        .map(d => ({ nome: d.nomeDocumento }));

      const response = await fetch("/api/medico/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoDocumento: "ficha-atendimento",
          consultaId,
          dados: {
            anamnese: editedAnamnese || prontuario?.anamnese || analysisResults?.anamnese || "",
            cidCodes: selectedCidsList,
            exames: allExames,
            protocolos: allProtocolos,
            prescricoes: [
              ...prescricoes,
              ...(analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [])
                .filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
            ],
            atestados,
            orientacoes,
          },
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar ficha de atendimento");

      const pdfBlob = await response.blob();

      // Assinar digitalmente de forma automática (com verificação prévia)
      let finalBlob = pdfBlob;
      const certCheck = await checkCertificado();
      if (!certCheck.configured) {
        toast.warning("Certificado digital não configurado — abrindo sem assinatura. Acesse seu Perfil para carregar o certificado.");
      } else if (certCheck.expired) {
        toast.warning("Certificado digital expirado — abrindo sem assinatura. Acesse seu Perfil para atualizar o certificado.");
      } else {
        try {
          const formData = new FormData();
          formData.append("consultaId", consultaId);
          formData.append("tipoDocumento", "ficha-atendimento");
          formData.append("nomeDocumento", "Ficha de Atendimento");
          formData.append("pdfFile", pdfBlob, "ficha-atendimento.pdf");

          const signRes = await fetch("/api/medico/documentos/assinar", {
            method: "POST",
            body: formData,
          });

          if (signRes.ok) {
            finalBlob = await signRes.blob();
          } else {
            toast.warning("Não foi possível assinar digitalmente — abrindo sem assinatura.");
          }
        } catch {
          toast.warning("Erro ao assinar digitalmente — abrindo sem assinatura.");
        }
      }

      const url = URL.createObjectURL(finalBlob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar ficha de atendimento");
    } finally {
      setLoadingFichaPreview(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/medico/atendimento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId,
          anamnese: editedAnamnese || prontuario?.anamnese || analysisResults?.anamnese || "",
          exameFisico: prontuario?.exameFisico || "",
          diagnostico: prontuario?.diagnostico || "",
          conduta: prontuario?.conduta || "",
          orientacoesConduta: prontuario?.orientacoesConduta || "",
          orientacoes,
          evolucao: prontuario?.evolucao || "",
          cids: [
            ...(analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || []),
            ...cidsManuais,
          ],
          exames: [
            ...(analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || []),
            ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo })),
          ],
          prescricoes: [
            ...prescricoes,
            ...(analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [])
              .filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
          ],
          finalizar: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar prontuário");
      }

      toast.success("Prontuário salvo com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar prontuário");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

const handleSaveSinaisVitais = async (form: typeof sinaisVitaisForm) => {
    setSavingSinaisVitais(true);
    try {
      // Só envia campos que têm valor preenchido — campos vazios são omitidos para não apagar dados existentes
      const body: Record<string, unknown> = { consultaId };
      if (form.pressaoSistolica.trim()) body.pressaoSistolica = form.pressaoSistolica.trim();
      if (form.pressaoDiastolica.trim()) body.pressaoDiastolica = form.pressaoDiastolica.trim();
      if (form.frequenciaCardiaca.trim()) body.frequenciaCardiaca = form.frequenciaCardiaca.trim();
      if (form.saturacaoO2.trim()) body.saturacaoO2 = form.saturacaoO2.trim();
      if (form.temperatura.trim()) body.temperatura = form.temperatura.trim();
      if (form.peso.trim()) body.peso = form.peso.trim();
      if (form.altura.trim()) body.altura = form.altura.trim();
      const res = await fetch("/api/medico/sinais-vitais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    } catch {
      alert("Erro ao salvar sinais vitais. Tente novamente.");
    } finally {
      setSavingSinaisVitais(false);
    }
  };

  const handleFinalizarAtendimento = async () => {
    try {
      setSaving(true);
      setSavingStep("Salvando prontuário...");

      // Primeiro, salvar o prontuário
      const response = await fetch("/api/medico/atendimento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId,
          anamnese: editedAnamnese || prontuario?.anamnese || analysisResults?.anamnese || "",
          exameFisico: prontuario?.exameFisico || "",
          diagnostico: prontuario?.diagnostico || "",
          conduta: prontuario?.conduta || "",
          orientacoesConduta: prontuario?.orientacoesConduta || "",
          orientacoes,
          evolucao: prontuario?.evolucao || "",
          cids: [
            ...(analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || []),
            ...cidsManuais,
          ],
          exames: [
            ...(analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || []),
            ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo })),
          ],
          prescricoes: [
            ...prescricoes,
            ...(analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [])
              .filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
          ],
          finalizar: true,
          retornoAgendado,
          retornoDias: retornoAgendado ? retornoDias : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao finalizar atendimento");
      }

      // Gerar e salvar Ficha de Atendimento automaticamente
      setSavingStep("Gerando ficha de atendimento...");
      try {
        const selectedCidsList = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || [];
        const selectedExamesList = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || [];
        const allExames = [...selectedExamesList, ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo }))];

        const selectedProtocolosList = analysisResults?.protocolos?.filter((_, i) => selectedProtocolosAI.has(i)).map(p => ({ nome: p.nome, descricao: p.descricao })) || [];
        const protocolosManuaisList = protocolosManuais.map(p => ({ nome: p.nome, descricao: p.descricao }));
        const allProtocolos = [...selectedProtocolosList, ...protocolosManuaisList];

        const fichaRequestData = {
          tipoDocumento: "ficha-atendimento",
          consultaId,
          dados: {
            anamnese: editedAnamnese || prontuario?.anamnese || analysisResults?.anamnese || "",
            cidCodes: selectedCidsList,
            exames: allExames,
            protocolos: allProtocolos,
            prescricoes: prescricoes,
            orientacoes,
          },
        };

        const fichaResponse = await fetch("/api/medico/documentos/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fichaRequestData),
        });

        if (fichaResponse.ok) {
          const fichaPdfBlob = await fichaResponse.blob();
          const fichaFormData = new FormData();
          fichaFormData.append("consultaId", consultaId);
          fichaFormData.append("tipoDocumento", "ficha-atendimento");
          fichaFormData.append("nomeDocumento", "Ficha de Atendimento");
          fichaFormData.append("pdfFile", fichaPdfBlob, "ficha-atendimento.pdf");

          await fetch("/api/medico/documentos/salvar", {
            method: "POST",
            body: fichaFormData,
          });
        }
      } catch (fichaError: any) {
        console.error("Erro ao gerar/salvar Ficha de Atendimento:", fichaError);
      }

      // Salvar documentos gerados
      if (documentosGerados.length > 0) {
        for (let i = 0; i < documentosGerados.length; i++) {
          const doc = documentosGerados[i];
          setSavingStep(`Salvando documento ${i + 1} de ${documentosGerados.length}...`);
          try {
            if (!doc.pdfBlob) continue;

            const formData = new FormData();
            formData.append("consultaId", consultaId);
            formData.append("tipoDocumento", doc.tipoDocumento);
            formData.append("nomeDocumento", doc.nomeDocumento);
            formData.append("pdfFile", doc.pdfBlob, `${doc.tipoDocumento}.pdf`);

            const docResponse = await fetch("/api/medico/documentos/salvar", {
              method: "POST",
              body: formData,
            });

            if (!docResponse.ok) {
              console.error(`Erro ao salvar documento: ${doc.nomeDocumento}`);
            }
          } catch (error: any) {
            console.error(`Erro ao salvar documento: ${doc.nomeDocumento}`, error);
          }
        }
      }

      // Limpar rascunho local após finalização bem-sucedida
      try { localStorage.removeItem(draftKey); } catch {}

      setSavingStep("Atendimento finalizado!");

      // Redirecionar para a fila de atendimento após um breve delay
      setTimeout(() => {
        router.push("/medico/fila-atendimento");
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar atendimento");
      console.error(error);
      setSaving(false);
      setSavingStep("");
    }
  };


  const formatTranscriptionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Lista completa de documentos disponíveis
  const documentModels = useMemo(() => [
    { id: "receita-medica", nome: "Receita Médica" },
    { id: "receita-controle-especial", nome: "Receita de Controle Especial" },
    { id: "atestado-afastamento", nome: "Atestado de Afastamento" },
    { id: "atestado-afastamento-cid", nome: "Atestado de Afastamento c/ CID" },
    { id: "atestado-afastamento-sem-cid", nome: "Atestado de Afastamento s/ CID" },
    { id: "atestado-afastamento-historico-cid", nome: "Atestado de Afastamento com Histórico de CID" },
    { id: "atestado-afastamento-indeterminado", nome: "Atestado de Afastamento Tempo Indeterminado" },
    { id: "atestado-aptidao-fisica-mental", nome: "Atestado de Aptidão Física e Mental" },
    { id: "atestado-aptidao-piscinas", nome: "Atestado de Aptidão para Frequentar Piscinas" },
    { id: "atestado-aptidao-fisica", nome: "Atestado de Aptidão Física" },
    { id: "declaracao-comparecimento-acompanhante", nome: "Declaração de Comparecimento (Acompanhante)" },
    { id: "declaracao-comparecimento-horario-cid", nome: "Declaração de Comparecimento de Horário c/ CID" },
    { id: "declaracao-comparecimento", nome: "Declaração de Comparecimento" },
    { id: "pedido-exames", nome: "Pedido de Exames" },
    { id: "justificativa-exames-plano", nome: "Justificativa de Exames para Planos de Saúde" },
    { id: "laudo-medico", nome: "Laudo Médico" },
    { id: "risco-cirurgico-cardiaco", nome: "Risco Cirúrgico Cardíaco" },
    { id: "guia-encaminhamento", nome: "Guia de Encaminhamento" },
    { id: "guia-consulta-tiss", nome: "Guia Consulta - SADT" },
    { id: "controle-diabetes-analitico", nome: "Controle de Diabetes Analítico" },
    { id: "controle-diabetes", nome: "Controle de Diabetes" },
    { id: "controle-pressao-arterial-analitico", nome: "Controle de Pressão Arterial Analítico" },
    { id: "controle-pressao-arterial", nome: "Controle de Pressão Arterial" },
  ], []);

  // Filtrar sugestões baseado no input
  useEffect(() => {
    if (documentoSearch.trim().length > 0) {
      const filtered = documentModels.filter(doc =>
        doc.nome.toLowerCase().includes(documentoSearch.toLowerCase())
      );
      setDocumentoSuggestions(filtered.slice(0, 5)); // Limitar a 5 sugestões
    } else {
      setDocumentoSuggestions([]);
    }
  }, [documentoSearch, documentModels]);

  const handleGenerateDocument = async (modelId: string, extraDados?: Record<string, any>, examesSolicitados?: ExameSolicitado[], prioridade?: PrioridadeTISS) => {
    // Abrir modal de configuração antes de gerar (exceto guia-tiss que tem modal próprio)
    if (modelId !== "guia-consulta-tiss" && !extraDados?._fromDocConfigModal) {
      setDocConfigModelId(modelId);
      setDocConfigOpts(prev => ({ ...prev, horaInicio: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo", hour12: false }).format(new Date()) }));
      // Para receitas, inicializar todos os medicamentos como selecionados
      if (modelId === "receita-medica" || modelId === "receita-controle-especial" || modelId === "receita-tipo-ba") {
        const prescricoesIA = analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [];
        const todasPrescricoes = [
          ...prescricoes,
          ...prescricoesIA.filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
        ].filter(p => p.medicamento && p.medicamento.trim() !== "");
        setDocMedicamentosSelecionados(new Set(todasPrescricoes.map((_, i) => i)));
      }
      // Para pedido de exames, inicializar todos os exames do box como selecionados
      if (modelId === "pedido-exames") {
        const examesIA = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)) || [];
        const totalExames = examesIA.length + examesManuais.length;
        setDocExamesSelecionados(new Set(Array.from({ length: totalExames }, (_, i) => i)));
      }
      setDocConfigModalOpen(true);
      return;
    }

    // Guia TISS: abrir modal primeiro para coletar exames
    if (modelId === "guia-consulta-tiss" && !examesSolicitados) {
      setTissModalOpen(true);
      return;
    }

    const documentModel = documentModels.find((m) => m.id === modelId);
    const nomeDocumento = documentModel?.nome || modelId;

    try {
      // Preparar dados para a API
      const requestData: any = {
        tipoDocumento: modelId,
        consultaId,
        dados: { ...extraDados },
      };

      // Adicionar prescrições se for receita (manuais + selecionadas da IA), filtrando pelos medicamentos selecionados no modal
      if (modelId === "receita-medica" || modelId === "receita-controle-especial" || modelId === "receita-tipo-ba") {
        const prescricoesIA = analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [];
        const todasPrescricoes = [
          ...prescricoes,
          ...prescricoesIA.filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
        ].filter(p => p.medicamento && p.medicamento.trim() !== "");
        // Filtrar apenas os medicamentos selecionados no modal de configuração
        const prescricoesFiltradas = todasPrescricoes.filter((_, i) => docMedicamentosSelecionados.has(i));
        if (prescricoesFiltradas.length > 0) {
          requestData.dados.prescricoes = prescricoesFiltradas;
        }
      }

      // Adicionar CID se necessário (não sobrescrever se já veio do modal da guia TISS)
      if (!requestData.dados.cidCodigo) {
        const selectedCidsList = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || [];
        if (selectedCidsList.length > 0) {
          requestData.dados.cidCodigo = selectedCidsList[0].code;
          requestData.dados.cidDescricao = selectedCidsList[0].description;
        }
      }

      // Adicionar exames solicitados (Guia TISS)
      if (modelId === "guia-consulta-tiss" && examesSolicitados && examesSolicitados.length > 0) {
        requestData.dados.examesSolicitados = examesSolicitados;
      }

      // Adicionar prioridade (Guia TISS)
      if (modelId === "guia-consulta-tiss" && prioridade) {
        requestData.dados.prioridade = prioridade;
      }

      // Chamar API para gerar o PDF
      const response = await fetch("/api/medico/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar documento");
      }

      // Obter o blob do PDF
      let pdfBlob = await response.blob();
      let assinado = false;

      // Assinar digitalmente inline se solicitado (com verificação prévia)
      if (extraDados?.assinarAposGerar) {
        const certCheck = await checkCertificado();
        if (!certCheck.configured) {
          toast.warning("Documento gerado, mas certificado digital não configurado. Acesse seu Perfil para carregar o certificado.");
        } else if (certCheck.expired) {
          toast.warning("Documento gerado, mas certificado digital expirado. Acesse seu Perfil para atualizar o certificado.");
        } else {
          try {
            const formData = new FormData();
            formData.append("consultaId", consultaId);
            formData.append("tipoDocumento", modelId);
            formData.append("nomeDocumento", nomeDocumento);
            formData.append("pdfFile", pdfBlob, `${modelId}.pdf`);
            const signRes = await fetch("/api/medico/documentos/assinar", { method: "POST", body: formData });
            if (signRes.ok) {
              pdfBlob = await signRes.blob();
              assinado = true;
              toast.success("Documento gerado e assinado digitalmente!");
            } else {
              toast.warning("Documento gerado, mas não foi possível assinar digitalmente.");
            }
          } catch {
            toast.warning("Documento gerado, mas não foi possível assinar digitalmente.");
          }
        }
      }

      // Adicionar à lista de documentos gerados
      const novoDocumento = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipoDocumento: modelId,
        nomeDocumento,
        createdAt: new Date().toISOString(),
        pdfBlob,
        assinado,
      };

      setDocumentosGerados([...documentosGerados, novoDocumento]);
      setDocumentoSearch("");
      setDocumentoSuggestions([]);
      if (!extraDados?.assinarAposGerar) toast.success("Documento adicionado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar documento:", error);
      toast.error(error.message || "Erro ao gerar documento");
    }
  };

  const handleTissConfirm = async (exames: ExameSolicitado[], dadosAdicionais?: GuiaSADTDadosAdicionais) => {
    setTissModalOpen(false);
    setTissGerandoGuia(true);
    try {
      await handleGenerateDocument("guia-consulta-tiss", {
        _fromDocConfigModal: true,
        numeroCarteirinha: dadosAdicionais?.numeroCarteirinha,
        cidCodigo: dadosAdicionais?.cidCodigo,
        indicacaoClinica: dadosAdicionais?.indicacaoClinica,
      }, exames, examesPrioridade);
    } finally {
      setTissGerandoGuia(false);
    }
  };

  const handleSelectDocument = (modelId: string) => {
    handleGenerateDocument(modelId);
  };

  const getPatientAllergies = (): string[] => {
    const alergiasRaw = consulta?.paciente?.alergias?.trim();
    if (!alergiasRaw) return [];
    return alergiasRaw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const getPatientMedicamentosEmUso = (): string[] => {
    const medRaw = consulta?.paciente?.medicamentosEmUso?.trim();
    if (!medRaw) return [];
    return medRaw
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!consulta) {
    return null;
  }

  const patient = {
    name: consulta.paciente.nome,
    age: calcularIdade(consulta.paciente.dataNascimento),
    id: consulta.paciente.numeroProntuario ? String(consulta.paciente.numeroProntuario).padStart(6, "0") : "N/A",
    phone: consulta.paciente.celular || consulta.paciente.telefone || "-",
    email: consulta.paciente.email || "-",
    bloodType: "Não informado", // Campo não disponível no schema atual
    allergies: getPatientAllergies(),
    medicamentosEmUsoList: getPatientMedicamentosEmUso(),
    lastVisit: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  };

  // Função para gerar cor do avatar
  const getAvatarColor = (name: string) => {
    const hue = (name.charCodeAt(0) * 47 + name.charCodeAt(name.length - 1) * 13) % 360;
    return {
      bg: `hsl(${hue}, 50%, 90%)`,
      text: `hsl(${hue}, 55%, 28%)`,
    };
  };

  const avatarColor = getAvatarColor(consulta.paciente.nome);
  const inicial = consulta.paciente.nome.trim().charAt(0).toUpperCase();
  const idade = calcularIdade(consulta.paciente.dataNascimento);
  const prontuarioLabel = consulta.paciente.numeroProntuario
    ? `Prontuário: ${String(consulta.paciente.numeroProntuario).padStart(6, "0")}`
    : "Prontuário: N/A";
  const hasAllergies = patient.allergies.length > 0;
  const hasMedicamentosEmUso = patient.medicamentosEmUsoList.length > 0;

  const vitalStatusDot: Record<string, string> = {
    normal: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  return (
    <div className="min-h-screen -mt-4 md:-mt-6 overflow-x-hidden" style={{ backgroundColor: 'var(--clinical-surface)' }}>
      {/* Novo box do cabeçalho */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-5 w-full">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden w-full min-w-0">
          {/* Corpo principal — layout em linhas */}
          <div className="px-5 py-4 space-y-3 overflow-hidden w-full min-w-0">
            {/* Estilo customizado para o avatar do paciente */}
            <style dangerouslySetInnerHTML={{
              __html: `
                #patient-avatar-${consulta.paciente.id} [class*="AvatarFallback"] {
                  background-color: ${avatarColor.bg} !important;
                  color: ${avatarColor.text} !important;
                }
              `
            }} />

            {/* Linha 1 — Avatar + Nome + Badges | Ações */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="flex-shrink-0" id={`patient-avatar-${consulta.paciente.id}`}>
                  <AvatarWithS3
                    avatar={consulta.paciente.usuario?.avatar || null}
                    alt={consulta.paciente.nome}
                    fallback={inicial}
                    className="w-14 h-14"
                    fallbackClassName="text-base font-bold select-none"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl font-bold text-slate-900 truncate">{consulta.paciente.nome}</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Em Atendimento
                    </Badge>
                    {isTelemedicina && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border flex-shrink-0">
                        <Video className="w-3 h-3" />
                        Telemedicina
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Prontuário */}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {prontuarioLabel}
                    </span>
                    {/* Idade */}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
                      {idade} anos
                    </span>
                    {/* Tipo de Consulta */}
                    {consulta.tipoConsulta && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {consulta.tipoConsulta.nome}
                      </span>
                    )}
                    {/* Convênio */}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      {(consulta as any).operadora
                        ? `${(consulta as any).operadora.nomeFantasia}${(consulta as any).planoSaude ? ` · ${(consulta as any).planoSaude.nome}` : ""}`
                        : "Particular"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações à direita */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Timer + Auto-save + Foco */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 tabular-nums">{sessionDuration}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="flex items-center gap-1">
                    {isFullscreen ? (
                      <Minimize2 className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Maximize2 className="w-3 h-3 text-muted-foreground" />
                    )}
                    <Switch
                      checked={isFullscreen}
                      onCheckedChange={toggleFocusMode}
                      className="scale-75"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumoClinicoDialogOpen(true)}
                  className="h-8 px-3 text-[11px] gap-1.5 border-blue-200 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 flex-shrink-0 font-semibold transition-colors rounded-lg"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Resumo Clínico do Prontuário
                </Button>

                {isTelemedicina && telemedicinaProps && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => telemedicinaProps.onToggleMic(!telemedicinaProps.isMicOn)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        telemedicinaProps.isMicOn
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                      title={telemedicinaProps.isMicOn ? "Mutar microfone" : "Ativar microfone"}
                    >
                      {telemedicinaProps.isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => telemedicinaProps.onToggleCamera(!telemedicinaProps.isCameraOn)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        telemedicinaProps.isCameraOn
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                      title={telemedicinaProps.isCameraOn ? "Desligar câmera" : "Ligar câmera"}
                    >
                      {telemedicinaProps.isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => telemedicinaProps.onToggleScreenSharing(!telemedicinaProps.isScreenSharing)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        telemedicinaProps.isScreenSharing
                          ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Compartilhar tela"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[10px] font-semibold ${
                      telemedicinaProps.connectionQuality === "excellent" ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                      telemedicinaProps.connectionQuality === "good" ? "bg-yellow-50 border-yellow-200 text-yellow-600" :
                      "bg-red-50 border-red-200 text-red-600"
                    }`}>
                      <Wifi className="w-3 h-3" />
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        telemedicinaProps.connectionQuality === "excellent" ? "bg-emerald-500" :
                        telemedicinaProps.connectionQuality === "good" ? "bg-yellow-500" : "bg-red-500"
                      }`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Telemedicina PiP — vídeo compacto do paciente */}
            {isTelemedicina && telemedicinaProps && (
              <div className="flex items-center gap-2">
                <div className="relative w-[180px] h-[120px] rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-lg flex-shrink-0">
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      telemedicinaProps.patientPresent
                        ? "bg-emerald-500/20"
                        : "bg-slate-700 animate-pulse"
                    }`}>
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1">
                      {telemedicinaProps.patientPresent ? "" : "Aguardando..."}
                    </span>
                  </div>
                  <video
                    ref={telemedicinaProps.remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-10"
                  />
                  <div className="absolute bottom-1.5 right-1.5 w-[52px] h-[36px] rounded-lg overflow-hidden bg-slate-800 border border-white/20 shadow-md z-20">
                    <video
                      ref={telemedicinaProps.localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`absolute top-1.5 left-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                    telemedicinaProps.patientPresent
                      ? "bg-emerald-500/90 text-white"
                      : "bg-slate-700/80 text-slate-300"
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${telemedicinaProps.patientPresent ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                    {telemedicinaProps.patientPresent ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            )}

            {/* Linha 2 — Sinais vitais + Alergias/Medicamentos (edição inline) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
              {/* Badge de Alergias */}
              {hasAllergies && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-200 bg-red-50 flex-shrink-0 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => setDadosSaudeDialogOpen(true)}
                  title="Editar alergias"
                >
                  <AlertCircle className="w-3 h-3 flex-shrink-0 text-red-600" />
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide whitespace-nowrap">Alergias:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badge de Medicamentos em uso */}
              {hasMedicamentosEmUso && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-200 bg-amber-50 flex-shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setDadosSaudeDialogOpen(true)}
                  title="Editar medicamentos em uso"
                >
                  <Pill className="w-3 h-3 flex-shrink-0 text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide whitespace-nowrap">Medicamentos:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {patient.medicamentosEmUsoList.map((m, i) => (
                      <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badge "Registrar" quando nenhum dado de saúde cadastrado */}
              {!hasAllergies && !hasMedicamentosEmUso && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 flex-shrink-0 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  onClick={() => setDadosSaudeDialogOpen(true)}
                  title="Registrar alergias e medicamentos"
                >
                  <AlertCircle className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">Sem alergias / medicamentos</span>
                  <span className="text-[10px] font-semibold text-blue-600 whitespace-nowrap">Registrar</span>
                </div>
              )}

              {vitals.map((v, i) => {
                const Icon = v.icon;
                const isDroplet = Icon === Droplet;
                const isEditing = sinaisVitaisFocusField === v.field;
                const isImc = v.field === "imc";
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border flex-shrink-0 transition-colors ${
                      isEditing
                        ? "border-blue-400 bg-blue-50"
                        : isImc
                        ? "bg-slate-50 border-slate-100"
                        : "bg-slate-50 border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                    }`}
                    onClick={() => { if (!isImc && !isEditing) setSinaisVitaisFocusField(v.field); }}
                    title={isImc ? "Calculado automaticamente" : `Editar ${v.label}`}
                  >
                    {!isDroplet && <Icon className={`w-3 h-3 flex-shrink-0 ${v.iconColor}`} />}
                    {isEditing && v.field === "pressaoSistolica" ? (
                      <input
                        autoFocus
                        type="text"
                        className="text-[11px] font-bold text-slate-800 tabular-nums leading-none bg-transparent outline-none w-16 min-w-0"
                        defaultValue={`${sinaisVitaisForm.pressaoSistolica}${sinaisVitaisForm.pressaoDiastolica ? `/${sinaisVitaisForm.pressaoDiastolica}` : ""}`}
                        placeholder="120/80"
                        onBlur={e => {
                          const parts = e.target.value.split("/");
                          const next = {
                            ...sinaisVitaisFormRef.current,
                            pressaoSistolica: parts[0]?.trim() ?? "",
                            pressaoDiastolica: parts[1]?.trim() ?? sinaisVitaisFormRef.current.pressaoDiastolica,
                          };
                          setVitaisForm(next);
                          setSinaisVitaisFocusField(null);
                          handleSaveSinaisVitais(next);
                        }}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        className="text-[11px] font-bold text-slate-800 tabular-nums leading-none bg-transparent outline-none w-14 min-w-0"
                        defaultValue={sinaisVitaisForm[v.field as keyof typeof sinaisVitaisForm] ?? ""}
                        placeholder={v.value === "-" ? "" : v.value}
                        onBlur={e => {
                          const next = { ...sinaisVitaisFormRef.current, [v.field]: e.target.value.trim() };
                          setVitaisForm(next);
                          setSinaisVitaisFocusField(null);
                          handleSaveSinaisVitais(next);
                        }}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-slate-800 tabular-nums leading-none whitespace-nowrap">{v.value}</span>
                    )}
                    <span className="text-[9px] text-slate-400 leading-none whitespace-nowrap">{v.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-4 px-4 lg:px-8 pt-5 pb-16 overflow-x-hidden w-full">
        {/* Zona 2 — Histórico do Paciente (colapsável) */}
        <PatientHistory
          isExpanded={isHistoryExpanded}
          onToggle={() => setIsHistoryExpanded((v) => !v)}
          historicoConsultas={historicoConsultas}
          loadingHistorico={loadingHistorico}
          examesAnexados={examesAnexados}
          expandedConsultas={expandedConsultas}
          onToggleConsulta={(id) =>
            setExpandedConsultas((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onViewDocumentos={(consultaId) => {
            handleViewFichaAtendimento(consultaId);
          }}
          onDownloadExame={handleDownloadExame}
          formatDate={formatDate}
        />

        {/* Zona 3 — Stepper de Progresso */}
        {(() => {
          const hasTranscription = isTranscribing || transcricaoFinalizada || transcription.length > 0;
          const hasAnamnese = !!(analysisResults?.anamnese || prontuario?.anamnese);
          const hasAnamnDiv = anamneseConfirmed || hasAnamnese;
          const hasDiag = (selectedCids.size > 0 || cidsManuais.length > 0 || prescricoes.length > 0 || selectedExamesAI.size > 0 || examesManuais.length > 0);
          const hasDocs = documentosGerados.length > 0;

          const steps = [
            { label: "Gravação", done: hasTranscription },
            { label: "Anamnese", done: hasAnamnDiv },
            { label: "Diagnóstico", done: hasDiag },
            { label: "Documentos", done: hasDocs },
          ];

          const currentStep = steps.findIndex(s => !s.done);
          const activeIdx = currentStep === -1 ? steps.length - 1 : currentStep;

          return (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-0 shadow-sm">
              {steps.map((step, i) => {
                const isCompleted = step.done;
                const isActive = i === activeIdx && !step.done;
                const isPending = !isCompleted && !isActive;
                return (
                  <div key={i} className="flex items-center flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-blue-600 text-white ring-2 ring-blue-200 ring-offset-1"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        {isCompleted ? (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors whitespace-nowrap ${
                        isCompleted ? "text-emerald-600" : isActive ? "text-blue-700 font-semibold" : "text-slate-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-3 min-w-[16px] transition-all ${
                        steps[i].done ? "bg-emerald-300" : "bg-slate-200"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Zona 4 — Consulta Atual (layout unificado presencial + telemedicina) */}
          <div className="grid grid-cols-10 gap-4 items-stretch w-full min-w-0">
            {/* Coluna Anamnese */}
            <div className="col-span-7 h-full flex flex-col min-w-0 overflow-x-hidden">
              <Step2Anamnesis
                isProcessing={isProcessing}
                analysisResults={analysisResults}
                prontuario={prontuario}
                setProntuario={setProntuario}
                editedAnamnese={editedAnamnese}
                setEditedAnamnese={setEditedAnamnese}
                isAnamneseEdited={isAnamneseEdited}
                setIsAnamneseEdited={setIsAnamneseEdited}
                isEditingAnamnese={isEditingAnamnese}
                setIsEditingAnamnese={setIsEditingAnamnese}
                anamneseConfirmed={anamneseConfirmed}
                onConfirmAnamnese={handleConfirmAnamnese}
                onAdvance={() => {}}
                isTranscribing={isTranscribing}
                startTranscription={startTranscription}
                transcriptionText={transcription
                  .filter((e) => !e.isPartial)
                  .map((e) => e.text)
                  .join(" ") || transcription.map((e) => e.text).join(" ")}
              />
            </div>

            {/* Sidebar IA */}
            <div className="col-span-3 min-w-0 overflow-x-hidden self-start">
              <AISidebar
                  isProcessing={isProcessing}
                  analysisResults={analysisResults}
                  prontuario={prontuario}
                  examesAnexados={examesAnexados}
                  selectedExams={examesParaIA}
                  setSelectedExams={setExamesParaIA}
                  historicoConsultas={historicoConsultas}
                  medicamentosEmUso={medicamentosEmUso}
                  selectedCids={selectedCids}
                  setSelectedCids={setSelectedCids}
                  cidsManuais={cidsManuais}
                  setCidsManuais={setCidsManuais}
                  setCidDialogOpen={setCidDialogOpen}
                  setCidSearchDialogOpen={setCidSearchDialogOpen}
                  selectedExamesAI={selectedExamesAI}
                  setSelectedExamesAI={setSelectedExamesAI}
                  examesManuais={examesManuais}
                  setExamesManuais={setExamesManuais}
                  setExameDialogOpen={setExameDialogOpen}
                  setExameSearchDialogOpen={setExameSearchDialogOpen}
                  prescricoes={prescricoes}
                  setPrescricoes={setPrescricoes}
                  selectedPrescricoesAI={selectedPrescricoesAI}
                  setSelectedPrescricoesAI={setSelectedPrescricoesAI}
                  setMedicamentoDialogOpen={setMedicamentoDialogOpen}
                  selectedPrescricaoIndex={selectedPrescricaoIndex}
                  setSelectedPrescricaoIndex={setSelectedPrescricaoIndex}
                  orientacoes={orientacoes}
                  setOrientacoes={setOrientacoes}
                  allergies={patient.allergies}
                  documentModels={documentModels}
                  documentosGerados={documentosGerados}
                  handleGenerateDocument={handleGenerateDocument}
                  onSignDocument={handleSignDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onGenerateSuggestions={handleGenerateSuggestions}
                  consultationMode={consultationMode}
                  historicoClinico={historicoClinico}
                  onRepetirItens={handleRepetirItens}
                  onAttachExame={() => setUploadDialogOpen(true)}
                  isTelemedicina={isTelemedicina}
                  chatMessages={telemedicinaProps?.chatMessages}
                  onSendMessage={telemedicinaProps?.onSendMessage}
                  cidAlertVisible={cidAlertVisible}
                />
            </div>
          </div>
      </div>

      {/* ── Barra de ações fixada no bottom ── */}
      <div
        className="fixed bottom-0 right-0 z-[15] bg-white/90 backdrop-blur-sm border-t border-slate-200 transition-[left] duration-200"
        style={{ left: !isMobile && sidebarOpen ? "var(--sidebar-width)" : "0" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-2.5 flex items-center justify-end gap-2 w-full min-w-0 overflow-x-hidden mr-[60px]">
          <button
            onClick={handlePreviewFicha}
            disabled={loadingFichaPreview}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-50 shadow-sm"
          >
            {loadingFichaPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5 text-slate-500" />}
            Ficha de Atendimento
          </button>


          {isTelemedicina && telemedicinaProps ? (
            <button
              onClick={telemedicinaProps.onEncerrar}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-all bg-red-600 hover:bg-red-700 shadow-sm"
            >
              <PhoneIcon className="w-3.5 h-3.5 rotate-[135deg]" />
              Encerrar Consulta
            </button>
          ) : (
            <button
              onClick={() => {
                const cidsIA = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)) || [];
                const allCids = [...cidsIA, ...cidsManuais];
                if (allCids.length === 0) {
                  setCidAlertVisible(true);
                  setTimeout(() => setCidAlertVisible(false), 3000);
                  return;
                }
                setFinalizarModalOpen(true);
              }}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563eb 100%)" }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saving ? "Salvando..." : "Finalizar Atendimento"}
            </button>
          )}
        </div>
      </div>

      {/* Painel de chat flutuante + pill (mutuamente exclusivos) */}
      {consultationMode === 'ai' && (
        <>
          <TranscriptionChatPanel
            isTranscribing={isTranscribing}
            isPreparing={isPreparing}
            isPaused={isPaused}
            transcription={transcription}
            sessionDuration={sessionDuration}
            pauseTranscription={pauseTranscription}
            resumeTranscription={resumeTranscription}
            stopTranscription={stopTranscription}
            setTranscricaoFinalizada={setTranscricaoFinalizada}
            setIsMicrophoneSelectorOpen={setIsMicrophoneSelectorOpen}
            minimized={chatMinimized}
            setMinimized={setChatMinimized}
          />
          <TranscriptionBar
            isTranscribing={isTranscribing}
            isPreparing={isPreparing}
            isPaused={isPaused}
            transcricaoFinalizada={transcricaoFinalizada}
            hasAnamnese={!!(analysisResults?.anamnese || prontuario?.anamnese)}
            isProcessing={isProcessing}
            stoppedUnexpectedly={stoppedUnexpectedly}
            sessionDuration={sessionDuration}
            pauseTranscription={pauseTranscription}
            resumeTranscription={resumeTranscription}
            stopTranscription={stopTranscription}
            setTranscricaoFinalizada={setTranscricaoFinalizada}
            setIsMicrophoneSelectorOpen={setIsMicrophoneSelectorOpen}
            onProcessAndAdvance={handleStep1Complete}
            startTranscription={startTranscription}
            chatMinimized={chatMinimized}
            onExpandChat={() => setChatMinimized(false)}
          />
        </>
      )}


      {/* ====== MODAL: CONFIGURAR DOCUMENTO ====== */}
      {(() => {
        const nomeDoc = documentModels.find(m => m.id === docConfigModelId)?.nome || docConfigModelId;
        const id = docConfigModelId;
        const opts = docConfigOpts;
        const set = (patch: Partial<typeof docConfigOpts>) => setDocConfigOpts(o => ({ ...o, ...patch }));

        const hasDias = ["atestado-afastamento","atestado-afastamento-sem-cid","atestado-afastamento-cid"].includes(id);
        const hasObs = id.startsWith("atestado-") || id.startsWith("declaracao-");
        const hasValidade = ["atestado-aptidao-fisica-mental","atestado-aptidao-piscinas","atestado-aptidao-fisica"].includes(id);
        const hasHorario = id.startsWith("declaracao-comparecimento");
        const hasAcomp = ["declaracao-comparecimento-acompanhante","declaracao-comparecimento-horario-cid"].includes(id);
        const hasUfValidade = id === "receita-controle-especial";
        const hasConvenio = id === "justificativa-exames-plano";
        const hasTextoLivre = id === "laudo-medico";
        const isPedidoExames = id === "pedido-exames";
        const examesIABox = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || [];
        const examesBox: Array<{ nome: string; tipo: string | null }> = isPedidoExames
          ? [...examesIABox, ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo }))]
          : [];
        const isReceita = id === "receita-medica" || id === "receita-controle-especial" || id === "receita-tipo-ba";
        const medicamentosReceita = isReceita ? (() => {
          const prescricoesIA = analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [];
          return [
            ...prescricoes,
            ...prescricoesIA.filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
          ].filter(p => p.medicamento && p.medicamento.trim() !== "");
        })() : [];
        const hasSpecific = hasDias || hasObs || hasValidade || hasHorario || hasAcomp || hasUfValidade || hasConvenio || hasTextoLivre || isReceita || isPedidoExames;

        return (
          <Dialog open={docConfigModalOpen} onOpenChange={setDocConfigModalOpen}>
            <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
              <DialogTitle className="sr-only">Configurar {nomeDoc}</DialogTitle>
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{nomeDoc}</p>
                <p className="text-xs text-slate-400 mt-0.5">Configure as opções antes de gerar</p>
              </div>

              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* ── Campos específicos do documento ── */}
                {hasSpecific && (
                  <>
                    {isReceita && medicamentosReceita.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-500 font-medium">Medicamentos a incluir na receita</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (docMedicamentosSelecionados.size === medicamentosReceita.length) {
                                setDocMedicamentosSelecionados(new Set());
                              } else {
                                setDocMedicamentosSelecionados(new Set(medicamentosReceita.map((_, i) => i)));
                              }
                            }}
                            className="text-[10px] text-[#1E40AF] hover:text-[#1e3a8a] font-medium"
                          >
                            {docMedicamentosSelecionados.size === medicamentosReceita.length ? "Desmarcar todos" : "Selecionar todos"}
                          </button>
                        </div>
                        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {medicamentosReceita.map((med, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <Checkbox
                                checked={docMedicamentosSelecionados.has(idx)}
                                onCheckedChange={(checked) => {
                                  setDocMedicamentosSelecionados(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(idx);
                                    else next.delete(idx);
                                    return next;
                                  });
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">{med.medicamento}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {[med.dosagem, med.posologia, med.duracao].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        {docMedicamentosSelecionados.size === 0 && (
                          <p className="text-[10px] text-amber-600 mt-1.5">Selecione ao menos um medicamento para gerar a receita.</p>
                        )}
                      </div>
                    )}
                    {isReceita && medicamentosReceita.length === 0 && (
                      <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">Nenhum medicamento prescrito neste atendimento. Adicione prescrições antes de gerar a receita.</p>
                      </div>
                    )}
                    {hasDias && (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Dias de afastamento</p>
                        </div>
                        <input
                          type="number" min={1} max={365}
                          value={opts.diasAfastamento}
                          onChange={e => set({ diasAfastamento: Number(e.target.value) })}
                          className="w-20 text-center text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {hasValidade && (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-slate-700">Validade (meses)</p>
                        <input
                          type="number" min={1} max={24} placeholder="—"
                          value={opts.mesesValidade}
                          onChange={e => set({ mesesValidade: e.target.value })}
                          className="w-20 text-center text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {hasHorario && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Hora início</p>
                          <input type="time" value={opts.horaInicio} onChange={e => set({ horaInicio: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Hora fim</p>
                          <input type="time" value={opts.horaFim} onChange={e => set({ horaFim: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      </div>
                    )}
                    {hasAcomp && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Nome do acompanhante</p>
                        <input type="text" placeholder="Nome completo" value={opts.nomeAcompanhante} onChange={e => set({ nomeAcompanhante: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    )}
                    {hasUfValidade && (
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <p className="text-xs text-slate-500 mb-1">UF</p>
                          <input type="text" maxLength={2} placeholder="SP" value={opts.uf} onChange={e => set({ uf: e.target.value.toUpperCase() })}
                            className="w-full text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Data validade</p>
                          <input type="date" value={opts.dataValidade} onChange={e => set({ dataValidade: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      </div>
                    )}
                    {hasConvenio && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Convênio</p>
                          <input type="text" placeholder="Nome do plano" value={opts.convenio} onChange={e => set({ convenio: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Justificativa</p>
                          <textarea rows={3} placeholder="Justificativa clínica..." value={opts.justificativa} onChange={e => set({ justificativa: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                        </div>
                      </div>
                    )}
                    {hasObs && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Observações <span className="text-slate-300">(opcional)</span></p>
                        <textarea rows={2} placeholder="Observações adicionais..." value={opts.observacoes} onChange={e => set({ observacoes: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Opções gerais</p>
                    </div>
                  </>
                )}

                {/* ── Opções comuns ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Exibir CPF do paciente</p>
                    <p className="text-xs text-slate-400 mt-0.5">Imprime o CPF no documento</p>
                  </div>
                  <Switch checked={opts.cpf} onCheckedChange={v => set({ cpf: v })} />
                </div>
                <div className="border-t border-slate-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Exibir endereço do paciente</p>
                    <p className="text-xs text-slate-400 mt-0.5">Imprime o endereço cadastrado</p>
                  </div>
                  <Switch checked={opts.endereco} onCheckedChange={v => set({ endereco: v })} />
                </div>
                <div className="border-t border-slate-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Assinar digitalmente</p>
                    <p className="text-xs text-slate-400 mt-0.5">Aplica certificado digital ao PDF</p>
                  </div>
                  <Switch checked={opts.assinar} onCheckedChange={async (v) => {
                    if (v) {
                      const cert = await checkCertificado();
                      if (!cert.configured) {
                        toast.error("Certificado digital não configurado. Acesse seu Perfil para carregar o certificado (.pfx/.p12) antes de assinar.");
                        return;
                      }
                      if (cert.expired) {
                        toast.error("Certificado digital expirado. Acesse seu Perfil para atualizar o certificado.");
                        return;
                      }
                    }
                    set({ assinar: v });
                  }} />
                </div>

                {hasTextoLivre && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Texto do Laudo</p>
                      <textarea rows={5} placeholder="Digite o conteúdo do laudo médico..."
                        value={opts.textoLivre} onChange={e => { if (e.target.value.length <= 1000) set({ textoLivre: e.target.value }); }}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                      <p className="text-[10px] text-slate-400 mt-1 text-right">{opts.textoLivre.length}/1000</p>
                    </div>
                  </>
                )}

                {isPedidoExames && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500 font-medium">Exames a incluir no pedido</p>
                        {examesBox.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (docExamesSelecionados.size === examesBox.length) {
                                setDocExamesSelecionados(new Set());
                              } else {
                                setDocExamesSelecionados(new Set(examesBox.map((_, i) => i)));
                              }
                            }}
                            className="text-[10px] text-[#1E40AF] hover:text-[#1e3a8a] font-medium"
                          >
                            {docExamesSelecionados.size === examesBox.length ? "Desmarcar todos" : "Selecionar todos"}
                          </button>
                        )}
                      </div>
                      {examesBox.length === 0 ? (
                        <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700">Nenhum exame no box "Exames". Adicione exames no atendimento antes de gerar o pedido.</p>
                        </div>
                      ) : (
                        <>
                          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                            {examesBox.map((ex, idx) => (
                              <label
                                key={idx}
                                className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <Checkbox
                                  checked={docExamesSelecionados.has(idx)}
                                  onCheckedChange={(checked) => {
                                    setDocExamesSelecionados(prev => {
                                      const next = new Set(prev);
                                      if (checked) next.add(idx);
                                      else next.delete(idx);
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-700 truncate">{ex.nome}</p>
                                  {ex.tipo && (
                                    <p className="text-[10px] text-slate-400 truncate">{ex.tipo}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                          {docExamesSelecionados.size === 0 && (
                            <p className="text-[10px] text-amber-600 mt-1.5">Selecione ao menos um exame para gerar o pedido.</p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <button onClick={() => setDocConfigModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 font-medium rounded-lg hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                <button
                  disabled={
                    (hasTextoLivre && opts.textoLivre.trim().length === 0) ||
                    (isReceita && docMedicamentosSelecionados.size === 0) ||
                    (isPedidoExames && (examesBox.length === 0 || docExamesSelecionados.size === 0))
                  }
                  onClick={() => {
                    setDocConfigModalOpen(false);
                    const examesSelecionadosTexto = isPedidoExames
                      ? examesBox
                          .filter((_, i) => docExamesSelecionados.has(i))
                          .map((ex, i) => `${i + 1}. ${ex.nome}`)
                          .join("\n")
                      : undefined;
                    handleGenerateDocument(docConfigModelId, {
                      _fromDocConfigModal: true,
                      ocultarCpf: !opts.cpf,
                      incluirEndereco: opts.endereco,
                      assinarAposGerar: opts.assinar,
                      diasAfastamento: opts.diasAfastamento,
                      observacoes: opts.observacoes || undefined,
                      mesesValidade: opts.mesesValidade ? Number(opts.mesesValidade) : undefined,
                      horaInicio: opts.horaInicio || undefined,
                      horaFim: opts.horaFim || undefined,
                      nomeAcompanhante: opts.nomeAcompanhante || undefined,
                      uf: opts.uf || undefined,
                      dataValidade: opts.dataValidade || undefined,
                      convenio: opts.convenio || undefined,
                      justificativa: opts.justificativa || undefined,
                      textoLaudo: isPedidoExames ? examesSelecionadosTexto : (opts.textoLivre || undefined),
                    });
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563eb 100%)" }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Gerar Documento
                </button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ====== MODAL: RESUMO PRÉ-FINALIZAÇÃO ====== */}
      <Dialog open={finalizarModalOpen} onOpenChange={setFinalizarModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">Resumo pré-finalização do atendimento</DialogTitle>
          {(() => {
            const cidsIA = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)) || [];
            const allCids = [...cidsIA, ...cidsManuais];
            const examesIA = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)) || [];
            const allExames = [...examesIA, ...examesManuais];
            const prescricoesIA = analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [];
            const allRx = [...prescricoes, ...prescricoesIA.filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento))];
            const temReceita = documentosGerados.some(d => d.tipoDocumento?.includes("receita"));
            const temDocumento = documentosGerados.length > 0;

            // Montar lista de avisos
            const avisos: Array<{ nivel: "erro" | "aviso" | "info"; texto: string }> = [];
            if (allCids.length === 0) avisos.push({ nivel: "erro", texto: "Nenhum diagnóstico (CID-10) registrado" });
            if (allRx.length > 0 && !temReceita) avisos.push({ nivel: "aviso", texto: "Há prescrições mas nenhuma receita foi gerada" });
            if (allRx.length === 0) avisos.push({ nivel: "info", texto: "Nenhuma prescrição adicionada" });
            if (allExames.length === 0) avisos.push({ nivel: "info", texto: "Nenhum exame solicitado" });
            if (!temDocumento) avisos.push({ nivel: "aviso", texto: "Nenhum documento gerado" });

            const erros = avisos.filter(a => a.nivel === "erro");
            const alertas = avisos.filter(a => a.nivel === "aviso");
            const infos = avisos.filter(a => a.nivel === "info");
            const totalAvisos = erros.length + alertas.length;
            const tudoOk = totalAvisos === 0;

            return (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">Resumo do atendimento</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tudoOk
                      ? "Tudo certo. Confirme para finalizar."
                      : `${totalAvisos} pend${totalAvisos > 1 ? "ências" : "ência"} encontrada${totalAvisos > 1 ? "s" : ""}. Você ainda pode finalizar.`}
                  </p>
                </div>

                <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">

                  {/* Status da anamnese */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    (editedAnamnese || prontuario?.anamnese)
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    {(editedAnamnese || prontuario?.anamnese) ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${
                      (editedAnamnese || prontuario?.anamnese) ? "text-emerald-700" : "text-red-600"
                    }`}>
                      {(editedAnamnese || prontuario?.anamnese) ? "Anamnese registrada" : "Anamnese não registrada"}
                    </span>
                  </div>

                  {/* Resumo compacto com detalhes */}
                  <div className="space-y-2">
                    {/* CIDs */}
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <Stethoscope className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${allCids.length > 0 ? "text-slate-500" : "text-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-700">Diagnósticos (CID-10)</p>
                          <span className={`text-xs font-bold ${allCids.length > 0 ? "text-slate-800" : "text-slate-300"}`}>{allCids.length}</span>
                        </div>
                        {allCids.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {allCids.slice(0, 3).map(c => c.code).join(", ")}
                            {allCids.length > 3 && ` + ${allCids.length - 3} mais`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Exames */}
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <FileText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${allExames.length > 0 ? "text-slate-500" : "text-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-700">Exames solicitados</p>
                          <span className={`text-xs font-bold ${allExames.length > 0 ? "text-slate-800" : "text-slate-300"}`}>{allExames.length}</span>
                        </div>
                        {allExames.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {allExames.slice(0, 3).map(e => e.nome).join(", ")}
                            {allExames.length > 3 && ` + ${allExames.length - 3} mais`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prescrições */}
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <Pill className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${allRx.length > 0 ? "text-slate-500" : "text-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-700">Prescrições</p>
                          <span className={`text-xs font-bold ${allRx.length > 0 ? "text-slate-800" : "text-slate-300"}`}>{allRx.length}</span>
                        </div>
                        {allRx.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {allRx.slice(0, 3).map(r => r.medicamento).join(", ")}
                            {allRx.length > 3 && ` + ${allRx.length - 3} mais`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Documentos */}
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <FileCheck className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${documentosGerados.length > 0 ? "text-slate-500" : "text-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-700">Documentos gerados</p>
                          <span className={`text-xs font-bold ${documentosGerados.length > 0 ? "text-slate-800" : "text-slate-300"}`}>{documentosGerados.length}</span>
                        </div>
                        {documentosGerados.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {documentosGerados.slice(0, 3).map(d => d.nomeDocumento).join(", ")}
                            {documentosGerados.length > 3 && ` + ${documentosGerados.length - 3} mais`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avisos */}
                  {avisos.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {avisos.map((a, i) => (
                        <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                          <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${a.nivel === "erro" ? "bg-red-400" : a.nivel === "aviso" ? "bg-amber-400" : "bg-slate-300"}`} />
                          <span className="text-xs text-slate-500">{a.texto}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setFinalizarModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Voltar e Revisar
                  </button>
                  <button
                    onClick={() => {
                      setFinalizarModalOpen(false);
                      setRetornoModalOpen(true);
                    }}
                    disabled={saving || allCids.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563eb 100%)" }}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {allCids.length === 0 ? "Selecione ao menos 1 CID" : erros.length > 0 || alertas.length > 0 ? "Finalizar mesmo assim" : "Confirmar e Finalizar"}
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ====== DIALOG: RETORNO DO PACIENTE ====== */}
      <Dialog open={retornoModalOpen} onOpenChange={(open) => {
        if (!open && !saving) {
          // Se fechar sem confirmar, finaliza sem retorno
          setRetornoAgendado(false);
          setRetornoModalOpen(false);
          handleFinalizarAtendimento();
        }
      }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">Retorno do paciente</DialogTitle>

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-slate-800">Retorno do Paciente</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Defina se o paciente precisa retornar para consulta de acompanhamento.</p>
          </div>

          {/* Content */}
          <div className="px-5 py-5 space-y-5">
            {/* Switch retorno */}
            <div className="flex items-center justify-between">
              <Label htmlFor="retorno-switch" className="text-sm text-slate-700 font-medium">Haverá retorno?</Label>
              <Switch
                id="retorno-switch"
                checked={retornoAgendado}
                onCheckedChange={setRetornoAgendado}
              />
            </div>

            {/* Dias de retorno */}
            {retornoAgendado && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="retorno-dias" className="text-sm text-slate-700 font-medium">Retorno em quantos dias?</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="retorno-dias"
                    type="number"
                    min={1}
                    max={365}
                    value={retornoDias}
                    onChange={(e) => setRetornoDias(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-slate-500">dias</span>
                </div>
                {/* Atalhos rápidos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[7, 15, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRetornoDias(d)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        retornoDias === d
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setRetornoAgendado(false);
                setRetornoModalOpen(false);
                handleFinalizarAtendimento();
              }}
              disabled={saving}
              className="px-4 py-2 text-xs text-slate-500 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Pular
            </button>
            <button
              onClick={() => {
                setRetornoModalOpen(false);
                handleFinalizarAtendimento();
              }}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563eb 100%)" }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Finalizar Atendimento
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Processamento */}
      <ProcessingModal
        isOpen={isProcessing}
        stage={processingStage}
        context={processingContext}
        examesCount={0}
        imagensCount={0}
      />


      {/* Microphone Selector Modal */}
      <DocumentosConsultaDialog
        isOpen={documentosDialogOpen}
        onClose={() => {
          setDocumentosDialogOpen(false);
          setSelectedConsultaForDocumentos(null);
          setSelectedConsultaDataForDocumentos(null);
        }}
        consultaId={selectedConsultaForDocumentos || ""}
        consultaData={selectedConsultaDataForDocumentos || undefined}
      />

      {/* Modal Dados de Saúde (Alergias / Medicamentos em uso) */}
      {consulta?.paciente?.id && (
        <DadosSaudeDialog
          open={dadosSaudeDialogOpen}
          onOpenChange={setDadosSaudeDialogOpen}
          pacienteId={consulta.paciente.id}
          initialAlergias={consulta.paciente.alergias ?? null}
          initialMedicamentosEmUso={consulta.paciente.medicamentosEmUso ?? null}
          onSaved={({ alergias, medicamentosEmUso }) => {
            setConsulta((prev) =>
              prev
                ? {
                    ...prev,
                    paciente: {
                      ...prev.paciente,
                      alergias,
                      medicamentosEmUso,
                    },
                  }
                : prev
            );
          }}
        />
      )}

      {/* Modal Guia Consulta TISS — coleta exames antes de gerar */}
      <GuiaTissExamesModal
        key={tissModalOpen ? "tiss-open" : "tiss-closed"}
        isOpen={tissModalOpen}
        onClose={() => setTissModalOpen(false)}
        onConfirm={handleTissConfirm}
        isLoading={tissGerandoGuia}
        cidSelecionado={
          (analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i))?.[0]?.code) ||
          ([...selectedCidsCatalogoIds].length > 0 ? undefined : undefined)
        }
        examesDisponiveis={[
          ...(analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)) ?? []),
          ...examesManuais.map((e) => ({
            nome: e.nome,
            tipo: e.tipo || "Outros",
            justificativa: "",
            codigoTussId: e.codigoTussId,
            codigoTuss: e.codigoTuss,
          })),
        ]}
      />
      <MicrophoneSelectorModal
        isOpen={isMicrophoneSelectorOpen}
        onClose={() => setIsMicrophoneSelectorOpen(false)}
        onSelect={(deviceId) => {
          setSelectedMicrophoneId(deviceId);
          // Aqui você pode passar o deviceId para o hook de transcrição
          console.log("Microfone selecionado:", deviceId);
        }}
        currentDeviceId={selectedMicrophoneId}
      />

      {/* Modal de Resumo Clínico */}
      <Dialog open={resumoClinicoDialogOpen} onOpenChange={setResumoClinicoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-blue-600" />
              Resumo Clínico - {patient.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {!resumoClinico && !gerandoResumoClinico && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileTextIcon className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Gerar Resumo Clínico
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md">
                  A IA irá analisar todo o histórico do paciente, incluindo consultas, exames, prescrições, alergias e prontuários para gerar um resumo clínico completo.
                </p>
                <Button
                  onClick={handleGerarResumoClinico}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Resumo com IA
                </Button>
              </div>
            )}

            {gerandoResumoClinico && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <p className="text-sm text-slate-600">
                  Analisando histórico do paciente e gerando resumo clínico...
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Isso pode levar alguns segundos
                </p>
              </div>
            )}

            {resumoClinico && !gerandoResumoClinico && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">
                    Resumo gerado pela IA com base em todo o histórico do paciente
                  </p>
                  <Button
                    onClick={handleGerarResumoClinico}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Regenerar
                  </Button>
                </div>
                <ScrollArea className="flex-1 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                      {resumoClinico}
                    </pre>
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Seleção de Medicamentos */}
      <Dialog open={medicamentoDialogOpen} onOpenChange={(open) => {
        setMedicamentoDialogOpen(open);
        if (!open) {
          setActiveMedicamentoTab("medicamentos");
          setMedicamentoSearch("");
          setPendingMedicamento(null);
        }
      }}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {pendingMedicamento ? "Detalhar Prescrição" : "Selecionar Medicamento ou Manipulado"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Passo 2: formulário de posologia ── */}
          {pendingMedicamento && (
            <div className="flex flex-col gap-5 flex-1 overflow-y-auto py-2 px-1">
              {pendingMedicamento.manual ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome do Medicamento</label>
                  <Input
                    placeholder="Digite o nome do medicamento ou manipulado"
                    value={pendingMedicamento.nome}
                    onChange={(e) => setPendingMedicamento((p) => p ? { ...p, nome: e.target.value } : p)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                  <Pill className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-800 truncate">{pendingMedicamento.nome}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Dosagem</label>
                  <Input
                    placeholder="Ex: 500mg, 10ml"
                    value={pendingMedicamento.dosagem}
                    onChange={(e) => setPendingMedicamento((p) => p ? { ...p, dosagem: e.target.value } : p)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantidade</label>
                  <Input
                    placeholder="Ex: 30 comprimidos, 1 caixa"
                    value={pendingMedicamento.duracao}
                    onChange={(e) => setPendingMedicamento((p) => p ? { ...p, duracao: e.target.value } : p)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Posologia</label>
                <textarea
                  placeholder="Ex: Tomar 1 comprimido a cada 8 horas, após as refeições"
                  value={pendingMedicamento.posologia}
                  onChange={(e) => setPendingMedicamento((p) => p ? { ...p, posologia: e.target.value } : p)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPendingMedicamento(null)}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
                  onClick={handleConfirmPendingMedicamento}
                  disabled={pendingMedicamento.manual && !pendingMedicamento.nome.trim()}
                >
                  Confirmar Prescrição
                </Button>
              </div>
            </div>
          )}

          {/* ── Passo 1: seleção de medicamento ── */}
          {!pendingMedicamento && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3">
            <Tabs value={activeMedicamentoTab} onValueChange={(value) => {
              const newTab = value as "medicamentos" | "manipulados";
              setActiveMedicamentoTab(newTab);
              setMedicamentoSearch("");
              // Buscar imediatamente ao mudar de aba
              if (newTab === "medicamentos") {
                fetchMedicamentos();
              } else {
                fetchManipulados();
              }
            }} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
                <TabsTrigger value="manipulados">Manipulados</TabsTrigger>
              </TabsList>

              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={activeMedicamentoTab === "medicamentos"
                    ? "Buscar medicamento por nome, princípio ativo ou laboratório..."
                    : "Buscar manipulado por descrição..."}
                  value={medicamentoSearch}
                  onChange={(e) => setMedicamentoSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <TabsContent value="medicamentos" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <ScrollArea className="flex-1 border rounded-lg min-h-0 h-full">
                  {loadingMedicamentos ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : medicamentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <Pill className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">Nenhum medicamento encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {medicamentoSearch ? "Tente uma busca diferente" : "Digite para buscar medicamentos cadastrados"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {medicamentos.map((med) => (
                        <button
                          key={med.id}
                          onClick={() => handlePreSelectMedicamento(med)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors relative"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{med.nome}</p>
                              <div className={`flex flex-wrap gap-2 mt-1 ${med.controle ? "pr-24" : ""}`}>
                                {med.principioAtivo && (
                                  <span className="text-xs text-slate-500">Princípio: {med.principioAtivo}</span>
                                )}
                                {med.laboratorio && (
                                  <span className="text-xs text-slate-500">Lab: {med.laboratorio}</span>
                                )}
                                {med.concentracao && med.unidade && (
                                  <span className="text-xs text-slate-500">{med.concentracao}{med.unidade}</span>
                                )}
                                {med.apresentacao && (
                                  <span className="text-xs text-slate-500">{med.apresentacao}</span>
                                )}
                              </div>
                            </div>
                            <Pill className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          </div>
                          {med.controle && (
                            <span className={`absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded border ${getTarjaBadgeClass(med.controle)}`}>
                              {med.controle}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="manipulados" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <ScrollArea className="flex-1 border rounded-lg min-h-0 h-full">
                  {loadingManipulados ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : manipulados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <Pill className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">Nenhum manipulado encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {medicamentoSearch ? "Tente uma busca diferente" : "Digite para buscar manipulados cadastrados"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {manipulados.map((manipulado) => (
                        <button
                          key={manipulado.id}
                          onClick={() => handlePreSelectManipulado(manipulado)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{manipulado.descricao}</p>
                              {manipulado.informacoes && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{manipulado.informacoes}</p>
                              )}
                            </div>
                            <Pill className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          )}
          {!pendingMedicamento && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-shrink-0">
            <button
              onClick={() => {
                setPendingMedicamento({
                  nome: "",
                  dosagem: "",
                  posologia: "",
                  duracao: "",
                  manual: true,
                });
              }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1.5 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar manualmente
            </button>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Upload de Exame */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Anexar Exame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Categoria
              </label>
              <Select
                value={categoriaExame}
                onValueChange={(v) => setCategoriaExame(v as "Laboratorial" | "Imagem" | "Outros")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laboratorial">Laboratorial</SelectItem>
                  <SelectItem value="Imagem">Imagem</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-slate-400">
                Os arquivos serão renomeados automaticamente (ex: {categoriaExame || "Categoria"} 001, 002, ...)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Arquivos (Imagem ou PDF)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const maxSize = 30 * 1024 * 1024; // 30MB por arquivo
                    const validos: File[] = [];
                    const rejeitados: string[] = [];
                    for (const f of files) {
                      if (f.size > maxSize) {
                        rejeitados.push(f.name);
                      } else {
                        validos.push(f);
                      }
                    }
                    if (rejeitados.length > 0) {
                      toast.error(
                        `${rejeitados.length} arquivo(s) excedem 30 MB e foram ignorados: ${rejeitados.slice(0, 3).join(", ")}`
                      );
                    }
                    setArquivosExame(validos);
                    e.target.value = "";
                  }}
                  className="hidden"
                  id="exame-file-input"
                />
                <label
                  htmlFor="exame-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FilePlus className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {arquivosExame.length > 0
                      ? `${arquivosExame.length} arquivo(s) selecionado(s)`
                      : "Clique para selecionar arquivos"}
                  </span>
                  <span className="text-xs text-slate-400">
                    JPEG, PNG, WebP ou PDF (máx. 30MB por arquivo)
                  </span>
                </label>
              </div>
              {arquivosExame.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {arquivosExame.map((arquivo, idx) => (
                    <div
                      key={`${arquivo.name}-${idx}`}
                      className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded px-2 py-1"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1">{arquivo.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        ({(arquivo.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setArquivosExame((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-500 flex-shrink-0"
                        aria-label="Remover arquivo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setCategoriaExame("");
                setArquivosExame([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadExame}
              disabled={uploadingExame || !categoriaExame || arquivosExame.length === 0}
            >
              {uploadingExame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : arquivosExame.length > 1 ? (
                `Anexar ${arquivosExame.length} Exames`
              ) : (
                "Anexar Exame"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar CID-10 */}
      <Dialog open={cidDialogOpen} onOpenChange={setCidDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar CID-10</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Código CID-10
              </label>
              <Input
                value={novoCidCode}
                onChange={(e) => setNovoCidCode(e.target.value.toUpperCase())}
                placeholder="Ex: J11.1"
                className="uppercase"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Descrição
              </label>
              <Textarea
                value={novoCidDescription}
                onChange={(e) => setNovoCidDescription(e.target.value)}
                placeholder="Descrição do diagnóstico"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCidDialogOpen(false);
                setNovoCidCode("");
                setNovoCidDescription("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (novoCidCode.trim() && novoCidDescription.trim()) {
                  setCidsManuais([...cidsManuais, { code: novoCidCode.trim(), description: novoCidDescription.trim() }]);
                  setCidDialogOpen(false);
                  setNovoCidCode("");
                  setNovoCidDescription("");
                }
              }}
              disabled={!novoCidCode.trim() || !novoCidDescription.trim()}
            >
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Busca de CID */}
      <Dialog open={cidSearchDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelarCidsCatalogo();
        else setCidSearchDialogOpen(true);
      }}>
        <DialogContent className="max-w-2xl h-[640px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar CID</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar CID por codigo, descricao ou categoria..."
                value={cidSearch}
                onChange={(e) => setCidSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 border rounded-lg min-h-0 h-full">
              {loadingCidsCadastrados ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : cidsCadastrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Stethoscope className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Nenhum CID encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {cidSearch ? "Tente uma busca diferente" : "Digite para buscar CIDs cadastrados"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {cidsCadastrados.map((cid) => {
                    const isSelected = selectedCidsCatalogoIds.has(cid.id);
                    return (
                      <button
                        key={cid.id}
                        onClick={() => handleToggleCidCatalogo(cid.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                            {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{cid.codigo}</p>
                            <p className="text-xs text-slate-500">{cid.descricao}</p>
                            {cid.categoria && (
                              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 mt-1">
                                {cid.categoria}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => { setCidSearchDialogOpen(false); setCidDialogOpen(true); }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1.5 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar manualmente
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelarCidsCatalogo}>Cancelar</Button>
              <Button onClick={handleConfirmarCidsCatalogo} disabled={selectedCidsCatalogoIds.size === 0}>
                Adicionar selecionados
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar Exame */}
      <Dialog open={exameDialogOpen} onOpenChange={setExameDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Exame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Nome do Exame
              </label>
              <Input
                value={novoExameNome}
                onChange={(e) => setNovoExameNome(e.target.value)}
                placeholder="Ex: Hemograma completo"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Tipo
              </label>
              <Input
                value={novoExameTipo}
                onChange={(e) => setNovoExameTipo(e.target.value)}
                placeholder="Ex: Laboratorial"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setExameDialogOpen(false);
                setNovoExameNome("");
                setNovoExameTipo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (novoExameNome.trim()) {
                  setExamesManuais([...examesManuais, { nome: novoExameNome.trim(), tipo: novoExameTipo.trim() || "Não especificado" }]);
                  setExameDialogOpen(false);
                  setNovoExameNome("");
                  setNovoExameTipo("");
                }
              }}
              disabled={!novoExameNome.trim()}
            >
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Dialog de Busca de Exames */}
      <Dialog open={exameSearchDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelarExames();
        else setExameSearchDialogOpen(true);
      }}>
        <DialogContent className="max-w-2xl h-[640px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Exame</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3">
            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Prioridade</label>
              <select
                value={examesPrioridade}
                onChange={(e) => setExamesPrioridade(e.target.value as PrioridadeTISS)}
                className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-0"
              >
                <option value="eletiva">Eletiva — Procedimento programado</option>
                <option value="urgencia">Urgência / Emergência</option>
              </select>
            </div>
            <Tabs value={activeExameTab} onValueChange={(value) => {
              setActiveExameTab(value as "exames" | "grupos");
              setExameSearch("");
            }} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="exames">Exames</TabsTrigger>
                <TabsTrigger value="grupos">Grupos de Exames</TabsTrigger>
              </TabsList>
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={activeExameTab === "exames" ? "Buscar exame por nome ou descrição..." : "Buscar grupo de exames por nome ou descrição..."}
                  value={exameSearch}
                  onChange={(e) => setExameSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <TabsContent value="exames" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <ScrollArea className="flex-1 border rounded-lg min-h-0 h-full">
                  {loadingExamesCadastrados ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : examesCadastrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <ClipboardList className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">
                        {exameSearch.trim().length < 3 ? "Digite pelo menos 3 letras para buscar" : "Nenhum exame encontrado"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {exameSearch.trim().length >= 3 ? "Tente uma busca diferente" : "Ex: hemograma, glicose, ultrassom..."}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {examesCadastrados.map((exame) => {
                        const isSelected = selectedExamesIds.has(exame.id);
                        return (
                          <button
                            key={exame.id}
                            onClick={() => handleToggleExame(exame.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                                {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{exame.nome}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                                    {exame.tipo}
                                  </Badge>
                                  {exame.descricao && (
                                    <span className="text-xs text-slate-500">{exame.descricao}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="grupos" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <ScrollArea className="flex-1 border rounded-lg min-h-0 h-full">
                  {loadingGruposExames ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : gruposExames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <ClipboardList className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">
                        {exameSearch.trim().length < 3 ? "Digite pelo menos 3 letras para buscar" : "Nenhum grupo encontrado"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {exameSearch.trim().length >= 3 ? "Tente uma busca diferente" : "Ex: hemograma, check-up..."}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {gruposExames.map((grupoExame) => {
                        const isSelected = selectedGruposIds.has(grupoExame.id);
                        return (
                          <button
                            key={grupoExame.id}
                            onClick={() => handleToggleGrupo(grupoExame.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                                {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{grupoExame.nome}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                                    {grupoExame.exames.length} {grupoExame.exames.length === 1 ? "exame" : "exames"}
                                  </Badge>
                                  {grupoExame.descricao && (
                                    <span className="text-xs text-slate-500">{grupoExame.descricao}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-shrink-0">
            <button
              onClick={() => { setExameSearchDialogOpen(false); setExameDialogOpen(true); }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1.5 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar manualmente
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {(selectedExamesIds.size + selectedGruposIds.size) > 0
                  ? `${selectedExamesIds.size + selectedGruposIds.size} selecionado${(selectedExamesIds.size + selectedGruposIds.size) > 1 ? "s" : ""}`
                  : "Nenhum selecionado"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelarExames}>Cancelar</Button>
                <Button
                  onClick={handleConfirmarExames}
                  disabled={(selectedExamesIds.size + selectedGruposIds.size) === 0}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== OVERLAY: FINALIZANDO ATENDIMENTO ====== */}
      {saving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 bg-white rounded-2xl px-10 py-8 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-800">Finalizando atendimento</p>
            <p className="text-xs text-slate-500 animate-pulse">{savingStep}</p>
          </div>
        </div>
      )}

    </div>
  );
}
