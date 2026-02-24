"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  ArrowLeft,
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
  { id: "atestado-aptidao-fisica-mental", nome: "Atestado de Aptidão Física e Mental", descricao: "Atestado comprovando aptidão física e mental para atividades", categoria: "atestados", icon: UserCheck },
  { id: "atestado-aptidao-piscinas", nome: "Atestado de Aptidão para Frequentar Piscinas", descricao: "Atestado comprovando condições de saúde para uso de piscinas", categoria: "atestados", icon: Droplet },
  { id: "atestado-aptidao-fisica", nome: "Atestado de Aptidão Física", descricao: "Atestado comprovando aptidão física para atividades esportivas", categoria: "atestados", icon: Activity },
  { id: "declaracao-comparecimento-acompanhante", nome: "Declaração de Comparecimento (Acompanhante)", descricao: "Declaração para acompanhantes que necessitam comprovar presença", categoria: "atestados", icon: UserCheck },
  { id: "declaracao-comparecimento-horario-cid", nome: "Declaração de Comparecimento de Horário c/ CID", descricao: "Declaração com horário de atendimento e código CID-10", categoria: "atestados", icon: UserCheck },
  { id: "declaracao-comparecimento", nome: "Declaração de Comparecimento", descricao: "Declaração simples de comparecimento à consulta médica", categoria: "atestados", icon: UserCheck },
  { id: "pedido-exames", nome: "Pedido de Exames", descricao: "Solicitação de exames laboratoriais e de imagem", categoria: "exames", icon: FlaskConical },
  { id: "justificativa-exames-plano", nome: "Justificativa de Exames para Planos de Saúde", descricao: "Justificativa médica para autorização de exames pelo plano de saúde", categoria: "exames", icon: ClipboardList },
  { id: "laudo-medico", nome: "Laudo Médico", descricao: "Laudo médico detalhado com diagnóstico e parecer técnico", categoria: "laudos", icon: ScrollText },
  { id: "risco-cirurgico-cardiaco", nome: "Risco Cirúrgico Cardíaco", descricao: "Avaliação de risco cirúrgico cardíaco pré-operatório", categoria: "laudos", icon: Heart },
  { id: "guia-encaminhamento", nome: "Guia de Encaminhamento", descricao: "Guia para encaminhamento a outro especialista ou serviço", categoria: "laudos", icon: Stethoscope },
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
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form fields para atestados
  const [diasAfastamento, setDiasAfastamento] = useState("1");
  const [selectedCid, setSelectedCid] = useState("");
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

  const selectedModelData = selectedModel ? documentModels.find((m) => m.id === selectedModel) : null;

  const handleNext = () => {
    if (!selectedModel) return;
    const model = documentModels.find((m) => m.id === selectedModel);
    if (model?.needsForm) {
      setShowForm(true);
    } else {
      handleGeneratePDF();
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedModel) return;
    setGenerating(true);

    try {
      const cidData = selectedCid
        ? cidCodes.find((c) => c.code === selectedCid)
        : undefined;

      const requestData: any = {
        tipoDocumento: selectedModel,
        consultaId,
        dados: {
          diasAfastamento: parseInt(diasAfastamento) || 1,
          cidCodigo: cidData?.code,
          cidDescricao: cidData?.description,
          observacoes,
          cidade,
        },
      };

      // Adicionar prescrições se for receita médica
      if (selectedModel === "receita-medica") {
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

      // Abrir PDF em nova aba
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("Documento gerado com sucesso!");
      onGenerate(selectedModel, blob);
      resetAndClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar documento");
    } finally {
      setGenerating(false);
    }
  };

  const resetAndClose = () => {
    setSelectedModel(null);
    setShowForm(false);
    setDiasAfastamento("1");
    setSelectedCid("");
    setObservacoes("");
    setCidade("");
    setSearchQuery("");
    onClose();
  };

  // ===========================
  // FORMULÁRIO DO ATESTADO
  // ===========================
  if (showForm && selectedModelData) {
    const Icon = selectedModelData.icon;
    const incluirCid = selectedModel === "atestado-afastamento-cid" ||
      selectedModel === "atestado-afastamento-historico-cid";
    const isIndeterminado = selectedModel === "atestado-afastamento-indeterminado";

    return (
      <Sheet open={isOpen} onOpenChange={resetAndClose}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setShowForm(false)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-slate-800">
                    {selectedModelData.nome}
                  </SheetTitle>
                  <p className="text-xs text-slate-500">Preencha os dados para gerar o documento</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-5">

              {/* Dias de afastamento */}
              {!isIndeterminado && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
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
                  />
                </div>
              )}

              {/* CID */}
              {incluirCid && cidCodes.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    CID-10
                  </label>
                  <div className="space-y-2">
                    {cidCodes.map((cid) => (
                      <button
                        key={cid.code}
                        onClick={() => setSelectedCid(selectedCid === cid.code ? "" : cid.code)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                          selectedCid === cid.code
                            ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800/10"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <Badge className={`font-mono text-xs ${selectedCid === cid.code ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}>
                          {cid.code}
                        </Badge>
                        <span className="text-sm text-slate-600 flex-1">{cid.description}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedCid === cid.code ? "border-slate-800" : "border-slate-300"
                        }`}>
                          {selectedCid === cid.code && <div className="w-2 h-2 rounded-full bg-slate-800" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {incluirCid && cidCodes.length === 0 && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    Codigo CID-10
                  </label>
                  <Input
                    value={selectedCid}
                    onChange={(e) => setSelectedCid(e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200"
                    placeholder="Ex: J11.1"
                  />
                </div>
              )}

              {/* Cidade */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Cidade
                </label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200"
                  placeholder="Ex: Sao Paulo - SP"
                />
              </div>

              {/* Observacoes */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Observacoes <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="min-h-[100px] bg-slate-50 border-slate-200 resize-none text-sm"
                  placeholder="Informacoes adicionais que devem constar no atestado..."
                />
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resumo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Documento</span>
                    <span className="text-slate-800 font-medium">{selectedModelData.nome}</span>
                  </div>
                  {!isIndeterminado && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Afastamento</span>
                      <span className="text-slate-800 font-medium">{diasAfastamento} dia(s)</span>
                    </div>
                  )}
                  {isIndeterminado && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Afastamento</span>
                      <span className="text-slate-800 font-medium">Tempo indeterminado</span>
                    </div>
                  )}
                  {selectedCid && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">CID-10</span>
                      <Badge className="bg-slate-800 text-white font-mono text-xs">{selectedCid}</Badge>
                    </div>
                  )}
                  {cidade && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Cidade</span>
                      <span className="text-slate-800 font-medium">{cidade}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1 h-10 text-sm"
              >
                Voltar
              </Button>
              <Button
                onClick={handleGeneratePDF}
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
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ===========================
  // LISTA DE DOCUMENTOS
  // ===========================
  return (
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
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800/10"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-medium truncate ${isSelected ? "text-slate-800" : "text-slate-700"}`}>
                              {model.nome}
                            </h4>
                            <Badge variant="outline" className="text-xs text-slate-400 border-slate-200 flex-shrink-0">
                              PDF
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{model.descricao}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected ? "border-slate-800" : "border-slate-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-slate-800" />}
                        </div>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          {selectedModelData && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs text-slate-700 font-medium truncate">
                {selectedModelData.nome}
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetAndClose}
              className="flex-1 h-10 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedModel}
              className="flex-1 h-10 text-sm bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              {selectedModelData?.needsForm ? "Preencher dados" : "Gerar PDF"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
