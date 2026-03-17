"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Search,
  Printer,
  Pill,
  ShieldCheck,
  ClipboardList,
  Heart,
  Droplet,
  UserCheck,
  FileCheck,
  Stethoscope,
  FlaskConical,
  Scale,
  ScrollText,
  Activity,
  Loader2,
  Calendar,
  Hash,
  MessageSquare,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DocumentModel {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  icon: any;
  needsForm?: boolean;
}

interface DocumentModelsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (modelId: string, pdfBlob?: Blob) => void;
  consultaId: string;
  cidCodes?: Array<{ code: string; description: string }>;
  prescricoes?: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

const documentCategories = [
  { id: "todos", label: "Todos" },
  { id: "prontuario", label: "Prontuário" },
  { id: "receitas", label: "Receitas" },
  { id: "atestados", label: "Atestados" },
  { id: "exames", label: "Exames" },
  { id: "laudos", label: "Laudos" },
  { id: "outros", label: "Outros" },
];

const documentModels: DocumentModel[] = [
  { id: "prontuario-medico", nome: "Prontuário Médico", descricao: "Prontuário completo com anamnese, exame físico, diagnóstico e conduta", categoria: "prontuario", icon: FileText },
  { id: "receita-medica", nome: "Receita Médica", descricao: "Receita médica simples com prescrições do atendimento", categoria: "receitas", icon: Pill },
  { id: "receita-controle-especial", nome: "Receita de Controle Especial", descricao: "Receita para medicamentos controlados (portaria 344/98)", categoria: "receitas", icon: ShieldCheck },
  { id: "receita-tipo-ba", nome: "Receita Tipo B", descricao: "Receita especial para substâncias tipo B e A", categoria: "receitas", icon: ShieldCheck },
  { id: "atestado-afastamento", nome: "Atestado de Afastamento", descricao: "Atestado médico para afastamento do trabalho ou atividades", categoria: "atestados", icon: FileCheck, needsForm: true },
  { id: "atestado-afastamento-cid", nome: "Atestado de Afastamento c/ CID", descricao: "Atestado de afastamento incluindo código CID-10 do diagnóstico", categoria: "atestados", icon: FileCheck, needsForm: true },
  { id: "atestado-afastamento-sem-cid", nome: "Atestado de Afastamento s/ CID", descricao: "Atestado de afastamento sem exposição do código CID-10", categoria: "atestados", icon: FileCheck, needsForm: true },
  { id: "atestado-afastamento-historico-cid", nome: "Atestado de Afastamento com Histórico de CID", descricao: "Atestado com histórico completo de CIDs relacionados ao afastamento", categoria: "atestados", icon: FileCheck, needsForm: true },
  { id: "atestado-afastamento-indeterminado", nome: "Atestado de Afastamento Tempo Indeterminado", descricao: "Atestado de afastamento por tempo indeterminado", categoria: "atestados", icon: FileCheck, needsForm: true },
  { id: "atestado-aptidao-fisica-mental", nome: "Atestado de Aptidão Física e Mental", descricao: "Atestado comprovando aptidão física e mental para atividades", categoria: "atestados", icon: UserCheck, needsForm: true },
  { id: "atestado-aptidao-piscinas", nome: "Atestado de Aptidão para Frequentar Piscinas", descricao: "Atestado comprovando condições de saúde para uso de piscinas", categoria: "atestados", icon: Droplet, needsForm: true },
  { id: "atestado-aptidao-fisica", nome: "Atestado de Aptidão Física", descricao: "Atestado comprovando aptidão física para atividades esportivas", categoria: "atestados", icon: Activity, needsForm: true },
  { id: "declaracao-comparecimento-acompanhante", nome: "Declaração de Comparecimento (Acompanhante)", descricao: "Declaração para acompanhantes que necessitam comprovar presença", categoria: "atestados", icon: UserCheck },
  { id: "declaracao-comparecimento-horario-cid", nome: "Declaração de Comparecimento de Horário c/ CID", descricao: "Declaração com horário de atendimento e código CID-10", categoria: "atestados", icon: UserCheck },
  { id: "declaracao-comparecimento", nome: "Declaração de Comparecimento", descricao: "Declaração simples de comparecimento à consulta médica", categoria: "atestados", icon: UserCheck },
  { id: "pedido-exames", nome: "Pedido de Exames", descricao: "Solicitação de exames laboratoriais e de imagem", categoria: "exames", icon: FlaskConical },
  { id: "justificativa-exames-plano", nome: "Justificativa de Exames para Planos de Saúde", descricao: "Justificativa médica para autorização de exames pelo plano de saúde", categoria: "exames", icon: ClipboardList },
  { id: "laudo-medico", nome: "Laudo Médico", descricao: "Laudo médico detalhado com diagnóstico e parecer técnico", categoria: "laudos", icon: ScrollText },
  { id: "risco-cirurgico-cardiaco", nome: "Risco Cirúrgico Cardíaco", descricao: "Avaliação de risco cirúrgico cardíaco pré-operatório", categoria: "laudos", icon: Heart },
  { id: "guia-encaminhamento", nome: "Guia de Encaminhamento", descricao: "Guia para encaminhamento a outro especialista ou serviço", categoria: "laudos", icon: Stethoscope },
  { id: "guia-consulta-tiss", nome: "Guia Consulta - SADT", descricao: "Guia de consulta padrão TISS para planos de saúde (ANS) — A4 paisagem", categoria: "laudos", icon: ClipboardList },
  { id: "controle-diabetes-analitico", nome: "Controle de Diabetes Analítico", descricao: "Ficha analítica de acompanhamento de diabetes com gráficos e métricas", categoria: "outros", icon: Activity },
  { id: "controle-diabetes", nome: "Controle de Diabetes", descricao: "Ficha de controle e acompanhamento de diabetes", categoria: "outros", icon: Activity },
  { id: "controle-pressao-arterial-analitico", nome: "Controle de Pressão Arterial Analítico", descricao: "Ficha analítica de acompanhamento de pressão arterial com métricas", categoria: "outros", icon: Heart },
  { id: "controle-pressao-arterial", nome: "Controle de Pressão Arterial", descricao: "Ficha de controle e acompanhamento de pressão arterial", categoria: "outros", icon: Heart },
  { id: "termo-consentimento", nome: "Termo de Consentimento", descricao: "Termo de consentimento livre e esclarecido para procedimentos", categoria: "outros", icon: Scale },
];

export function DocumentModelsSheet({
  isOpen,
  onClose,
  onGenerate,
  consultaId,
  cidCodes = [],
  prescricoes = [],
}: DocumentModelsSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [generating, setGenerating] = useState(false);

  // Modal de formulário
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formModel, setFormModel] = useState<DocumentModel | null>(null);

  // Campos do formulário
  const [diasAfastamento, setDiasAfastamento] = useState("1");
  const [mesesValidade, setMesesValidade] = useState("6");
  const [observacoes, setObservacoes] = useState("");
  const [cidade, setCidade] = useState("");

  const filteredModels = documentModels.filter((model) => {
    const matchesCategory = activeCategory === "todos" || model.categoria === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      model.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedModels: Record<string, DocumentModel[]> = {};
  filteredModels.forEach((model) => {
    const cat = model.categoria;
    if (!groupedModels[cat]) groupedModels[cat] = [];
    groupedModels[cat].push(model);
  });

  const categoryLabels: Record<string, string> = {
    prontuario: "Prontuário",
    receitas: "Receitas",
    atestados: "Atestados & Declarações",
    exames: "Exames",
    laudos: "Laudos & Encaminhamentos",
    outros: "Controles & Outros",
  };

  const handleDocumentClick = (model: DocumentModel) => {
    if (model.needsForm) {
      setFormModel(model);
      setFormDialogOpen(true);
    } else {
      handleGeneratePDF(model.id);
    }
  };

  const handleGeneratePDF = async (modelId: string) => {
    setGenerating(true);

    try {
      // CID vem automaticamente do diagnóstico da IA (primeiro da lista)
      const cidData = cidCodes.length > 0 ? cidCodes[0] : undefined;

      const requestData: any = {
        tipoDocumento: modelId,
        consultaId,
        dados: {
          diasAfastamento: parseInt(diasAfastamento) || 1,
          mesesValidade: parseInt(mesesValidade) || 6,
          cidCodigo: cidData?.code,
          cidDescricao: cidData?.description,
          observacoes,
          cidade,
        },
      };

      // Adicionar prescrições se for receita médica
      if (modelId === "receita-medica") {
        if (prescricoes && prescricoes.length > 0) {
          const prescricoesValidas = prescricoes.filter(
            (p) => p.medicamento && p.medicamento.trim() !== ""
          );
          if (prescricoesValidas.length > 0) {
            requestData.dados.prescricoes = prescricoesValidas;
          }
        }
      }

      const response = await fetch("/api/medico/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar documento");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("Documento gerado com sucesso!");
      onGenerate(modelId, blob);
      closeFormDialog();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar documento");
    } finally {
      setGenerating(false);
    }
  };

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    setFormModel(null);
    setDiasAfastamento("1");
    setMesesValidade("6");
    setObservacoes("");
    setCidade("");
  };

  const resetAndClose = () => {
    closeFormDialog();
    setSearchQuery("");
    onClose();
  };

  const isIndeterminado = formModel?.id === "atestado-afastamento-indeterminado";
  const isAptidao = formModel?.id === "atestado-aptidao-fisica-mental" ||
    formModel?.id === "atestado-aptidao-piscinas" ||
    formModel?.id === "atestado-aptidao-fisica";
  const cidAutomatico = cidCodes.length > 0 ? cidCodes[0] : undefined;

  return (
    <>
      {/* Sheet com lista de documentos */}
      <Sheet open={isOpen} onOpenChange={resetAndClose}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                Gerar Documento
              </SheetTitle>
              <p className="text-xs text-slate-500 mt-1">Selecione o tipo de documento que deseja gerar para esta consulta</p>
            </SheetHeader>

            <div className="relative">
              <Input
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:ring-1 focus:ring-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex gap-1.5 mt-3 flex-wrap">
              {documentCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Document List */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-5">
              {Object.entries(groupedModels).map(([category, models]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-1.5">
                    {models.map((model) => {
                      const Icon = model.icon;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleDocumentClick(model)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all flex items-start gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-slate-700 truncate">
                                {model.nome}
                              </h4>
                              <Badge variant="outline" className="text-xs text-slate-400 border-slate-200 flex-shrink-0">
                                PDF
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{model.descricao}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredModels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">Nenhum documento encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou categoria</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Modal de preenchimento de dados */}
      {formModel && (
        <Dialog open={formDialogOpen} onOpenChange={closeFormDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-800">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <formModel.icon className="w-3.5 h-3.5 text-white" />
                </div>
                {formModel.nome}
              </DialogTitle>
              <p className="text-xs text-slate-500 pt-1">Informe os dados para gerar o documento</p>
            </DialogHeader>

            <div className="space-y-4 py-2">

              {/* Dias de afastamento */}
              {!isAptidao && !isIndeterminado && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Dias de Afastamento
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={diasAfastamento}
                    onChange={(e) => setDiasAfastamento(e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200"
                    placeholder="1"
                    autoFocus
                  />
                </div>
              )}

              {/* Meses de validade */}
              {isAptidao && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Validade (meses)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={mesesValidade}
                    onChange={(e) => setMesesValidade(e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200"
                    placeholder="6"
                    autoFocus
                  />
                </div>
              )}

              {/* CID automático do diagnóstico da IA */}
              {cidAutomatico && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    CID-10 <span className="text-slate-400 font-normal">(diagnóstico da IA)</span>
                  </label>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <Badge className="bg-slate-800 text-white font-mono text-xs flex-shrink-0">
                      {cidAutomatico.code}
                    </Badge>
                    <span className="text-sm text-slate-600">{cidAutomatico.description}</span>
                  </div>
                </div>
              )}

              {/* Cidade */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Cidade <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200"
                  placeholder="Ex: São Paulo - SP"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Observações <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="min-h-[80px] bg-slate-50 border-slate-200 resize-none text-sm"
                  placeholder="Informações adicionais que devem constar no documento..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeFormDialog} className="flex-1 h-10 text-sm">
                Cancelar
              </Button>
              <Button
                onClick={() => handleGeneratePDF(formModel.id)}
                disabled={generating}
                className="flex-1 h-10 text-sm bg-slate-800 hover:bg-slate-900 text-white"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                {generating ? "Gerando..." : "Gerar PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
