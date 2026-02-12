"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatTime, formatCPF } from '@/lib/utils';
import { useTranscription } from '@/hooks/use-transcription';
import { ProcessingModal } from '@/components/processing-modal';
import { MedicalAnalysisResults } from '@/components/medical-analysis-results';
import { DocumentModelsSheet } from '@/components/document-models-sheet';
import { MicrophoneSelectorModal } from '@/components/microphone-selector-modal';
import { DocumentosConsultaDialog } from '@/components/documentos-consulta-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
  const [isDocumentModelsOpen, setIsDocumentModelsOpen] = useState(false);
  const [isMicrophoneSelectorOpen, setIsMicrophoneSelectorOpen] = useState(false);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | undefined>();
  const [prescricoes, setPrescricoes] = useState<Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>>([]);
  const [selectedCids, setSelectedCids] = useState<Set<number>>(new Set());
  const [selectedExamesAI, setSelectedExamesAI] = useState<Set<number>>(new Set());
  const [selectedPrescricoesAI, setSelectedPrescricoesAI] = useState<Set<number>>(new Set());
  const [medicamentoDialogOpen, setMedicamentoDialogOpen] = useState(false);
  const [medicamentoSearch, setMedicamentoSearch] = useState("");
  const [medicamentos, setMedicamentos] = useState<Array<{ id: string; nome: string; principioAtivo: string | null; laboratorio: string | null; apresentacao: string | null; concentracao: string | null; unidade: string | null }>>([]);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
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
  const [examesSelecionadosParaIA, setExamesSelecionadosParaIA] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [nomeExameInput, setNomeExameInput] = useState("");
  const [arquivoExame, setArquivoExame] = useState<File | null>(null);

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
  const vitals = [
    { icon: Heart, label: "Pressão", value: "120/80", unit: "mmHg", status: "normal" },
    { icon: Activity, label: "Frequência", value: "72", unit: "bpm", status: "normal" },
    { icon: Droplet, label: "Saturação", value: "98", unit: "%", status: "normal" },
    { icon: Weight, label: "Peso", value: "68.5", unit: "kg", status: "normal" },
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
      // Remover da seleção se estava selecionado
      setExamesSelecionadosParaIA((prev) => {
        const next = new Set(prev);
        next.delete(exameId);
        return next;
      });
    } catch (error: any) {
      console.error("Erro ao deletar exame:", error);
      toast.error(error.message || "Erro ao remover exame");
    }
  };

  const handleToggleExameSelecionado = (exameId: string) => {
    setExamesSelecionadosParaIA((prev) => {
      const next = new Set(prev);
      if (next.has(exameId)) {
        next.delete(exameId);
      } else {
        next.add(exameId);
      }
      return next;
    });
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

  // Buscar medicamentos quando o dialog abrir
  useEffect(() => {
    if (medicamentoDialogOpen) {
      fetchMedicamentos();
    }
  }, [medicamentoDialogOpen, medicamentoSearch]);

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

  const handleSelectMedicamento = (medicamento: typeof medicamentos[0]) => {
    if (selectedPrescricaoIndex === null) {
      // Adicionar nova prescrição
      const dosagem = medicamento.concentracao && medicamento.unidade
        ? `${medicamento.concentracao}${medicamento.unidade}`
        : medicamento.apresentacao || "";
      setPrescricoes([...prescricoes, {
        medicamento: medicamento.nome,
        dosagem,
        posologia: "",
        duracao: medicamento.apresentacao || "",
      }]);
    } else {
      // Atualizar prescrição existente
      const next = [...prescricoes];
      const dosagem = medicamento.concentracao && medicamento.unidade
        ? `${medicamento.concentracao}${medicamento.unidade}`
        : medicamento.apresentacao || "";
      next[selectedPrescricaoIndex] = {
        ...next[selectedPrescricaoIndex],
        medicamento: medicamento.nome,
        dosagem,
        duracao: medicamento.apresentacao || next[selectedPrescricaoIndex].duracao,
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

  const handleViewProntuario = (consultaId: string) => {
    router.push(`/prontuarios?consultaId=${consultaId}`);
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
      // Converter Set para Array de IDs dos exames selecionados
      const examesIdsArray = Array.from(examesSelecionadosParaIA);
      
      // Contar quantos são imagens e quantos são PDFs
      const examesSelecionados = examesAnexados.filter(e => examesSelecionadosParaIA.has(e.id));
      const imagensCount = examesSelecionados.filter(e => e.isImage).length;
      const pdfsCount = examesSelecionados.filter(e => e.isPdf).length;

      // Mostrar informação sobre exames selecionados
      if (examesIdsArray.length > 0) {
        toast.info(
          `Processando transcrição com ${imagensCount} imagem(ns) e ${pdfsCount} PDF(s) selecionado(s)`,
          { duration: 3000 }
        );
      }

      // Simular estágios de processamento
      setTimeout(() => setProcessingStage('analyzing'), 1000);
      setTimeout(() => setProcessingStage('generating'), 2000);

      // Passar o modelo selecionado e os exames selecionados para o processamento
      const results = await processTranscription(selectedAIModel, examesIdsArray);
      
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

      toast.success("Atendimento finalizado com sucesso!");
      
      // Redirecionar para a fila de atendimento após um breve delay
      setTimeout(() => {
        router.push("/medico/fila-atendimento");
      }, 1000);
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

  const handleGenerateDocument = async (modelId: string, pdfBlob?: Blob) => {
    console.log("Documento gerado:", modelId);
    
    // Buscar o nome do documento da lista de modelos
    const documentModels = [
      { id: "prontuario-medico", nome: "Prontuário Médico" },
      { id: "receita-medica", nome: "Receita Médica" },
      { id: "atestado-afastamento", nome: "Atestado de Afastamento" },
      { id: "atestado-afastamento-cid", nome: "Atestado de Afastamento c/ CID" },
      { id: "atestado-afastamento-sem-cid", nome: "Atestado de Afastamento s/ CID" },
      { id: "atestado-afastamento-historico-cid", nome: "Atestado de Afastamento com Histórico de CID" },
      { id: "atestado-afastamento-indeterminado", nome: "Atestado de Afastamento Tempo Indeterminado" },
      { id: "pedido-exames", nome: "Pedido de Exames" },
      { id: "justificativa-exames-plano", nome: "Justificativa de Exames para Planos de Saúde" },
      { id: "laudo-medico", nome: "Laudo Médico" },
      { id: "guia-encaminhamento", nome: "Guia de Encaminhamento" },
    ];
    
    const documentModel = documentModels.find((m) => m.id === modelId);
    const nomeDocumento = documentModel?.nome || modelId;

    // Adicionar à lista de documentos gerados
    const novoDocumento = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipoDocumento: modelId,
      nomeDocumento,
      createdAt: new Date().toISOString(),
      pdfBlob, // Armazenar o blob temporariamente
    };

    setDocumentosGerados([...documentosGerados, novoDocumento]);
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
    id: consulta.paciente.id.substring(0, 12).toUpperCase(),
    phone: consulta.paciente.celular || consulta.paciente.telefone || "-",
    email: consulta.paciente.email || "-",
    bloodType: "Não informado", // Campo não disponível no schema atual
    allergies: getPatientAllergies(),
    lastVisit: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Superior */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-8">
          {/* Top Bar - Paciente + Contato + Sinais Vitais */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              {/* Paciente Info */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-base font-semibold text-slate-800">{patient.name}</h1>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                      Em andamento
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                    <span>{patient.age} anos</span>
                    <span>•</span>
                    <span>{patient.bloodType}</span>
                    <span>•</span>
                    <span className="font-mono text-xs text-slate-400">ID: {patient.id}</span>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="max-w-[200px] truncate">{patient.email}</span>
                </div>
              </div>

              {/* Sinais Vitais - Alinhados à direita */}
              <div className="flex items-center gap-2">
                {vitals.map((vital, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <vital.icon className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-slate-800 font-semibold text-sm leading-none">{vital.value}</p>
                      <p className="text-slate-400 text-xs">{vital.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alergias inline se houver */}
            {patient.allergies.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-red-600 uppercase">Alergias:</span>
                <div className="flex gap-1.5">
                  {patient.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.id === 'telemedicina' && <Video className="w-4 h-4 inline mr-1.5" />}
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto">

        {/* Tab Content */}
        <div className="min-h-[400px]">

          {/* Informações Tab */}
          {activeTab === 'informacoes' && (
            <div className="animate-in fade-in duration-500 grid grid-cols-12 gap-6 px-8 pt-6 max-w-[1600px] mx-auto">

              {/* Coluna Esquerda - Exames */}
              <div className="col-span-8">
                <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-slate-500" />
                        Exames do Paciente
                      </CardTitle>
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                        {examesAnexados.length} {examesAnexados.length === 1 ? 'exame' : 'exames'}
                      </Badge>
                      {examesSelecionadosParaIA.size > 0 && (
                        <Badge className="text-xs bg-purple-600 text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {examesSelecionadosParaIA.size} selecionado(s) para IA
                        </Badge>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-slate-600 hover:bg-slate-50 border-slate-300 h-8 text-xs"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <FilePlus className="w-3.5 h-3.5 mr-1.5" />
                      Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {loadingExames ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : examesAnexados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileImage className="w-10 h-10 text-slate-200 mb-2" />
                        <p className="text-sm text-slate-400">Nenhum exame anexado</p>
                        <p className="text-xs text-slate-300 mt-1">Clique em "Adicionar" para anexar imagens ou PDFs</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {examesAnexados.map((exame) => (
                          <div
                            key={exame.id}
                            className="group p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={examesSelecionadosParaIA.has(exame.id)}
                                onCheckedChange={() => handleToggleExameSelecionado(exame.id)}
                                className="flex-shrink-0"
                              />
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                exame.isImage ? 'bg-blue-100' : 'bg-red-100'
                              }`}>
                                {exame.isImage ? (
                                  <FileImage className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <FileText className="w-4 h-4 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-slate-700 text-sm truncate">{exame.nome}</h4>
                                  {exame.isFromCurrentConsulta && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      Esta consulta
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">
                                  {formatDate(new Date(exame.data))} • {exame.isImage ? 'Imagem' : 'PDF'}
                                  {exame.consultaData && !exame.isFromCurrentConsulta && (
                                    <> • Consulta: {formatDate(new Date(exame.consultaData))}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                                  onClick={() => handleDownloadExame(exame.id, exame.s3Key)}
                                  title="Visualizar/Baixar"
                                >
                                  <Download className="w-3.5 h-3.5" />
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
                            {examesSelecionadosParaIA.has(exame.id) && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <Badge className="text-xs bg-purple-600 text-white">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  {exame.isImage ? 'Imagem será analisada pela IA' : 'PDF será incluído no contexto'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita - Histórico de Consultas */}
              <div className="col-span-4">
                <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white h-full">
                  <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-800">
                          Histórico de Consultas
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Consultas anteriores do paciente</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300 font-semibold">
                      {historicoConsultas.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {loadingHistorico ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : historicoConsultas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-sm text-slate-600 font-semibold mb-1">Primeira consulta</p>
                          <p className="text-xs text-slate-400">Nenhum histórico anterior disponível</p>
                        </div>
                      ) : (
                        <div className="p-3 space-y-3">
                          {historicoConsultas.map((consultaHist) => {
                            const dataHora = new Date(consultaHist.dataHora);
                            const prontuario = consultaHist.prontuarios?.[0];
                            const isCurrent = consultaHist.id === consultaId;

                            return (
                              <div
                                key={consultaHist.id}
                                className={`group relative rounded-xl border transition-all duration-200 ${
                                  isCurrent
                                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                                }`}
                              >
                                {isCurrent && (
                                  <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 shadow-md">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                                      Atual
                                    </Badge>
                                  </div>
                                )}
                                
                                <div className="p-4">
                                  {/* Header com data e hora */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isCurrent 
                                          ? 'bg-blue-500 text-white' 
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        <Calendar className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className={`text-sm font-semibold ${
                                          isCurrent ? 'text-blue-900' : 'text-slate-800'
                                        }`}>
                                          {formatDate(dataHora)}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span className="text-xs text-slate-500">
                                            {formatTime(dataHora)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Médico */}
                                  {consultaHist.medico?.usuario?.nome && (
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                      </div>
                                      <p className="text-xs font-medium text-slate-700">
                                        {consultaHist.medico.usuario.nome}
                                      </p>
                                    </div>
                                  )}

                                  {/* Tipo de consulta */}
                                  {consultaHist.tipoConsulta?.nome && (
                                    <div className="mb-3">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          isCurrent 
                                            ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {consultaHist.tipoConsulta.nome}
                                      </Badge>
                                    </div>
                                  )}

                                  {/* Diagnóstico */}
                                  {prontuario?.diagnostico && (
                                    <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                      <p className="text-xs font-medium text-slate-600 mb-1">Diagnóstico:</p>
                                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                                        {prontuario.diagnostico}
                                      </p>
                                    </div>
                                  )}

                                  {/* Ações */}
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    {prontuario && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className={`h-8 text-xs gap-1.5 flex-1 ${
                                          isCurrent
                                            ? 'text-blue-700 hover:text-blue-800 hover:bg-blue-100'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                                        }`}
                                        onClick={() => handleViewProntuario(consultaHist.id)}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Ver prontuário
                                      </Button>
                                    )}
                                    {consultaHist.documentos && consultaHist.documentos.length > 0 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className={`h-8 text-xs gap-1.5 ${
                                          isCurrent
                                            ? 'text-blue-700 hover:text-blue-800 hover:bg-blue-100'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                                        }`}
                                        onClick={() => {
                                          setSelectedConsultaForDocumentos(consultaHist.id);
                                          setSelectedConsultaDataForDocumentos(consultaHist.dataHora);
                                          setDocumentosDialogOpen(true);
                                        }}
                                      >
                                        <FileCheck className="w-3.5 h-3.5" />
                                        <span className="font-semibold">{consultaHist.documentos.length}</span>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Contexto da Consulta Tab */}
          {activeTab === 'contexto-consulta' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">

              {/* ====== WORKFLOW PROGRESS ====== */}
              <div className="flex items-center gap-3 mb-8">
                {[
                  { num: 1, label: 'Transcrição', icon: Mic, done: transcription.length > 0 && !isTranscribing },
                  { num: 2, label: 'Anamnese', icon: Sparkles, done: !!analysisResults?.anamnese },
                  { num: 3, label: 'Diagnóstico & Exames', icon: Stethoscope, done: !!(analysisResults?.cidCodes?.length && analysisResults?.exames?.length) },
                  { num: 4, label: 'Prescrições', icon: Pill, done: prescricoes.length > 0 },
                  { num: 5, label: 'Documentos', icon: FileCheck, done: false },
                ].map((step, idx, arr) => {
                  const isActive = (step.num === 1 && (isTranscribing || (!analysisResults && transcription.length === 0))) ||
                    (step.num === 2 && !isTranscribing && transcription.length > 0 && !analysisResults) ||
                    (step.num === 3 && !!analysisResults && prescricoes.length === 0) ||
                    (step.num === 4 && prescricoes.length > 0) ||
                    (step.num === 5 && false);
                  const Icon = step.icon;
                  return (
                    <React.Fragment key={step.num}>
                      <div className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-slate-800 text-white shadow-md'
                          : step.done
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? 'bg-white text-slate-800'
                            : step.done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-400'
                        }`}>
                          {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.num}
                        </div>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold whitespace-nowrap">{step.label}</span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={`flex-1 h-px ${step.done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="space-y-6">

                {/* ====== SEÇÃO 1: TRANSCRIÇÃO ====== */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-800">Transcrição da Consulta</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Gravação em tempo real (AWS Transcribe) - Selecione o modelo de análise abaixo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Modelo de Análise IA - Apenas OpenAI GPT */}
                      {!isTranscribing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-300 bg-white">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-slate-700">Análise: OpenAI GPT</span>
                        </div>
                      )}
                      {/* Status */}
                      {isTranscribing && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isPaused
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                          {isPaused ? 'Pausado' : 'Gravando'}
                        </div>
                      )}
                      {isTranscribing && (
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                          {sessionDuration}
                        </span>
                      )}
                      {/* Controles */}
                      <div className="flex items-center gap-1.5 ml-2">
                        {!isTranscribing ? (
                          <Button
                            onClick={startTranscription}
                            size="sm"
                            className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs gap-2 rounded-lg"
                          >
                            <Play className="w-3.5 h-3.5" fill="currentColor" />
                            Iniciar Gravação
                          </Button>
                        ) : isPaused ? (
                          <>
                            <Button
                              onClick={resumeTranscription}
                              size="sm"
                              className="h-8 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs gap-1.5 rounded-lg"
                            >
                              <Play className="w-3.5 h-3.5" fill="currentColor" />
                              Retomar
                            </Button>
                            <Button
                              onClick={async () => {
                                await stopTranscription();
                                setTimeout(() => { handleProcessTranscription(); }, 1000);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5 rounded-lg"
                            >
                              <Square className="w-3 h-3" fill="currentColor" />
                              Finalizar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={pauseTranscription}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 border-slate-300 text-slate-600 hover:bg-slate-50 text-xs gap-1.5 rounded-lg"
                            >
                              <Pause className="w-3 h-3" fill="currentColor" />
                              Pausar
                            </Button>
                            <Button
                              onClick={async () => {
                                await stopTranscription();
                                setTimeout(() => { handleProcessTranscription(); }, 1000);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5 rounded-lg"
                            >
                              <Square className="w-3 h-3" fill="currentColor" />
                              Finalizar
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={() => setIsMicrophoneSelectorOpen(true)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg"
                        title="Configurar microfone"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className={`${isTranscribing || transcription.length > 0 ? 'h-[280px]' : 'h-[180px]'} transition-all`}>
                      <div className="p-5 space-y-3">
                        {transcription.length === 0 && !isTranscribing && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                              <Mic className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Pronto para iniciar a consulta</p>
                            <p className="text-xs text-slate-400 mt-1">Clique em "Iniciar Gravação" para transcrever a conversa</p>
                          </div>
                        )}
                        {transcription.map((entry, idx) => {
                          const timeParts = entry.time.split(':');
                          const totalSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1] || '0');
                          return (
                            <div key={idx} className="flex gap-3 group">
                              <span className="text-slate-400 font-mono text-xs mt-0.5 flex-shrink-0 w-14 text-right">
                                {formatTranscriptionTime(totalSeconds)}
                              </span>
                              <div className="flex-1 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 group-hover:bg-slate-100 transition-colors">
                                {entry.text}
                              </div>
                            </div>
                          );
                        })}
                        {isTranscribing && transcription.length === 0 && (
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="ml-2">Ouvindo...</span>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* ====== SEÇÃO 2: ANAMNESE GERADA PELA IA ====== */}
                <Card className={`border shadow-sm overflow-hidden bg-white transition-all ${
                  analysisResults?.anamnese ? 'border-slate-200' : 'border-dashed border-slate-200'
                }`}>
                  <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        analysisResults?.anamnese ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}>
                        <Sparkles className={`w-4 h-4 ${analysisResults?.anamnese ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-800">Anamnese</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Gerada automaticamente pela IA (OpenAI GPT) a partir da transcrição
                          {examesSelecionadosParaIA.size > 0 && (
                            <span className="ml-1 text-purple-600 font-medium">
                              + {examesSelecionadosParaIA.size} exame(s) analisado(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAnamneseEdited && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <Pencil className="w-3 h-3 mr-1" />
                          Editado
                        </Badge>
                      )}
                      {editedAnamnese && !isAnamneseEdited && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Gerada
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    {examesSelecionadosParaIA.size > 0 && editedAnamnese && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-purple-700 mb-1.5">
                              Exames analisados pela IA nesta anamnese:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(examesSelecionadosParaIA).map((exameId) => {
                                const exame = examesAnexados.find(e => e.id === exameId);
                                if (!exame) return null;
                                return (
                                  <Badge key={exameId} variant="outline" className="text-xs bg-white border-purple-300 text-purple-700">
                                    {exame.isImage ? '🖼️' : '📄'} {exame.nome}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {editedAnamnese ? (
                      <>
                        {!isEditingAnamnese ? (
                          <div className="relative">
                            <div 
                              className="min-h-[200px] max-h-[500px] overflow-y-auto bg-white border border-slate-200 rounded-lg p-5 text-sm text-slate-700 leading-relaxed font-sans"
                              style={{ wordBreak: 'break-word' }}
                            >
                              {editedAnamnese.split('\n').map((line, idx, lines) => {
                                const trimmedLine = line.trim();
                                
                                // Identificar títulos (linhas em maiúsculas seguidas de dois pontos, ou linhas curtas em maiúsculas)
                                const isTitle = (
                                  (trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 0 && trimmedLine.length < 60 && trimmedLine.includes(':')) ||
                                  /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+:\s*$/.test(trimmedLine) ||
                                  /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+:\s*$/.test(trimmedLine)
                                ) && trimmedLine.length > 0;
                                
                                // Verificar se a próxima linha tem conteúdo (para não tratar como título se for apenas texto em maiúsculas)
                                const nextLine = idx < lines.length - 1 ? lines[idx + 1].trim() : '';
                                const hasContentAfter = nextLine.length > 0 && !nextLine.toUpperCase().includes(':');
                                
                                if (isTitle && (hasContentAfter || trimmedLine.endsWith(':'))) {
                                  const titleText = trimmedLine.replace(/:$/, '').trim();
                                  return (
                                    <div key={idx} className="mb-4 mt-6 first:mt-0">
                                      <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-2">
                                        {titleText}
                                      </h3>
                                    </div>
                                  );
                                }
                                
                                // Linhas vazias
                                if (trimmedLine === '') {
                                  return <div key={idx} className="h-3" />;
                                }
                                
                                // Texto normal
                                return (
                                  <p key={idx} className="mb-2.5 text-slate-700 leading-6">
                                    {line || '\u00A0'}
                                  </p>
                                );
                              })}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2 h-7 text-xs"
                              onClick={() => setIsEditingAnamnese(true)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Textarea
                              value={editedAnamnese}
                              onChange={(e) => {
                                setEditedAnamnese(e.target.value);
                                setIsAnamneseEdited(e.target.value !== analysisResults?.anamnese);
                              }}
                              className="min-h-[200px] resize-y bg-slate-50 border-slate-200 text-sm text-slate-700 leading-relaxed font-sans focus:ring-1 focus:ring-slate-400 focus:border-slate-400 rounded-lg"
                              placeholder="A anamnese será exibida aqui após o processamento..."
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2 h-7 text-xs"
                              onClick={() => setIsEditingAnamnese(false)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Visualizar
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Anamnese será gerada pela IA</p>
                        <p className="text-xs text-slate-400 mt-1">Finalize a transcrição para a IA processar e gerar automaticamente</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ====== SEÇÃO 3: CID + EXAMES + PRESCRIÇÕES (3 colunas) ====== */}
                <div className="grid grid-cols-3 gap-6">

                  {/* CID-10 Sugeridos */}
                  <Card className={`border shadow-sm overflow-hidden bg-white ${
                    analysisResults?.cidCodes?.length ? 'border-slate-200' : 'border-dashed border-slate-200'
                  }`}>
                    <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          analysisResults?.cidCodes?.length ? 'bg-blue-600' : 'bg-slate-200'
                        }`}>
                          <Activity className={`w-3.5 h-3.5 ${analysisResults?.cidCodes?.length ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <CardTitle className="text-sm font-semibold text-slate-800">CID-10 Sugeridos</CardTitle>
                      </div>
                      {analysisResults?.cidCodes?.length ? (
                        <Badge className="bg-blue-100 text-blue-700 text-xs border-0">
                          {selectedCids.size} aceito(s)
                        </Badge>
                      ) : null}
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[260px]">
                        {analysisResults?.cidCodes && analysisResults.cidCodes.length > 0 ? (
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 rounded bg-amber-50 border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                Sugestões da IA (OpenAI GPT). Selecione os CIDs aplicáveis.
                              </p>
                            </div>
                            {analysisResults.cidCodes.map((cid, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  const next = new Set(selectedCids);
                                  next.has(idx) ? next.delete(idx) : next.add(idx);
                                  setSelectedCids(next);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedCids.has(idx)
                                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <Badge className={`font-mono text-xs ${
                                    selectedCids.has(idx) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                                  }`}>
                                    {cid.code}
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{Math.round(cid.score * 100)}%</span>
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                      selectedCids.has(idx) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                    }`}>
                                      {selectedCids.has(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{cid.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <Activity className="w-8 h-8 text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400">Sugestões após análise</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Exames Sugeridos */}
                  <Card className={`border shadow-sm overflow-hidden bg-white ${
                    analysisResults?.exames?.length ? 'border-slate-200' : 'border-dashed border-slate-200'
                  }`}>
                    <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          analysisResults?.exames?.length ? 'bg-blue-600' : 'bg-slate-200'
                        }`}>
                          <ClipboardList className={`w-3.5 h-3.5 ${analysisResults?.exames?.length ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <CardTitle className="text-sm font-semibold text-slate-800">Exames Sugeridos</CardTitle>
                      </div>
                      {analysisResults?.exames?.length ? (
                        <Badge className="bg-blue-100 text-blue-700 text-xs border-0">
                          {selectedExamesAI.size} aceito(s)
                        </Badge>
                      ) : null}
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[260px]">
                        {analysisResults?.exames && analysisResults.exames.length > 0 ? (
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 rounded bg-amber-50 border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                Sugestões da IA (OpenAI GPT). Selecione os exames que deseja solicitar.
                              </p>
                            </div>
                            {analysisResults.exames.map((exame, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  const next = new Set(selectedExamesAI);
                                  next.has(idx) ? next.delete(idx) : next.add(idx);
                                  setSelectedExamesAI(next);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedExamesAI.has(idx)
                                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="font-medium text-xs text-slate-800">{exame.nome}</h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">{exame.tipo}</Badge>
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                      selectedExamesAI.has(idx) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                    }`}>
                                      {selectedExamesAI.has(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">{exame.justificativa}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <ClipboardList className="w-8 h-8 text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400">Sugestões após análise</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Prescrições */}
                  <Card className={`border shadow-sm overflow-hidden bg-white ${
                    prescricoes.length > 0 ? 'border-slate-200' : 'border-dashed border-slate-200'
                  }`}>
                    <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          prescricoes.length > 0 ? 'bg-amber-600' : 'bg-slate-200'
                        }`}>
                          <Pill className={`w-3.5 h-3.5 ${prescricoes.length > 0 ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <CardTitle className="text-sm font-semibold text-slate-800">Prescrições</CardTitle>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 rounded-lg"
                          onClick={() => {
                            setSelectedPrescricaoIndex(null);
                            setMedicamentoDialogOpen(true);
                          }}
                        >
                          <Search className="w-3 h-3" />
                          Buscar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 rounded-lg"
                          onClick={() => setPrescricoes([...prescricoes, { medicamento: '', dosagem: '', posologia: '', duracao: '' }])}
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[260px]">
                        <div className="p-3 space-y-2">
                          {/* Prescrições Sugeridas pela IA */}
                          {analysisResults?.prescricoes && analysisResults.prescricoes.length > 0 && (
                            <>
                              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 rounded bg-amber-50 border border-amber-200">
                                <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                <p className="text-xs text-amber-700">
                                  Sugestões da IA (OpenAI GPT). Selecione as prescrições que deseja adicionar.
                                </p>
                              </div>
                              {analysisResults.prescricoes.map((presc, idx) => (
                                <div
                                  key={`ai-${idx}`}
                                  onClick={() => {
                                    const next = new Set(selectedPrescricoesAI);
                                    next.has(idx) ? next.delete(idx) : next.add(idx);
                                    setSelectedPrescricoesAI(next);
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    selectedPrescricoesAI.has(idx)
                                      ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-200'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        <Sparkles className="w-2.5 h-2.5 mr-1" />
                                        IA
                                      </Badge>
                                      <h4 className="font-medium text-xs text-slate-800">{presc.medicamento}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                        selectedPrescricoesAI.has(idx) ? 'bg-purple-600 border-purple-600' : 'border-slate-300'
                                      }`}>
                                        {selectedPrescricoesAI.has(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                      <span><strong>Dosagem:</strong> {presc.dosagem}</span>
                                      <span><strong>Posologia:</strong> {presc.posologia}</span>
                                      <span><strong>Duração:</strong> {presc.duracao}</span>
                                    </div>
                                    {presc.justificativa && (
                                      <p className="text-xs text-slate-500 leading-relaxed">{presc.justificativa}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {selectedPrescricoesAI.size > 0 && (
                                <Button
                                  size="sm"
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                                  onClick={() => {
                                    // Adicionar prescrições selecionadas
                                    const novasPrescricoes = Array.from(selectedPrescricoesAI).map(idx => {
                                      const presc = analysisResults!.prescricoes[idx];
                                      return {
                                        medicamento: presc.medicamento,
                                        dosagem: presc.dosagem,
                                        posologia: presc.posologia,
                                        duracao: presc.duracao,
                                      };
                                    });
                                    setPrescricoes([...prescricoes, ...novasPrescricoes]);
                                    setSelectedPrescricoesAI(new Set());
                                    toast.success(`${novasPrescricoes.length} prescrição(ões) adicionada(s)`);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Adicionar {selectedPrescricoesAI.size} prescrição(ões) selecionada(s)
                                </Button>
                              )}
                              {prescricoes.length > 0 && (
                                <div className="my-2 border-t border-slate-200"></div>
                              )}
                            </>
                          )}
                          
                          {/* Prescrições Adicionadas */}
                          {prescricoes.length > 0 && (
                            <>
                              {prescricoes.map((presc, idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">#{idx + 1}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                      onClick={() => setPrescricoes(prescricoes.filter((_, i) => i !== idx))}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Medicamento"
                                      value={presc.medicamento}
                                      onChange={(e) => {
                                        const next = [...prescricoes];
                                        next[idx] = { ...next[idx], medicamento: e.target.value };
                                        setPrescricoes(next);
                                      }}
                                      className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => {
                                        setSelectedPrescricaoIndex(idx);
                                        setMedicamentoDialogOpen(true);
                                      }}
                                      title="Buscar medicamento cadastrado"
                                    >
                                      <Search className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Dosagem"
                                      value={presc.dosagem}
                                      onChange={(e) => {
                                        const next = [...prescricoes];
                                        next[idx] = { ...next[idx], dosagem: e.target.value };
                                        setPrescricoes(next);
                                      }}
                                      className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Duração"
                                      value={presc.duracao}
                                      onChange={(e) => {
                                        const next = [...prescricoes];
                                        next[idx] = { ...next[idx], duracao: e.target.value };
                                        setPrescricoes(next);
                                      }}
                                      className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Posologia (ex: 1 cp de 8/8h)"
                                    value={presc.posologia}
                                    onChange={(e) => {
                                      const next = [...prescricoes];
                                      next[idx] = { ...next[idx], posologia: e.target.value };
                                      setPrescricoes(next);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
                                  />
                                </div>
                              ))}
                            </>
                          )}
                          
                          {/* Mensagem quando não há prescrições nem sugestões */}
                          {prescricoes.length === 0 && (!analysisResults?.prescricoes || analysisResults.prescricoes.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                              <Pill className="w-8 h-8 text-slate-200 mb-2" />
                              <p className="text-xs text-slate-400">Adicione prescrições médicas</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* ====== SEÇÃO 4: GERAÇÃO DE DOCUMENTOS ====== */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-800">Geração de Documentos</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Gere prontuário e receitas a partir dos dados da consulta</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4">
                      {/* Lista de Documentos Gerados */}
                      {documentosGerados.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Documentos Gerados ({documentosGerados.length})
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setIsDocumentModelsOpen(true)}
                            >
                              <FilePlus className="w-3 h-3 mr-1.5" />
                              Adicionar
                            </Button>
                          </div>
                          <ScrollArea className="h-[200px] border rounded-lg">
                            <div className="p-2 space-y-1.5">
                              {documentosGerados.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                      <FileCheck className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">{doc.nomeDocumento}</p>
                                      <p className="text-xs text-slate-500">
                                        {new Date(doc.createdAt).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {doc.pdfBlob && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          const url = URL.createObjectURL(doc.pdfBlob!);
                                          window.open(url, "_blank");
                                        }}
                                        title="Visualizar PDF"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                      onClick={() => {
                                        setDocumentosGerados(documentosGerados.filter((d) => d.id !== doc.id));
                                      }}
                                      title="Remover"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsDocumentModelsOpen(true)}
                          className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500 font-medium">Nenhum documento gerado</p>
                          <p className="text-xs text-slate-400 mt-1">Clique aqui para adicionar documentos</p>
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* ====== BARRA DE AÇÕES FIXA ====== */}
              <div className="fixed bottom-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg" style={{ left: 'var(--sidebar-width, 16rem)' }}>
                <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">{sessionDuration}</span>
                    </div>
                    {transcription.length > 0 && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        {transcription.length} trecho(s) transcritos
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mr-[60px]">
                    <Button
                      variant="outline"
                      className="h-9 px-4 text-sm gap-2"
                      onClick={handleSave}
                      disabled={saving || !analysisResults}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Rascunho
                    </Button>
                    <Button
                      className="h-9 px-6 text-sm gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                      onClick={handleFinalizarAtendimento}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Finalizar Atendimento
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Telemedicina Tab */}
          {activeTab === 'telemedicina' && (
            <div className="grid grid-cols-12 gap-4 animate-in fade-in duration-500">
              
              {/* Main Video Area */}
              <div className="col-span-8 space-y-3">
                
                {/* Patient Video - Large */}
                <Card className="border-slate-200 shadow-2xl shadow-emerald-500/20 overflow-hidden relative group">
                  
                  {/* Video Container */}
                  <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                    {/* Simulated Video Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10" />
                    
                    {/* Patient Video Placeholder */}
                    <div className="relative z-10 text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-pulse">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">{patient.name}</h3>
                      <Badge className="bg-emerald-500 text-white font-semibold text-xs">
                        Conectado
                      </Badge>
                    </div>

                    {/* Connection Quality Indicator */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-lg">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        connectionQuality === 'excellent' ? 'bg-emerald-500' :
                        connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                      } animate-pulse`} />
                      <span className="text-xs text-white font-semibold">
                        {connectionQuality === 'excellent' ? 'Excelente' :
                         connectionQuality === 'good' ? 'Bom' : 'Instável'}
                      </span>
                    </div>

                    {/* Doctor Video - Picture in Picture */}
                    <div className="absolute bottom-3 right-3 w-36 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg border-2 border-white/20 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                        <Badge className="bg-blue-600 text-white text-xs font-semibold w-full justify-center">
                          Você
                        </Badge>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-mono font-bold text-sm">{sessionDuration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Video Controls */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsMicOn(!isMicOn);
                            // O controle de transcrição é feito pelo botão flutuante
                            // Este botão apenas controla o estado visual do microfone
                          }}
                          className={`rounded-full w-10 h-10 ${
                            isMicOn 
                              ? 'bg-slate-700 hover:bg-slate-600' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsCameraOn(!isCameraOn)}
                          className={`rounded-full w-10 h-10 ${
                            isCameraOn 
                              ? 'bg-slate-700 hover:bg-slate-600' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsScreenSharing(!isScreenSharing)}
                          className={`rounded-full w-10 h-10 ${
                            isScreenSharing 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-slate-700 rounded-full"
                          onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-slate-700 rounded-full"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 rounded-full px-6 font-bold text-xs"
                          onClick={() => router.push("/medico/fila-atendimento")}
                        >
                          Encerrar Chamada
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                    <Share2 className="w-5 h-5" />
                    <span className="text-xs font-semibold">Compartilhar Exame</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                    <FileText className="w-5 h-5" />
                    <span className="text-xs font-semibold">Gerar Receita</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                    <Camera className="w-5 h-5" />
                    <span className="text-xs font-semibold">Capturar Imagem</span>
                  </Button>
                </div>
              </div>

              {/* Right Sidebar - Chat & Transcription */}
              <div className="col-span-4 space-y-3">
                
                {/* Patient Info Card - Compact */}
                <Card className="border-slate-200 shadow-lg shadow-blue-100/50 overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{patient.name}</h3>
                        <p className="text-xs text-slate-500">{patient.age} anos • {patient.bloodType}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {vitals.slice(0, 2).map((vital, idx) => (
                        <div key={idx} className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                          <div className="flex items-center gap-1 mb-0.5">
                            <vital.icon className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-bold">{vital.label}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-800">{vital.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs: Chat / Transcrição */}
                <Card className="border-slate-200 shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className={`flex-1 px-3 py-2 font-semibold text-xs transition-all ${
                        isChatOpen
                          ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 inline mr-1.5" />
                      Chat
                    </button>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className={`flex-1 px-3 py-2 font-semibold text-xs transition-all relative ${
                        !isChatOpen
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Mic className="w-3 h-3 inline mr-1.5" />
                      Transcrição
                      {!isChatOpen && isTranscribing && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                          }`} />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Chat Content */}
                  {isChatOpen ? (
                    <>
                      <ScrollArea className="flex-1 p-3">
                        <div className="space-y-2">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] rounded-lg p-2 ${
                                msg.sender === 'doctor'
                                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                <p className="text-xs leading-relaxed">{msg.text}</p>
                                <span className={`text-xs mt-0.5 block ${
                                  msg.sender === 'doctor' ? 'text-blue-100' : 'text-slate-500'
                                }`}>
                                  {msg.time}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <div className="p-2 border-t border-slate-200 bg-slate-50">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && chatMessage.trim()) {
                                // Enviar mensagem
                                setChatMessage('');
                              }
                            }}
                          />
                          <Button size="sm" className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3">
                            <Send className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Transcrição Content */
                    <>
                    {/* Controles de Transcrição - Telemedicina */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        {!isTranscribing && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span className="text-xs text-purple-700 font-medium">Análise: OpenAI GPT</span>
                          </div>
                        )}
                        {isTranscribing && (
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
                            isPaused
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                            }`} />
                            <span className="font-medium">{isPaused ? 'Pausado' : 'Ao vivo'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isTranscribing ? (
                          <Button
                            onClick={startTranscription}
                            size="sm"
                            className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                          >
                            <Play className="w-2.5 h-2.5" fill="currentColor" />
                            Iniciar
                          </Button>
                        ) : isPaused ? (
                          <>
                            <Button
                              onClick={resumeTranscription}
                              size="sm"
                              className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              <Play className="w-2.5 h-2.5" fill="currentColor" />
                              Retomar
                            </Button>
                            <Button
                              onClick={async () => {
                                await stopTranscription();
                                setTimeout(() => { handleProcessTranscription(); }, 1000);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Square className="w-2.5 h-2.5" fill="currentColor" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={pauseTranscription}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 border-amber-300 text-amber-600 hover:bg-amber-50"
                            >
                              <Pause className="w-2.5 h-2.5" fill="currentColor" />
                            </Button>
                            <Button
                              onClick={async () => {
                                await stopTranscription();
                                setTimeout(() => { handleProcessTranscription(); }, 1000);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Square className="w-2.5 h-2.5" fill="currentColor" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {transcription.length === 0 && !isTranscribing && (
                          <div className="text-center py-4">
                            <Mic className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-500">Nenhuma transcrição ainda</p>
                          </div>
                        )}
                        {transcription.map((entry, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge className={`text-xs ${
                                entry.speaker === 'Médico'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-600 text-white'
                              }`}>
                                {entry.speaker}
                              </Badge>
                              <span className="text-xs text-slate-400 font-mono">{entry.time}</span>
                              {entry.isPartial && (
                                <span className="text-xs text-blue-500 font-medium">(digitando...)</span>
                              )}
                            </div>
                            <p className={`text-xs text-slate-700 leading-relaxed pl-1.5 border-l-2 ${
                              entry.isPartial ? 'border-blue-200 border-dashed opacity-75' : 'border-blue-200'
                            }`}>
                              {entry.text}
                            </p>
                          </div>
                        ))}

                        {isTranscribing && transcription.length === 0 && (
                          <div className="flex items-center gap-1.5 text-blue-600 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <span className="text-xs font-medium">Transcrevendo...</span>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    </>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Aba removida - telemedicina-video não é mais usada */}
          {false && activeTab === 'telemedicina-video' && (
            <div className="grid grid-cols-12 gap-4 animate-in fade-in duration-500">
              
              {/* Main Video Area */}
              <div className="col-span-8 space-y-3">
                
                {/* Patient Video - Large */}
                <Card className="border-slate-200 shadow-2xl shadow-emerald-500/20 overflow-hidden relative group">
                  
                  {/* Video Container */}
                  <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                    {/* Simulated Video Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10" />
                    
                    {/* Patient Video Placeholder */}
                    <div className="relative z-10 text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-pulse">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">{patient.name}</h3>
                      <Badge className="bg-emerald-500 text-white font-semibold text-xs">
                        Conectado
                      </Badge>
                    </div>

                    {/* Connection Quality Indicator */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-lg">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        connectionQuality === 'excellent' ? 'bg-emerald-500' :
                        connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                      } animate-pulse`} />
                      <span className="text-xs text-white font-semibold">
                        {connectionQuality === 'excellent' ? 'Excelente' :
                         connectionQuality === 'good' ? 'Bom' : 'Instável'}
                      </span>
                    </div>

                    {/* Doctor Video - Picture in Picture */}
                    <div className="absolute bottom-3 right-3 w-36 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg border-2 border-white/20 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                        <Badge className="bg-blue-600 text-white text-xs font-semibold w-full justify-center">
                          Você
                        </Badge>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-mono font-bold text-sm">{sessionDuration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Video Controls */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setIsMicOn(!isMicOn)}
                          className={`rounded-full w-10 h-10 ${
                            isMicOn 
                              ? 'bg-slate-700 hover:bg-slate-600' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsCameraOn(!isCameraOn)}
                          className={`rounded-full w-10 h-10 ${
                            isCameraOn 
                              ? 'bg-slate-700 hover:bg-slate-600' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsScreenSharing(!isScreenSharing)}
                          className={`rounded-full w-10 h-10 ${
                            isScreenSharing 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-slate-700 rounded-full"
                          onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-slate-700 rounded-full"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 rounded-full px-6 font-bold text-xs"
                          onClick={() => router.push("/medico/fila-atendimento")}
                        >
                          Encerrar Chamada
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                    <Share2 className="w-5 h-5" />
                    <span className="text-xs font-semibold">Compartilhar Exame</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                    <FileText className="w-5 h-5" />
                    <span className="text-xs font-semibold">Gerar Receita</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                    <Camera className="w-5 h-5" />
                    <span className="text-xs font-semibold">Capturar Imagem</span>
                  </Button>
                </div>
              </div>

              {/* Right Sidebar - Chat & Transcription */}
              <div className="col-span-4 space-y-3">
                
                {/* Patient Info Card - Compact */}
                <Card className="border-slate-200 shadow-lg shadow-blue-100/50 overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{patient.name}</h3>
                        <p className="text-xs text-slate-500">{patient.age} anos • {patient.bloodType}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {vitals.slice(0, 2).map((vital, idx) => (
                        <div key={idx} className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                          <div className="flex items-center gap-1 mb-0.5">
                            <vital.icon className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-bold">{vital.label}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-800">{vital.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs: Chat / Transcrição */}
                <Card className="border-slate-200 shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className={`flex-1 px-3 py-2 font-semibold text-xs transition-all ${
                        isChatOpen
                          ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 inline mr-1.5" />
                      Chat
                    </button>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className={`flex-1 px-3 py-2 font-semibold text-xs transition-all relative ${
                        !isChatOpen
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Mic className="w-3 h-3 inline mr-1.5" />
                      Transcrição
                    </button>
                  </div>

                  {/* Chat Content */}
                  {isChatOpen ? (
                    <>
                      <ScrollArea className="flex-1 p-3">
                        <div className="space-y-2">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] rounded-lg p-2 ${
                                msg.sender === 'doctor'
                                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                <p className="text-xs leading-relaxed">{msg.text}</p>
                                <span className={`text-xs mt-0.5 block ${
                                  msg.sender === 'doctor' ? 'text-blue-100' : 'text-slate-500'
                                }`}>
                                  {msg.time}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <div className="p-2 border-t border-slate-200 bg-slate-50">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && chatMessage.trim()) {
                                setChatMessage('');
                              }
                            }}
                          />
                          <Button size="sm" className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3">
                            <Send className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {transcription.length === 0 && !isTranscribing && (
                          <div className="text-center py-4">
                            <Mic className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-500">Nenhuma transcrição ainda</p>
                          </div>
                        )}
                        {transcription.map((entry, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge className={`text-xs ${
                                entry.speaker === 'Médico'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-600 text-white'
                              }`}>
                                {entry.speaker}
                              </Badge>
                              <span className="text-xs text-slate-400 font-mono">{entry.time}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed pl-1.5 border-l-2 border-blue-200">
                              {entry.text}
                            </p>
                          </div>
                        ))}
                        {isTranscribing && transcription.length === 0 && (
                          <div className="flex items-center gap-1.5 text-blue-600 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <span className="text-xs font-medium">Transcrevendo...</span>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Modal de Processamento */}
      <ProcessingModal 
        isOpen={isProcessing} 
        stage={processingStage}
        examesCount={examesSelecionadosParaIA.size}
        imagensCount={examesAnexados.filter(e => examesSelecionadosParaIA.has(e.id) && e.isImage).length}
      />

      {/* Document Models Sheet */}
      <DocumentModelsSheet
        isOpen={isDocumentModelsOpen}
        onClose={() => setIsDocumentModelsOpen(false)}
        onGenerate={handleGenerateDocument}
        consultaId={consultaId}
        cidCodes={analysisResults?.cidCodes?.filter((_, i) => selectedCids.has(i)).map(c => ({ code: c.code, description: c.description }))}
        prescricoes={prescricoes}
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

      {/* Dialog de Seleção de Medicamentos */}
      <Dialog open={medicamentoDialogOpen} onOpenChange={setMedicamentoDialogOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Medicamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar medicamento por nome, princípio ativo ou laboratório..."
                value={medicamentoSearch}
                onChange={(e) => setMedicamentoSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 border rounded-lg min-h-0">
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
            </ScrollArea>
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
    </div>
  );
}
