"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { Loader2, Search, X, CheckCircle2, AlertTriangle, Package, Pill, CreditCard, User } from "lucide-react";
import { maskCPF, removeMask } from "@/lib/masks";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  celular?: string;
}

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number;
  procedimentosMedicamentos: Array<{
    id: string;
    quantidade: number | null;
    observacoes: string | null;
    medicamento: {
      id: string;
      nome: string;
      estoqueMedicamento: {
        id: string;
        quantidadeAtual: number;
        quantidadeMinima: number;
      } | null;
    };
  }>;
  procedimentosInsumos: Array<{
    id: string;
    quantidade: number | null;
    observacoes: string | null;
    insumo: {
      id: string;
      nome: string;
    };
  }>;
}

interface FormaPagamento {
  id: string;
  nome: string;
  tipo: string;
}

// Componente de busca de procedimento
function ProcedimentoSearchInput({
  value,
  onChange,
  onSelect,
  procedimentos,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (procedimento: Procedimento | null) => void;
  procedimentos: Procedimento[];
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProcedimentos, setFilteredProcedimentos] = useState<Procedimento[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedProcedimento, setSelectedProcedimento] = useState<Procedimento | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProcedimento && value === `${selectedProcedimento.codigo} - ${selectedProcedimento.nome}`) {
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      setFilteredProcedimentos([]);
      setShowResults(false);
      return;
    }

    const filtered = procedimentos.filter((proc) => {
      const codigo = proc.codigo.toLowerCase();
      const nome = proc.nome.toLowerCase();
      return codigo.includes(term) || nome.includes(term);
    });

    setFilteredProcedimentos(filtered);
    setShowResults(filtered.length > 0);
  }, [searchTerm, procedimentos, selectedProcedimento, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProcedimento = useCallback((procedimento: Procedimento) => {
    setSelectedProcedimento(procedimento);
    const displayValue = `${procedimento.codigo} - ${procedimento.nome}`;
    setSearchTerm(displayValue);
    setShowResults(false);
    setFilteredProcedimentos([]);
    onChange(displayValue);
    onSelect(procedimento);
  }, [onChange, onSelect]);

  const handleClear = () => {
    setSearchTerm("");
    setSelectedProcedimento(null);
    setFilteredProcedimentos([]);
    setShowResults(false);
    onChange("");
    onSelect(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onChange(value);
    
    if (!value) {
      handleClear();
    } else {
      // Se o valor não corresponde ao procedimento selecionado, limpar seleção
      if (selectedProcedimento && value !== `${selectedProcedimento.codigo} - ${selectedProcedimento.nome}`) {
        setSelectedProcedimento(null);
        onSelect(null);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite o código ou nome do procedimento"
          value={searchTerm}
          onChange={handleInputChange}
          className={cn(
            "h-8 text-xs pl-8 pr-8",
            error && "border-destructive"
          )}
          maxLength={100}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {showResults && filteredProcedimentos.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredProcedimentos.map((procedimento) => (
            <button
              key={procedimento.id}
              type="button"
              onClick={() => handleSelectProcedimento(procedimento)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium">{procedimento.codigo} - {procedimento.nome}</div>
              {procedimento.descricao && (
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  {procedimento.descricao}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de busca de paciente
function PacienteSearchInput({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (paciente: Paciente) => void;
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    if (!paciente.id) return;
    
    setSelectedPaciente(paciente);
    const cpfFormatado = maskCPF(paciente.cpf);
    setSearchTerm(cpfFormatado);
    setShowResults(false);
    setPacientes([]);
    onChange(cpfFormatado);
    onSelect(paciente);
  }, [onChange, onSelect]);

  useEffect(() => {
    const searchPacientes = async () => {
      const term = searchTerm.trim();
      
      if (selectedPaciente && term === maskCPF(selectedPaciente.cpf)) {
        return;
      }

      const cpfLimpo = removeMask(term);
      const isCPF = cpfLimpo.length === 11 && /^\d+$/.test(cpfLimpo);
      const isNome = term.length >= 3 && !/^\d+$/.test(term);

      if (!isCPF && !isNome) {
        setPacientes([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        const searchQuery = isCPF ? cpfLimpo : term;
        const response = await fetch(`/api/secretaria/pacientes?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPacientes(data.pacientes || []);
          setShowResults(true);
          
          if (isCPF && data.pacientes?.length === 1) {
            handleSelectPaciente(data.pacientes[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPacientes, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedPaciente, handleSelectPaciente]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setSearchTerm("");
    setSelectedPaciente(null);
    setPacientes([]);
    setShowResults(false);
    onChange("");
    onSelect({ id: "", nome: "", cpf: "" } as Paciente);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cpfLimpo = removeMask(value);
    const maskedValue = cpfLimpo.length > 0 && /^\d+$/.test(cpfLimpo) 
      ? maskCPF(value) 
      : value;
    
    setSearchTerm(maskedValue);
    onChange(maskedValue);
    
    if (!value) {
      handleClear();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite o CPF ou nome do paciente"
          value={searchTerm}
          onChange={handleInputChange}
          className={cn(
            "h-8 text-xs pl-8 pr-8",
            error && "border-destructive"
          )}
          maxLength={50}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {showResults && pacientes.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {pacientes.map((paciente) => (
            <button
              key={paciente.id}
              type="button"
              onClick={() => handleSelectPaciente(paciente)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium">{paciente.nome}</div>
              <div className="text-muted-foreground text-[10px]">
                CPF: {maskCPF(paciente.cpf)}
                {paciente.email && ` • ${paciente.email}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExecutarProcedimentoContent() {
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [pacienteSearchValue, setPacienteSearchValue] = useState("");
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [procedimentoSelecionado, setProcedimentoSelecionado] = useState<Procedimento | null>(null);
  const [procedimentoSearchValue, setProcedimentoSearchValue] = useState("");
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>("");
  const [valorPago, setValorPago] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [procedimentosRes, formasPagamentoRes] = await Promise.all([
          fetch("/api/secretaria/procedimentos"),
          fetch("/api/admin-clinica/formas-pagamento?limit=1000"),
        ]);

        if (procedimentosRes.ok) {
          const data = await procedimentosRes.json();
          setProcedimentos(data.procedimentos || []);
        }

        if (formasPagamentoRes.ok) {
          const data = await formasPagamentoRes.json();
          setFormasPagamento(data.formasPagamento || []);
          console.log("Formas de pagamento carregadas:", data.formasPagamento?.length || 0);
        } else {
          const errorData = await formasPagamentoRes.json().catch(() => ({}));
          console.error("Erro ao carregar formas de pagamento:", formasPagamentoRes.status, errorData);
          toast.error("Erro ao carregar formas de pagamento");
        }
      } catch (error) {
        toast.error("Erro ao carregar dados");
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handlePacienteSelect = (paciente: Paciente) => {
    if (paciente.id) {
      setPacienteSelecionado(paciente);
    }
  };

  const handleProcedimentoSelect = (procedimento: Procedimento | null) => {
    setProcedimentoSelecionado(procedimento);
    if (procedimento) {
      setValorPago(procedimento.valor.toString());
    } else {
      setValorPago("");
    }
  };

  const validarEstoque = () => {
    if (!procedimentoSelecionado) return { valido: false, erros: [] };

    const erros: string[] = [];
    for (const procMed of procedimentoSelecionado.procedimentosMedicamentos) {
      const estoque = procMed.medicamento.estoqueMedicamento;
      if (!estoque) {
        erros.push(`${procMed.medicamento.nome} - Estoque não cadastrado`);
        continue;
      }

      const quantidadeNecessaria = Number(procMed.quantidade || 0);
      if (estoque.quantidadeAtual < quantidadeNecessaria) {
        erros.push(
          `${procMed.medicamento.nome} - Estoque insuficiente (disponível: ${estoque.quantidadeAtual}, necessário: ${quantidadeNecessaria})`
        );
      }
    }

    return { valido: erros.length === 0, erros };
  };

  const handleConfirmar = () => {
    if (!pacienteSelecionado || !procedimentoSelecionado || !formaPagamentoId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const validacao = validarEstoque();
    if (!validacao.valido) {
      toast.error("Estoque insuficiente para alguns medicamentos");
      return;
    }

    const valor = parseFloat(valorPago.replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    setConfirmDialogOpen(true);
  };

  const handleExecutar = async () => {
    if (!pacienteSelecionado || !procedimentoSelecionado || !formaPagamentoId) {
      return;
    }

    try {
      setLoading(true);
      const valor = parseFloat(valorPago.replace(",", "."));

      const response = await fetch("/api/secretaria/executar-procedimento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedimentoId: procedimentoSelecionado.id,
          pacienteId: pacienteSelecionado.id,
          formaPagamentoId,
          valorPago: valor,
          observacoes: observacoes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao executar procedimento");
      }

      toast.success("Procedimento executado com sucesso!");
      setConfirmDialogOpen(false);
      
      // Limpar formulário
      setPacienteSelecionado(null);
      setPacienteSearchValue("");
      setProcedimentoSelecionado(null);
      setProcedimentoSearchValue("");
      setFormaPagamentoId("");
      setValorPago("");
      setObservacoes("");

      // Recarregar procedimentos para atualizar estoque
      const procedimentosRes = await fetch("/api/secretaria/procedimentos");
      if (procedimentosRes.ok) {
        const data = await procedimentosRes.json();
        setProcedimentos(data.procedimentos || []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao executar procedimento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validacaoEstoque = validarEstoque();

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Package}
        title="Executar Procedimento"
        subtitle="Execute procedimentos, registre pagamentos e dê baixa no estoque"
      />

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Procedimento</CardTitle>
              <CardDescription className="text-xs">
                Selecione o paciente e o procedimento a ser executado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paciente */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Paciente *</label>
                <PacienteSearchInput
                  value={pacienteSearchValue}
                  onChange={setPacienteSearchValue}
                  onSelect={handlePacienteSelect}
                />
                {pacienteSelecionado && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{pacienteSelecionado.nome}</p>
                      <p className="text-[10px] text-muted-foreground">
                        CPF: {maskCPF(pacienteSelecionado.cpf)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Procedimento */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Procedimento *</label>
                <ProcedimentoSearchInput
                  value={procedimentoSearchValue}
                  onChange={setProcedimentoSearchValue}
                  onSelect={handleProcedimentoSelect}
                  procedimentos={procedimentos}
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Forma de Pagamento *</label>
                {formasPagamento.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 border rounded-md">
                    {loadingData ? "Carregando..." : "Nenhuma forma de pagamento disponível"}
                  </div>
                ) : (
                  <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      {formasPagamento.map((fp) => (
                        <SelectItem key={fp.id} value={fp.id} className="text-xs">
                          {fp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Valor Pago *</label>
                <Input
                  type="text"
                  value={valorPago}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,.-]/g, "");
                    setValorPago(value);
                  }}
                  placeholder="0,00"
                  className="h-8 text-xs"
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Observações</label>
                <Input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                  className="h-8 text-xs"
                />
              </div>

              <Button
                onClick={handleConfirmar}
                disabled={!pacienteSelecionado || !procedimentoSelecionado || !formaPagamentoId || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar e Executar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Informações do Procedimento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes do Procedimento</CardTitle>
              <CardDescription className="text-xs">
                Informações sobre medicamentos e insumos necessários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {procedimentoSelecionado ? (
                <>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{procedimentoSelecionado.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      Código: {procedimentoSelecionado.codigo}
                    </p>
                    {procedimentoSelecionado.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {procedimentoSelecionado.descricao}
                      </p>
                    )}
                    <p className="text-sm font-medium mt-2">
                      Valor: R$ {Number(procedimentoSelecionado.valor).toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {/* Medicamentos */}
                  {procedimentoSelecionado.procedimentosMedicamentos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5" />
                        Medicamentos Necessários
                      </h4>
                      <div className="space-y-2">
                        {procedimentoSelecionado.procedimentosMedicamentos.map((procMed) => {
                          const estoque = procMed.medicamento.estoqueMedicamento;
                          const quantidadeNecessaria = Number(procMed.quantidade || 0);
                          const temEstoque = estoque && estoque.quantidadeAtual >= quantidadeNecessaria;

                          return (
                            <div
                              key={procMed.id}
                              className="p-2 border rounded-md bg-muted/50"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {procMed.medicamento.nome}
                                </span>
                                {temEstoque ? (
                                  <Badge variant="outline" className="bg-green-50 border-green-500 text-green-700 text-[10px]">
                                    Disponível
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 border-red-500 text-red-700 text-[10px]">
                                    Insuficiente
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Quantidade: {quantidadeNecessaria}
                                {estoque && (
                                  <span className="ml-2">
                                    (Estoque: {estoque.quantidadeAtual})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Insumos */}
                  {procedimentoSelecionado.procedimentosInsumos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <Package className="h-3.5 w-3.5" />
                        Insumos Necessários
                      </h4>
                      <div className="space-y-2">
                        {procedimentoSelecionado.procedimentosInsumos.map((procInsumo) => (
                          <div
                            key={procInsumo.id}
                            className="p-2 border rounded-md bg-muted/50"
                          >
                            <div className="text-xs font-medium">{procInsumo.insumo.nome}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              Quantidade: {Number(procInsumo.quantidade || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerta de Estoque */}
                  {!validacaoEstoque.valido && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-xs">Estoque Insuficiente</AlertTitle>
                      <AlertDescription className="text-xs">
                        <ul className="list-disc list-inside mt-1">
                          {validacaoEstoque.erros.map((erro, index) => (
                            <li key={index}>{erro}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Selecione um procedimento para visualizar os detalhes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Confirmar Execução</DialogTitle>
            <DialogDescription className="text-xs">
              Confirme os dados antes de executar o procedimento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Paciente</p>
              <p className="text-sm">{pacienteSelecionado?.nome}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Procedimento</p>
              <p className="text-sm">{procedimentoSelecionado?.nome}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Valor</p>
              <p className="text-sm">
                R$ {valorPago ? parseFloat(valorPago.replace(",", ".")).toFixed(2).replace(".", ",") : "0,00"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleExecutar} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                "Confirmar e Executar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

