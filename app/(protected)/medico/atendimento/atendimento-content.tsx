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
import { useSidebar } from '@/components/ui/sidebar';
import { formatDate, formatTime, formatCPF } from '@/lib/utils';
import { useTranscription } from '@/hooks/use-transcription';
import { ProcessingModal } from '@/components/processing-modal';
import { MedicalAnalysisResults } from '@/components/medical-analysis-results';
import { MicrophoneSelectorModal } from '@/components/microphone-selector-modal';
import { DocumentosConsultaDialog } from '@/components/documentos-consulta-dialog';
import { GuiaTissExamesModal, type ExameSolicitado, type PrioridadeTISS } from '@/components/guia-tiss-exames-modal';
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
import { AvatarWithS3 } from '@/components/avatar-with-s3';

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
  const { open: sidebarOpen, isMobile } = useSidebar();
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
  const [analysisResults, setAnalysisResults] = useState<{
    anamnese: string;
    raciocinioClinico?: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    protocolos: Array<{ nome: string; descricao: string; justificativa?: string }>;
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
  const [pendingMedicamento, setPendingMedicamento] = useState<{
    nome: string;
    dosagem: string;
    posologia: string;
    duracao: string;
  } | null>(null);
  type DocumentoGeradoLocal = {
    id: string;
    tipoDocumento: string;
    nomeDocumento: string;
    createdAt: string;
    pdfBlob?: Blob;
    assinado: boolean;
    assinando?: boolean;
    erroAssinatura?: string;
  };
  const [documentosGerados, setDocumentosGerados] = useState<DocumentoGeradoLocal[]>([]);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
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
  const [nomeExameInput, setNomeExameInput] = useState("");
  const [arquivoExame, setArquivoExame] = useState<File | null>(null);
  const [cidsManuais, setCidsManuais] = useState<Array<{ code: string; description: string }>>([]);
  const [protocolosManuais, setProtocolosManuais] = useState<Array<{ nome: string; descricao: string }>>([]);
  const [examesManuais, setExamesManuais] = useState<Array<{ nome: string; tipo: string; codigoTussId?: string | null; codigoTuss?: string | null; exameId?: string | null; grupoId?: string | null }>>([]);
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
  const [examesCadastrados, setExamesCadastrados] = useState<Array<{ id: string; nome: string; descricao: string; tipo: string; codigoTuss: { id: string; codigoTuss: string; descricao: string; categoriaExame: string | null } | null }>>([]);
  const [loadingExamesCadastrados, setLoadingExamesCadastrados] = useState(false);
  const [gruposExames, setGruposExames] = useState<Array<{ id: string; nome: string; descricao: string | null; exames: Array<{ exame: { id: string; nome: string; tipo: string | null; descricao: string | null; codigoTuss: { id: string; codigoTuss: string; descricao: string; categoriaExame: string | null } | null } }> }>>([]);
  const [loadingGruposExames, setLoadingGruposExames] = useState(false);
  const [activeExameTab, setActiveExameTab] = useState<"exames" | "grupos">("exames");
  const [selectedExamesIds, setSelectedExamesIds] = useState<Set<string>>(new Set());
  const [selectedGruposIds, setSelectedGruposIds] = useState<Set<string>>(new Set());

  // ─── UI states do redesign (não afetam lógica de negócio) ─────────────────
  const [currentStep, setCurrentStep] = useState<1|2|3|4|5>(1);
  const [consultationMode, setConsultationMode] = useState<'manual'|'ai'>('ai');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [anamneseConfirmed, setAnamneseConfirmed] = useState(false);
  const [loadingFichaPreview, setLoadingFichaPreview] = useState(false);

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

  // Buscar exames quando o dialog abrir
  useEffect(() => {
    if (exameSearchDialogOpen) {
      fetchExamesCadastrados();
      fetchGruposExames();
    }
  }, [exameSearchDialogOpen, exameSearch]);

  // Buscar grupos de exames quando a tab mudar
  useEffect(() => {
    if (exameSearchDialogOpen && activeExameTab === "grupos") {
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
        novosExames.push({
          nome: exame.nome,
          tipo: exame.tipo,
          codigoTussId: exame.codigoTuss?.id ?? null,
          codigoTuss: exame.codigoTuss?.codigoTuss ?? null,
          exameId: exame.id,
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

      const data = await response.json();
      // Garantir que as quebras de linha sejam preservadas
      let anamneseRaw = data.anamnese;
      
      // Se data.anamnese for um objeto, tentar extrair a string
      if (anamneseRaw && typeof anamneseRaw === 'object') {
        if ('anamnese' in anamneseRaw && typeof anamneseRaw.anamnese === 'string') {
          anamneseRaw = anamneseRaw.anamnese;
        } else {
          anamneseRaw = JSON.stringify(anamneseRaw);
        }
      }
      
      const anamneseFormatted = anamneseRaw && typeof anamneseRaw === 'string'
        ? anamneseRaw.replace(/\\n/g, '\n').replace(/\\r/g, '')
        : (anamneseRaw ? String(anamneseRaw) : '');
      
      console.log("📋 Anamnese formatada:", anamneseFormatted.substring(0, 200));
      setAnalysisResults({ anamnese: anamneseFormatted, cidCodes: [], protocolos: [], exames: [], prescricoes: [] });
      setProntuario((prev) => ({ ...prev, anamnese: anamneseFormatted } as Prontuario));
      setEditedAnamnese(anamneseFormatted);
      setIsEditingAnamnese(true); // Sempre deixar em modo de edição
      // Resetar flag de transcrição finalizada para permitir nova gravação
      setTranscricaoFinalizada(false);
      // Mudar para aba Manual para exibir os campos preenchidos
      setConsultationMode('manual');
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
        // Mudar para aba Manual para exibir os campos preenchidos
        setConsultationMode('manual');
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
            anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
            cidCodes: selectedCidsList,
            exames: allExames,
            protocolos: allProtocolos,
            prescricoes: [
              ...prescricoes,
              ...(analysisResults?.prescricoes?.filter((_, i) => selectedPrescricoesAI.has(i)) || [])
                .filter(rx => !prescricoes.find(p => p.medicamento === rx.medicamento)),
            ],
            atestados,
          },
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar ficha de atendimento");

      const pdfBlob = await response.blob();

      // Assinar digitalmente de forma automática
      let finalBlob = pdfBlob;
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
          const err = await signRes.json().catch(() => ({}));
          if (err.type === "MissingCertificate") {
            toast.warning("Certificado digital não configurado — abrindo sem assinatura.");
          } else if (err.type === "CertificateExpired") {
            toast.warning("Certificado digital expirado — abrindo sem assinatura.");
          } else {
            toast.warning("Não foi possível assinar digitalmente — abrindo sem assinatura.");
          }
        }
      } catch {
        toast.warning("Erro ao assinar digitalmente — abrindo sem assinatura.");
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
        const allExames = [...selectedExamesList, ...examesManuais.map(e => ({ nome: e.nome, tipo: e.tipo }))];
        
        const selectedProtocolosList = analysisResults?.protocolos?.filter((_, i) => selectedProtocolosAI.has(i)).map(p => ({ nome: p.nome, descricao: p.descricao })) || [];
        const protocolosManuaisList = protocolosManuais.map(p => ({ nome: p.nome, descricao: p.descricao }));
        const allProtocolos = [...selectedProtocolosList, ...protocolosManuaisList];
        
        const fichaRequestData = {
          tipoDocumento: "ficha-atendimento",
          consultaId,
          dados: {
            anamnese: prontuario?.anamnese || analysisResults?.anamnese || "",
            cidCodes: selectedCidsList,
            exames: allExames,
            protocolos: allProtocolos,
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
    { id: "guia-consulta-tiss", nome: "Guia Consulta - SADT" },
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

  const handleGenerateDocument = async (modelId: string, extraDados?: Record<string, any>, examesSolicitados?: ExameSolicitado[], prioridade?: PrioridadeTISS) => {
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

      // Obter o blob do PDF (mas não abrir)
      const pdfBlob = await response.blob();

      // Adicionar à lista de documentos gerados
      const novoDocumento = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipoDocumento: modelId,
        nomeDocumento,
        createdAt: new Date().toISOString(),
        pdfBlob,
        assinado: false,
      };

      setDocumentosGerados([...documentosGerados, novoDocumento]);
      setDocumentoSearch("");
      setDocumentoSuggestions([]);
      toast.success("Documento adicionado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar documento:", error);
      toast.error(error.message || "Erro ao gerar documento");
    }
  };

  const handleTissConfirm = async (exames: ExameSolicitado[]) => {
    setTissModalOpen(false);
    setTissGerandoGuia(true);
    try {
      await handleGenerateDocument("guia-consulta-tiss", undefined, exames, examesPrioridade);
    } finally {
      setTissGerandoGuia(false);
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
    id: consulta.paciente.numeroProntuario ? consulta.paciente.numeroProntuario.toString() : "N/A",
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
    ? `Prontuário: ${String(consulta.paciente.numeroProntuario).padStart(5, "0")}`
    : "Prontuário: N/A";
  const hasAllergies = patient.allergies.length > 0;

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
          {/* Faixa de alergias — só aparece se houver */}
          {hasAllergies && (
            <div className="px-6 py-1.5 border-b border-red-100 overflow-x-hidden w-full min-w-0" style={{ backgroundColor: "#FEF2F2" }}>
              <div className="flex items-center gap-2 overflow-x-hidden w-full min-w-0">
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
          <div className="p-6 flex items-center justify-between gap-6 overflow-hidden w-full min-w-0">
            {/* Estilo customizado para o avatar do paciente */}
            <style dangerouslySetInnerHTML={{
              __html: `
                #patient-avatar-${consulta.paciente.id} [class*="AvatarFallback"] {
                  background-color: ${avatarColor.bg} !important;
                  color: ${avatarColor.text} !important;
                }
              `
            }} />
            
            {/* Coluna esquerda — identidade */}
            <div className="flex items-center gap-4 min-w-0 flex-1 overflow-x-hidden">
              <div className="flex-shrink-0 relative" id={`patient-avatar-${consulta.paciente.id}`}>
                <AvatarWithS3
                  avatar={consulta.paciente.usuario?.avatar || null}
                  alt={consulta.paciente.nome}
                  fallback={inicial}
                  className="w-[72px] h-[72px]"
                  fallbackClassName="text-lg font-bold select-none"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-slate-900 truncate">{consulta.paciente.nome}</span>
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
                <div className="flex items-end gap-2 mt-1.5 flex-wrap">
                  {/* Demographics */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">{idade} anos</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(new Date(consulta.paciente.dataNascimento))}</span>
                  </div>

                  {/* Divider */}
                  <span className="h-3.5 w-px bg-slate-200 mx-0.5" />

                  {/* Badges alinhados no bottom */}
                  <div className="flex items-end gap-2 flex-wrap">
                    {/* ID badge - Azul */}
                    <Badge className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                      {prontuarioLabel}
                    </Badge>

                    {/* Tipo consulta badge - Roxo/Indigo */}
                    {consulta.tipoConsulta && (
                      <Badge className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                        {consulta.tipoConsulta.nome}
                      </Badge>
                    )}

                    {/* Plan badge - Verde para convênio, Laranja para particular */}
                    {(consulta as any).operadora ? (
                      <Badge className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                        {(consulta as any).operadora.nomeFantasia}
                        {(consulta as any).planoSaude && ` · ${(consulta as any).planoSaude.nome}`}
                      </Badge>
                    ) : (
                      <Badge className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                        Particular
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna direita — ações (topo) + vitais (baixo) */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-0">
              {/* Botões de ação */}
              <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap justify-end">
                <div className="relative flex items-center gap-2 px-4 py-2.5 flex-shrink-0">
                  {/* Indicador pulsante */}
                  <div className="relative flex items-center gap-2">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    </div>
                    <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap tracking-tight">
                      {sessionDuration}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumoClinicoDialogOpen(true)}
                  className="h-9 px-4 text-xs gap-1.5 border-blue-300 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 flex-shrink-0 font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
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

              {/* Vitais — chips compactos */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-full">
                {vitals.map((v, i) => {
                  const Icon = v.icon;
                  const isDroplet = Icon === Droplet;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0"
                    >
                      {!isDroplet && <Icon className={`w-3 h-3 flex-shrink-0 ${v.iconColor}`} />}
                      <span className="text-[11px] font-bold text-slate-800 tabular-nums leading-none whitespace-nowrap">{v.value}</span>
                      <span className="text-[9px] text-slate-400 leading-none whitespace-nowrap">{v.unit}</span>
                    </div>
                  );
                })}
              </div>
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
            onSendMessage={() => {}}
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
          <div className="grid grid-cols-12 gap-4 items-stretch w-full min-w-0">
            {/* Coluna Anamnese */}
            <div className="col-span-8 h-full flex flex-col min-w-0 overflow-x-hidden">
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
            <div className="col-span-4 min-w-0 overflow-x-hidden">
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
                />
            </div>
          </div>

          </>
        )}
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


          <button
            onClick={handleFinalizarAtendimento}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563eb 100%)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Salvando..." : "Finalizar Atendimento"}
          </button>
        </div>
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

      {/* Modal Guia Consulta TISS — coleta exames antes de gerar */}
      <GuiaTissExamesModal
        key={tissModalOpen ? "tiss-open" : "tiss-closed"}
        isOpen={tissModalOpen}
        onClose={() => setTissModalOpen(false)}
        onConfirm={handleTissConfirm}
        isLoading={tissGerandoGuia}
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                <Pill className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800 truncate">{pendingMedicamento.nome}</span>
              </div>

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
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Duração</label>
                  <Input
                    placeholder="Ex: 7 dias, 1 mês"
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
                >
                  Confirmar Prescrição
                </Button>
              </div>
            </div>
          )}

          {/* ── Passo 1: seleção de medicamento ── */}
          {!pendingMedicamento && (
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
                          onClick={() => handlePreSelectMedicamento(med)}
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
          )} {/* fim passo 1 */}
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
                  onChange={(e) => {
                    setExameSearch(e.target.value);
                    if (activeExameTab === "exames") {
                      fetchExamesCadastrados();
                    } else {
                      fetchGruposExames();
                    }
                  }}
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
                      <p className="text-sm text-slate-500 font-medium">Nenhum exame encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {exameSearch ? "Tente uma busca diferente" : "Digite para buscar exames cadastrados"}
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
                      <p className="text-sm text-slate-500 font-medium">Nenhum grupo de exames encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {exameSearch ? "Tente uma busca diferente" : "Digite para buscar grupos de exames cadastrados"}
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
        </DialogContent>
      </Dialog>

    </div>
  );
}
