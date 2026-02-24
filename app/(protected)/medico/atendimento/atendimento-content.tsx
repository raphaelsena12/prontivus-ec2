"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Pencil,
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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatTime, formatCPF } from '@/lib/utils';
import { useTranscription } from '@/hooks/use-transcription';
import { ProcessingModal } from '@/components/processing-modal';
import { MedicalAnalysisResults } from '@/components/medical-analysis-results';
import { MicrophoneSelectorModal } from '@/components/microphone-selector-modal';
import { DocumentosConsultaDialog } from '@/components/documentos-consulta-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

// ─── Novos componentes do redesign ───────────────────────────────────────────
import { PatientHistory } from '@/components/atendimento/patient/PatientHistory';
import { TranscriptionBar } from '@/components/atendimento/consultation/TranscriptionBar';
import { Step2Anamnesis } from '@/components/atendimento/consultation/steps/Step2Anamnesis';
import { AISidebar, type AIContext } from '@/components/atendimento/consultation/AISidebar';
import { TelemedicineView } from '@/components/atendimento/consultation/TelemedicineView';

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
    numeroProntuario: number | null;
  };
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
}

interface Prontuario {
  id: string;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  evolucao: string | null;
}

interface AtendimentoContentProps {
  consultaId: string;
}

export function AtendimentoContent({ consultaId }: AtendimentoContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [activeTab, setActiveTab] = useState<string>('informacoes');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('excellent');
  const [sessionStartTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [historicoConsultas, setHistoricoConsultas] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [expandedConsultas, setExpandedConsultas] = useState<Set<string>>(new Set());
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'processing' | 'analyzing' | 'generating'>('processing');
  const [analysisResults, setAnalysisResults] = useState<{
    anamnese: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    exames: Array<{ nome: string; tipo: string; justificativa: string }>;
    prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string; justificativa?: string }>;
  } | null>(null);
  const [editedAnamnese, setEditedAnamnese] = useState<string>('');
  const [isAnamneseEdited, setIsAnamneseEdited] = useState(false);
  const [isEditingAnamnese, setIsEditingAnamnese] = useState(false);
  const [documentoSearch, setDocumentoSearch] = useState("");
  const [documentoSuggestions, setDocumentoSuggestions] = useState<Array<{ id: string; nome: string }>>([]);
  const [isMicrophoneSelectorOpen, setIsMicrophoneSelectorOpen] = useState(false);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | undefined>();
  const [prescricoes, setPrescricoes] = useState<Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>>([]);
  const [selectedCids, setSelectedCids] = useState<Set<number>>(new Set());
  const [selectedProtocolosAI, setSelectedProtocolosAI] = useState<Set<number>>(new Set());
  const [selectedExamesAI, setSelectedExamesAI] = useState<Set<number>>(new Set());
  const [selectedPrescricoesAI, setSelectedPrescricoesAI] = useState<Set<number>>(new Set());
  const [medicamentoDialogOpen, setMedicamentoDialogOpen] = useState(false);
  const [medicamentoSearch, setMedicamentoSearch] = useState("");
  const [medicamentos, setMedicamentos] = useState<Array<{ id: string; nome: string; principioAtivo: string | null; laboratorio: string | null; apresentacao: string | null; concentracao: string | null; unidade: string | null }>>([]);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [manipulados, setManipulados] = useState<Array<{ id: string; descricao: string; informacoes: string | null }>>([]);
  const [loadingManipulados, setLoadingManipulados] = useState(false);
  const [activeMedicamentoTab, setActiveMedicamentoTab] = useState<"medicamentos" | "manipulados">("medicamentos");
  const [selectedPrescricaoIndex, setSelectedPrescricaoIndex] = useState<number | null>(null);
  const [documentosGerados, setDocumentosGerados] = useState<Array<{ id: string; tipoDocumento: string; nomeDocumento: string; createdAt: string; pdfBlob?: Blob }>>([]);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
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
  const [nomeExameInput, setNomeExameInput] = useState("");
  const [arquivoExame, setArquivoExame] = useState<File | null>(null);
  const [cidsManuais, setCidsManuais] = useState<Array<{ code: string; description: string }>>([]);
  const [protocolosManuais, setProtocolosManuais] = useState<Array<{ nome: string; descricao: string }>>([]);
  const [examesManuais, setExamesManuais] = useState<Array<{ nome: string; tipo: string }>>([]);
  const [cidDialogOpen, setCidDialogOpen] = useState(false);
  const [protocoloDialogOpen, setProtocoloDialogOpen] = useState(false);
  const [exameDialogOpen, setExameDialogOpen] = useState(false);
  const [novoCidCode, setNovoCidCode] = useState("");
  const [novoCidDescription, setNovoCidDescription] = useState("");
  const [novoExameNome, setNovoExameNome] = useState("");
  const [novoExameTipo, setNovoExameTipo] = useState("");
  const [exameSearchDialogOpen, setExameSearchDialogOpen] = useState(false);
  const [exameSearch, setExameSearch] = useState("");
  const [examesParaIA, setExamesParaIA] = useState<Set<string>>(new Set());
  const [transcricaoFinalizada, setTranscricaoFinalizada] = useState(false);
  const [anamneseModoManual, setAnamneseModoManual] = useState(false);
  const [examesDrawerOpen, setExamesDrawerOpen] = useState(false);
  const [resumoClinicoDialogOpen, setResumoClinicoDialogOpen] = useState(false);
  const [gerandoResumoClinico, setGerandoResumoClinico] = useState(false);
  const [resumoClinico, setResumoClinico] = useState<string | null>(null);
  const [medicamentosEmUso, setMedicamentosEmUso] = useState<Array<{ nome: string; posologia: string; dataPrescricao: string }>>([]);
  const [loadingMedicamentosEmUso, setLoadingMedicamentosEmUso] = useState(false);
  const [examesCadastrados, setExamesCadastrados] = useState<Array<{ id: string; nome: string; descricao: string; tipo: string }>>([]);
  const [loadingExamesCadastrados, setLoadingExamesCadastrados] = useState(false);

  // ─── UI states do redesign (não afetam lógica de negócio) ─────────────────
  const [currentStep, setCurrentStep] = useState<1|2|3|4|5>(1);
  const [consultationMode, setConsultationMode] = useState<'manual'|'ai'>('ai');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [anamneseConfirmed, setAnamneseConfirmed] = useState(false);

  // Hook de transcrição
  const {
    isTranscribing,
    isPaused,
    transcription,
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
    processTranscription,
  } = useTranscription();

  // Dados mockados para funcionalidades que ainda não estão implementadas
  // Função para calcular IMC
  const calcularIMC = (peso: number, altura: number): number => {
    if (altura <= 0) return 0;
    return peso / (altura * altura);
  };

  const peso = 68.5; // kg
  const altura = 1.70; // metros
  const imc = calcularIMC(peso, altura);

  const vitals = [
    { icon: Heart, label: "Pressão", value: "120/80", unit: "mmHg", status: "normal", iconColor: "text-red-500" },
    { icon: Activity, label: "Frequência", value: "72", unit: "bpm", status: "normal", iconColor: "text-blue-500" },
    { icon: Droplet, label: "Saturação", value: "98", unit: "%", status: "normal", iconColor: "text-cyan-500" },
    { icon: Weight, label: "Peso", value: "68.5", unit: "kg", status: "normal", iconColor: "text-orange-500" },
    { icon: Ruler, label: "Altura", value: `${altura.toFixed(2)}`, unit: "m", status: "normal", iconColor: "text-green-500" },
    { icon: TrendingUp, label: "IMC", value: imc.toFixed(1), unit: "kg/m²", status: "normal", iconColor: "text-purple-500" },
  ];

  const exams: any[] = [];

  // Determinar se é telemedicina baseado no tipo de consulta
  const isTelemedicina = consulta?.tipoConsulta?.nome?.toLowerCase().includes('telemedicina') || false;

  // Tabs para consulta normal
  const tabsNormal = [
    { id: 'informacoes', label: 'Informações', icon: User },
    { id: 'contexto-consulta', label: 'Contexto da consulta', icon: FileText },
  ];

  // Tabs para telemedicina
  const tabsTelemedicina = [
    { id: 'informacoes', label: 'Informações', icon: User },
    { id: 'telemedicina', label: 'Telemedicina', icon: Video },
  ];

  const tabs = isTelemedicina ? tabsTelemedicina : tabsNormal;

  const chatMessages = [
    { id: 1, sender: 'patient', text: 'Olá, doutor! Consegue me ouvir bem?', time: formatTime(new Date()) },
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

  useEffect(() => {
    if (consulta?.paciente?.id) {
      fetchHistoricoConsultas(consulta.paciente.id);
      fetchMedicamentosEmUso(consulta.paciente.id);
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
    if (!nomeExameInput.trim() || !arquivoExame) {
      toast.error("Preencha o nome do exame e selecione um arquivo");
      return;
    }

    try {
      setUploadingExame(true);
      const formData = new FormData();
      formData.append("consultaId", consultaId);
      formData.append("nomeExame", nomeExameInput.trim());
      formData.append("file", arquivoExame);

      const response = await fetch("/api/medico/exames/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer upload");
      }

      const result = await response.json();
      console.log("[Frontend] Upload bem-sucedido:", result);

      toast.success("Exame anexado com sucesso!");
      setUploadDialogOpen(false);
      setNomeExameInput("");
      setArquivoExame(null);
      
      // Aguardar um pouco para garantir que o banco foi atualizado
      setTimeout(async () => {
        await fetchExamesAnexados();
      }, 500);
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

  // Buscar exames quando o dialog abrir
  useEffect(() => {
    if (exameSearchDialogOpen) {
      fetchExamesCadastrados();
    }
  }, [exameSearchDialogOpen, exameSearch]);

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
      if (exameSearch) {
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

  const handleSelectExame = (exame: typeof examesCadastrados[0]) => {
    setExamesManuais([...examesManuais, { nome: exame.nome, tipo: exame.tipo }]);
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
    const transcriptionText = transcription
      .filter((e) => !e.isPartial)
      .map((e) => e.text)
      .join(" ") || transcription.map((e) => e.text).join(" ");

    if (!transcriptionText.trim()) {
      toast.error("Nenhuma transcrição disponível para processar");
      return;
    }

    setIsProcessing(true);
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

      const data = await response.json();
      // Garantir que as quebras de linha sejam preservadas
      const anamneseFormatted = data.anamnese
        ? data.anamnese.replace(/\\n/g, '\n').replace(/\\r/g, '')
        : '';
      setAnalysisResults({ anamnese: anamneseFormatted, cidCodes: [], exames: [], prescricoes: [] });
      setProntuario((prev) => ({ ...prev, anamnese: anamneseFormatted } as Prontuario));
      setEditedAnamnese(anamneseFormatted);
      setIsEditingAnamnese(true); // Sempre deixar em modo de edição
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
    if (transcricaoFinalizada && transcription.length > 0) {
      handleGenerateAnamnese();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcricaoFinalizada]);

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
        cidCodes: data.cidCodes || [],
        exames: data.exames || [],
        prescricoes: data.prescricoes || [],
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
      
      if (data.prontuario) {
        setProntuario(data.prontuario);
      }

      // Definir aba inicial baseado no tipo de consulta
      const isTelemedicina = data.consulta?.tipoConsulta?.nome?.toLowerCase().includes('telemedicina') || false;
      if (isTelemedicina) {
        setActiveTab('telemedicina');
      } else {
        setActiveTab('contexto-consulta');
      }
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
      const results = await processTranscription();
      
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
          prescricoes: (results as any).prescricoes || [],
        });
        // Atualizar prontuário com a anamnese gerada
        setProntuario((prev) => ({
          ...prev,
          anamnese: results.anamnese,
        } as Prontuario));
        // Mostrar visualização formatada por padrão
        setIsEditingAnamnese(false);
        toast.success("Transcrição processada com sucesso!");
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
          anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
          exameFisico: prontuario?.exameFisico || "",
          diagnostico: prontuario?.diagnostico || "",
          conduta: prontuario?.conduta || "",
          evolucao: prontuario?.evolucao || "",
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

  const handleFinalizarAtendimento = async () => {
    try {
      setSaving(true);
      
      // Primeiro, salvar o prontuário
      const response = await fetch("/api/medico/atendimento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId,
          anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
          exameFisico: prontuario?.exameFisico || "",
          diagnostico: prontuario?.diagnostico || "",
          conduta: prontuario?.conduta || "",
          evolucao: prontuario?.evolucao || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao finalizar atendimento");
      }

      // Gerar e salvar Ficha de Atendimento automaticamente
      try {
        console.log("📋 Gerando Ficha de Atendimento...");
        
        // Preparar dados para a ficha de atendimento
        const selectedCidsList = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || [];
        const selectedExamesList = analysisResults?.exames?.filter((_, i) => selectedExamesAI.has(i)).map(e => ({ nome: e.nome, tipo: e.tipo })) || [];
        const examesManuaisList = examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo }));
        const allExames = [...selectedExamesList, ...examesManuaisList];
        
        const fichaRequestData = {
          tipoDocumento: "ficha-atendimento",
          consultaId,
          dados: {
            anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
            cidCodes: selectedCidsList,
            exames: allExames,
            prescricoes: prescricoes,
          },
        };

        // Gerar o PDF da ficha de atendimento
        const fichaResponse = await fetch("/api/medico/documentos/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fichaRequestData),
        });

        if (!fichaResponse.ok) {
          const error = await fichaResponse.json();
          console.error("Erro ao gerar Ficha de Atendimento:", error);
          toast.warning("Ficha de Atendimento não pôde ser gerada automaticamente");
        } else {
          // Obter o blob do PDF
          const fichaPdfBlob = await fichaResponse.blob();

          // Salvar a ficha de atendimento
          const fichaFormData = new FormData();
          fichaFormData.append("consultaId", consultaId);
          fichaFormData.append("tipoDocumento", "ficha-atendimento");
          fichaFormData.append("nomeDocumento", "Ficha de Atendimento");
          fichaFormData.append("pdfFile", fichaPdfBlob, "ficha-atendimento.pdf");

          const fichaSaveResponse = await fetch("/api/medico/documentos/salvar", {
            method: "POST",
            body: fichaFormData,
          });

          if (!fichaSaveResponse.ok) {
            const error = await fichaSaveResponse.json();
            console.error("Erro ao salvar Ficha de Atendimento:", error);
            toast.warning("Ficha de Atendimento gerada mas não pôde ser salva");
          } else {
            console.log("✅ Ficha de Atendimento gerada e salva com sucesso!");
          }
        }
      } catch (fichaError: any) {
        console.error("Erro ao gerar/salvar Ficha de Atendimento:", fichaError);
        toast.warning("Ficha de Atendimento não pôde ser gerada automaticamente");
      }

      // Salvar documentos gerados
      if (documentosGerados.length > 0) {
        for (const doc of documentosGerados) {
          try {
            if (!doc.pdfBlob) {
              console.warn(`PDF blob não disponível para ${doc.nomeDocumento}`);
              toast.warning(`PDF não disponível para ${doc.nomeDocumento}`);
              continue;
            }

            console.log(`📤 Enviando documento: ${doc.nomeDocumento}`);
            console.log("Tipo:", doc.tipoDocumento);
            console.log("Tamanho do blob:", doc.pdfBlob.size, "bytes");
            console.log("Tipo MIME:", doc.pdfBlob.type);

            // Criar FormData para enviar o arquivo
            const formData = new FormData();
            formData.append("consultaId", consultaId);
            formData.append("tipoDocumento", doc.tipoDocumento);
            formData.append("nomeDocumento", doc.nomeDocumento);
            formData.append("pdfFile", doc.pdfBlob, `${doc.tipoDocumento}.pdf`);

            console.log("FormData criado, enviando requisição...");

            const docResponse = await fetch("/api/medico/documentos/salvar", {
              method: "POST",
              body: formData, // Não definir Content-Type, o browser define automaticamente com boundary
            });

            console.log("Resposta recebida. Status:", docResponse.status, docResponse.statusText);

            if (!docResponse.ok) {
              const errorText = await docResponse.text();
              let errorData: any;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText || `Erro ${docResponse.status}: ${docResponse.statusText}` };
              }
              
              // Log detalhado do erro
              console.error(`=== ERRO AO SALVAR DOCUMENTO: ${doc.nomeDocumento} ===`);
              console.error("Status:", docResponse.status);
              console.error("Status Text:", docResponse.statusText);
              console.error("Error Data:", errorData);
              console.error("Error Text:", errorText);
              
              // Mensagem de erro mais clara
              const errorMessage = errorData.error || errorData.details || errorData.message || "Erro desconhecido ao salvar documento";
              const errorType = errorData.type || "UnknownError";
              
              console.error(`Tipo de erro: ${errorType}`);
              console.error(`Mensagem: ${errorMessage}`);
              
              toast.error(`Erro ao salvar ${doc.nomeDocumento}: ${errorMessage}`, {
                description: errorType !== "UnknownError" ? `Tipo: ${errorType}` : undefined,
                duration: 5000,
              });
            } else {
              const successData = await docResponse.json();
              console.log(`✅ Documento ${doc.nomeDocumento} salvo com sucesso!`);
              console.log("S3 Key:", successData.documento?.s3Key);
              toast.success(`${doc.nomeDocumento} salvo com sucesso!`);
            }
          } catch (error: any) {
            console.error(`=== ERRO EXCEPCIONAL AO SALVAR DOCUMENTO: ${doc.nomeDocumento} ===`);
            console.error("Erro completo:", error);
            console.error("Mensagem:", error?.message);
            console.error("Stack:", error?.stack);
            toast.error(`Erro ao salvar ${doc.nomeDocumento}: ${error?.message || "Erro inesperado"}`);
          }
        }
      }

      toast.success("Atendimento finalizado com sucesso!", {
        description: `Prontuário do paciente ${consulta?.paciente?.nome || 'o paciente'} foi atualizado.`,
        duration: 5000,
      });
      
      // Mostrar toast adicional com link para prontuário completo
      setTimeout(() => {
        if (consulta?.paciente?.nome && consulta?.paciente?.id) {
          toast.info(
            `Deseja visualizar o prontuário completo de ${consulta.paciente.nome}? Acesse pelo menu de prontuários.`,
            {
              duration: 6000,
            }
          );
        }
      }, 800);
      
      // Redirecionar para a fila de atendimento após um breve delay
      setTimeout(() => {
        router.push("/medico/fila-atendimento");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar atendimento");
      console.error(error);
      setSaving(false);
    }
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const formatTranscriptionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Lista completa de documentos disponíveis
  const documentModels = useMemo(() => [
    { id: "prontuario-medico", nome: "Prontuário Médico" },
    { id: "receita-medica", nome: "Receita Médica" },
    { id: "receita-controle-especial", nome: "Receita de Controle Especial" },
    { id: "receita-tipo-ba", nome: "Receita Tipo B" },
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
    { id: "controle-diabetes-analitico", nome: "Controle de Diabetes Analítico" },
    { id: "controle-diabetes", nome: "Controle de Diabetes" },
    { id: "controle-pressao-arterial-analitico", nome: "Controle de Pressão Arterial Analítico" },
    { id: "controle-pressao-arterial", nome: "Controle de Pressão Arterial" },
    { id: "termo-consentimento", nome: "Termo de Consentimento" },
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

  const handleGenerateDocument = async (modelId: string) => {
    const documentModel = documentModels.find((m) => m.id === modelId);
    const nomeDocumento = documentModel?.nome || modelId;

    try {
      // Preparar dados para a API
      const requestData: any = {
        tipoDocumento: modelId,
        consultaId,
        dados: {},
      };

      // Adicionar prescrições se for receita médica
      if (modelId === "receita-medica" && prescricoes.length > 0) {
        const prescricoesValidas = prescricoes.filter(
          (p) => p.medicamento && p.medicamento.trim() !== ""
        );
        if (prescricoesValidas.length > 0) {
          requestData.dados.prescricoes = prescricoesValidas;
        }
      }

      // Adicionar CID se necessário
      const selectedCidsList = analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description })) || [];
      if (selectedCidsList.length > 0) {
        requestData.dados.cidCodigo = selectedCidsList[0].code;
        requestData.dados.cidDescricao = selectedCidsList[0].description;
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

      // Obter o blob do PDF (mas não abrir)
      const pdfBlob = await response.blob();

      // Adicionar à lista de documentos gerados
      const novoDocumento = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipoDocumento: modelId,
        nomeDocumento,
        createdAt: new Date().toISOString(),
        pdfBlob, // Armazenar o blob para visualização posterior
      };

      setDocumentosGerados([...documentosGerados, novoDocumento]);
      setDocumentoSearch(""); // Limpar o input após adicionar
      setDocumentoSuggestions([]);
      toast.success("Documento adicionado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar documento:", error);
      toast.error(error.message || "Erro ao gerar documento");
    }
  };

  const handleSelectDocument = (modelId: string) => {
    handleGenerateDocument(modelId);
  };

  const getPatientAllergies = () => {
    // Extrair alergias das observações se houver
    if (!consulta?.paciente?.observacoes) return [];
    const obs = consulta.paciente.observacoes.toLowerCase();
    if (obs.includes('alergia') || obs.includes('alérgico')) {
      // Tentar extrair informações de alergia das observações
      return ['Verificar observações do paciente'];
    }
    return [];
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
    id: consulta.paciente.numeroProntuario ? consulta.paciente.numeroProntuario.toString() : consulta.paciente.id.substring(0, 12).toUpperCase(),
    phone: consulta.paciente.celular || consulta.paciente.telefone || "-",
    email: consulta.paciente.email || "-",
    bloodType: "Não informado", // Campo não disponível no schema atual
    allergies: getPatientAllergies(),
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
    ? `Pront. ${String(consulta.paciente.numeroProntuario).padStart(5, "0")}`
    : `ID ${consulta.paciente.id.substring(0, 8).toUpperCase()}`;
  const hasAllergies = patient.allergies.length > 0;

  const vitalStatusDot: Record<string, string> = {
    normal: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  return (
    <div className="min-h-screen -mx-4 md:-mx-6 -mt-4 md:-mt-6 overflow-x-hidden" style={{ backgroundColor: 'var(--clinical-surface)' }}>
      {/* Novo box do cabeçalho */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-5">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Faixa de alergias — só aparece se houver */}
          {hasAllergies && (
            <div className="px-6 py-1.5 border-b border-red-100 overflow-x-hidden" style={{ backgroundColor: "#FEF2F2" }}>
              <div className="flex items-center gap-2 overflow-x-hidden">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Alergias:</span>
                <div className="flex gap-1.5 min-w-0 overflow-x-hidden">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 whitespace-nowrap flex-shrink-0">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Corpo principal */}
          <div className="p-6 flex items-center justify-between gap-6 overflow-hidden">
            {/* Coluna esquerda — identidade */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold select-none"
                style={{ backgroundColor: avatarColor.bg, color: avatarColor.text, width: 52, height: 52 }}
              >
                {inicial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 truncate">{consulta.paciente.nome}</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Em Atendimento
                  </Badge>
                  {isTelemedicina && (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border flex-shrink-0">
                      <Video className="w-3 h-3" />
                      Telemedicina
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 flex-wrap">
                  <span className="font-medium text-slate-700 whitespace-nowrap">{idade} anos</span>
                  <span className="text-slate-300">·</span>
                  <span className="whitespace-nowrap">Nasc. {formatDate(consulta.paciente.dataNascimento)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600 whitespace-nowrap">{prontuarioLabel}</span>
                  {consulta.tipoConsulta && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="truncate">{consulta.tipoConsulta.nome}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna direita — vitais (topo) + ações (baixo) */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-0">
              {/* Vitais — chips compactos */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-full">
                {vitals.map((v, i) => {
                  const Icon = v.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0"
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${v.iconColor}`} />
                      <span className="text-xs font-bold text-slate-800 tabular-nums leading-none whitespace-nowrap">{v.value}</span>
                      <span className="text-[10px] text-slate-400 leading-none whitespace-nowrap">{v.unit}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vitalStatusDot[v.status]}`} />
                    </div>
                  );
                })}
              </div>

              {/* Botões de ação */}
              <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap justify-end">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-mono font-semibold text-slate-700 tabular-nums whitespace-nowrap">{sessionDuration}</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumoClinicoDialogOpen(true)}
                  className="h-9 px-4 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Resumo Clínico</span>
                </Button>

                {isTelemedicina && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {}}
                    className="h-9 px-4 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 flex-shrink-0"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Videochamada</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-4 px-4 lg:px-8 pt-5 pb-10 overflow-x-hidden">
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
            setSelectedConsultaForDocumentos(consultaId);
            setDocumentosDialogOpen(true);
          }}
          onDownloadExame={handleDownloadExame}
          formatDate={formatDate}
        />

        {/* Zona 3 — Consulta Atual */}
        {isTelemedicina ? (
          <TelemedicineView
            patient={patient}
            vitals={vitals}
            sessionDuration={sessionDuration}
            connectionQuality={connectionQuality}
            isMicOn={isMicOn}
            setIsMicOn={setIsMicOn}
            isCameraOn={isCameraOn}
            setIsCameraOn={setIsCameraOn}
            isScreenSharing={isScreenSharing}
            setIsScreenSharing={setIsScreenSharing}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            chatMessages={chatMessages}
            isTranscribing={isTranscribing}
            isPaused={isPaused}
            transcription={transcription}
            startTranscription={startTranscription}
            pauseTranscription={pauseTranscription}
            resumeTranscription={resumeTranscription}
            stopTranscription={stopTranscription}
            handleProcessTranscription={handleProcessTranscription}
            onOpenResumoClinico={() => setResumoClinicoDialogOpen(true)}
            onEncerrar={handleFinalizarAtendimento}
          />
        ) : (
          <>
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Coluna Anamnese */}
            <div className="col-span-8">
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
                consultationMode={consultationMode}
                onToggleMode={setConsultationMode}
                isTranscribing={isTranscribing}
                startTranscription={startTranscription}
                transcriptionText={transcription
                  .filter((e) => !e.isPartial)
                  .map((e) => e.text)
                  .join(" ") || transcription.map((e) => e.text).join(" ")}
              />
            </div>

            {/* Sidebar IA */}
            <div className="col-span-4">
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
                  setCidDialogOpen={setCidDialogOpen}
                  selectedProtocolosAI={selectedProtocolosAI}
                  setSelectedProtocolosAI={setSelectedProtocolosAI}
                  protocolosManuais={protocolosManuais}
                  setProtocoloDialogOpen={setProtocoloDialogOpen}
                  selectedExamesAI={selectedExamesAI}
                  setSelectedExamesAI={setSelectedExamesAI}
                  examesManuais={examesManuais}
                  setExameDialogOpen={setExameDialogOpen}
                  setExameSearchDialogOpen={setExameSearchDialogOpen}
                  prescricoes={prescricoes}
                  setPrescricoes={setPrescricoes}
                  selectedPrescricoesAI={selectedPrescricoesAI}
                  setSelectedPrescricoesAI={setSelectedPrescricoesAI}
                  setMedicamentoDialogOpen={setMedicamentoDialogOpen}
                  selectedPrescricaoIndex={selectedPrescricaoIndex}
                  setSelectedPrescricaoIndex={setSelectedPrescricaoIndex}
                  allergies={patient.allergies}
                  documentModels={documentModels}
                  documentosGerados={documentosGerados}
                  handleGenerateDocument={handleGenerateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onGenerateSuggestions={handleGenerateSuggestions}
                  consultationMode={consultationMode}
                />
            </div>
          </div>
          </>
        )}
      </div>

      {/* Pill flutuante de transcrição */}
      {consultationMode === 'ai' && (
        <TranscriptionBar
          isTranscribing={isTranscribing}
          isPaused={isPaused}
          transcricaoFinalizada={transcricaoFinalizada}
          hasAnamnese={!!(analysisResults?.anamnese || prontuario?.anamnese)}
          isProcessing={isProcessing}
          sessionDuration={sessionDuration}
          pauseTranscription={pauseTranscription}
          resumeTranscription={resumeTranscription}
          stopTranscription={stopTranscription}
          setTranscricaoFinalizada={setTranscricaoFinalizada}
          setIsMicrophoneSelectorOpen={setIsMicrophoneSelectorOpen}
          onProcessAndAdvance={handleStep1Complete}
        />
      )}


      {/* ====== DIALOG: GERENCIAR EXAMES ====== */}
      <Dialog open={examesDrawerOpen} onOpenChange={setExamesDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                <FileImage className="w-3.5 h-3.5 text-white" />
              </div>
              Exames do Paciente
              <Badge variant="outline" className="ml-auto text-xs font-normal">
                {examesAnexados.length} {examesAnexados.length === 1 ? 'exame' : 'exames'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
            {/* Upload novo exame */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome do exame (ex: Hemograma, RX Tórax...)"
                  value={nomeExameInput}
                  onChange={(e) => setNomeExameInput(e.target.value)}
                  className="h-9 text-sm"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    id="exame-upload-drawer"
                    className="hidden"
                    onChange={(e) => setArquivoExame(e.target.files?.[0] || null)}
                  />
                  <Button
                    variant="outline"
                    className="h-9 w-full text-sm gap-2 justify-start"
                    onClick={() => document.getElementById('exame-upload-drawer')?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate text-slate-500">
                      {arquivoExame ? arquivoExame.name : 'Selecionar arquivo'}
                    </span>
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleUploadExame}
                disabled={uploadingExame || !nomeExameInput.trim() || !arquivoExame}
                className="h-9 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm gap-2 flex-shrink-0"
              >
                {uploadingExame ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
                Anexar
              </Button>
            </div>

            {/* Lista de exames */}
            <ScrollArea className="flex-1 min-h-0">
              {loadingExames ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : examesAnexados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <FileImage className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Nenhum exame anexado</p>
                  <p className="text-xs text-slate-400 mt-1">Adicione imagens ou PDFs de exames acima</p>
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {examesAnexados.map((exame) => (
                    <div
                      key={exame.id}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        exame.isImage ? 'bg-blue-100' : 'bg-red-50'
                      }`}>
                        {exame.isImage
                          ? <FileImage className="w-4 h-4 text-blue-600" />
                          : <FileText className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{exame.nome}</p>
                          {exame.isFromCurrentConsulta && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(new Date(exame.data))} · {exame.isImage ? 'Imagem' : 'PDF'}
                          {exame.consultaData && !exame.isFromCurrentConsulta && (
                            <> · Consulta {formatDate(new Date(exame.consultaData))}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          onClick={() => handleDownloadExame(exame.id, exame.s3Key)}
                          title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleDeleteExame(exame.id)}
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Processamento */}
      <ProcessingModal
        isOpen={isProcessing} 
        stage={processingStage}
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
          // Resetar estados quando fechar
          setActiveMedicamentoTab("medicamentos");
          setMedicamentoSearch("");
        }
      }}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Medicamento ou Manipulado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
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
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
                <TabsTrigger value="manipulados">Manipulados</TabsTrigger>
              </TabsList>
              
              <div className="relative flex-shrink-0 mt-4">
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

              <TabsContent value="medicamentos" className="mt-0">
                <div className="h-[400px] overflow-y-auto border rounded-lg">
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
                          onClick={() => handleSelectMedicamento(med)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{med.nome}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manipulados" className="mt-0">
                <div className="h-[400px] overflow-y-auto border rounded-lg">
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
                          onClick={() => handleSelectManipulado(manipulado)}
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
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
                Nome do Exame
              </label>
              <Input
                placeholder="Ex: Hemograma completo, Raio-X tórax, etc."
                value={nomeExameInput}
                onChange={(e) => setNomeExameInput(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Arquivo (Imagem ou PDF)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setArquivoExame(file);
                    }
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
                    {arquivoExame ? arquivoExame.name : "Clique para selecionar arquivo"}
                  </span>
                  <span className="text-xs text-slate-400">
                    JPEG, PNG, WebP ou PDF (máx. 10MB)
                  </span>
                </label>
              </div>
              {arquivoExame && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>{arquivoExame.name}</span>
                  <span className="text-xs text-slate-400">
                    ({(arquivoExame.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setNomeExameInput("");
                setArquivoExame(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadExame}
              disabled={uploadingExame || !nomeExameInput.trim() || !arquivoExame}
            >
              {uploadingExame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
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
                className="font-mono"
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
      <Dialog open={exameSearchDialogOpen} onOpenChange={setExameSearchDialogOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Exame</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar exame por nome ou descrição..."
                value={exameSearch}
                onChange={(e) => setExameSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 border rounded-lg min-h-0">
              {loadingExamesCadastrados ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : examesCadastrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <ClipboardList className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Nenhum exame encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {exameSearch ? "Tente uma busca diferente" : "Digite para buscar exames cadastrados"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {examesCadastrados.map((exame) => (
                    <button
                      key={exame.id}
                      onClick={() => handleSelectExame(exame)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
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
                        <ClipboardList className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Box de ações finais */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-5 pb-10">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-end gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                // TODO: Implementar função de assinar documento
                toast.info("Funcionalidade de assinar documento em desenvolvimento");
              }}
              className="h-11 px-6 text-sm gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <FileCheck className="w-4 h-4" />
              Assinar Documento
            </Button>
            <Button
              size="lg"
              onClick={handleFinalizarAtendimento}
              disabled={saving}
              className="h-11 px-6 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finalizar Atendimento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
