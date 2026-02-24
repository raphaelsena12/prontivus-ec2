"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  Download,
  Printer,
  ArrowLeft,
  Loader2,
  Stethoscope,
  Pill,
  ClipboardList,
  FileCheck,
  CreditCard,
  MessageSquare,
  Building2,
  History,
  Activity,
  Heart,
  Droplet,
  Weight,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCPF } from '@/lib/utils';
import { DadosPessoaisSection } from './components/dados-pessoais-section';
import { PlanosSaudeSection } from './components/planos-saude-section';
import { HistoricoConsultasSection } from './components/historico-consultas-section';
import { ProntuariosSection } from './components/prontuarios-section';
import { ExamesSection } from './components/exames-section';
import { PrescricoesSection } from './components/prescricoes-section';
import { PagamentosSection } from './components/pagamentos-section';
import { DocumentosSection } from './components/documentos-section';
import { MensagensSection } from './components/mensagens-section';

interface ProntuarioCompleto {
  paciente: {
    id: string;
    numeroProntuario: number | null;
    nome: string;
    cpf: string;
    rg: string | null;
    dataNascimento: string;
    sexo: string;
    email: string | null;
    telefone: string | null;
    celular: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    nomeMae: string | null;
    nomePai: string | null;
    profissao: string | null;
    estadoCivil: string | null;
    observacoes: string | null;
  };
  planosSaude: any[];
  consultas: any[];
  prontuarios: any[];
  solicitacoesExames: any[];
  prescricoes: any[];
  pagamentos: any[];
  documentos: any[];
  mensagens: any[];
}

interface ProntuarioPacienteContentProps {
  pacienteId: string;
}

export function ProntuarioPacienteContent({ pacienteId }: ProntuarioPacienteContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProntuarioCompleto | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dados-pessoais');

  useEffect(() => {
    fetchProntuarioCompleto();
  }, [pacienteId]);

  const fetchProntuarioCompleto = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/paciente/${pacienteId}/prontuario-completo`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (error: any) {
      const errorMessage = error.message || "Erro ao carregar prontuário completo";
      toast.error(errorMessage);
      console.error("Erro ao buscar prontuário completo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    toast.info("Funcionalidade de exportação PDF em desenvolvimento");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">Carregando prontuário completo...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800 mb-2">Prontuário não encontrado</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const paciente = data.paciente;

  // Calcular idade
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

  const idade = calcularIdade(paciente.dataNascimento);

  // Tabs de navegação
  const tabs = [
    { id: 'dados-pessoais', label: 'Dados Pessoais', icon: User },
    { id: 'consultas', label: 'Consultas', icon: Calendar },
    { id: 'prontuarios', label: 'Prontuários', icon: FileText },
    { id: 'exames', label: 'Exames', icon: ClipboardList },
    { id: 'prescricoes', label: 'Prescrições', icon: Pill },
    { id: 'documentos', label: 'Documentos', icon: FileCheck },
    { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  ];

  // Sinais vitais mockados (pode ser expandido no futuro)
  const vitals = [
    { label: 'PA', value: '-', unit: 'mmHg', icon: Activity },
    { label: 'FC', value: '-', unit: 'bpm', icon: Heart },
    { label: 'Sat', value: '-', unit: '%', icon: Droplet },
    { label: 'Peso', value: '-', unit: 'kg', icon: Weight },
  ];

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
                    <h1 className="text-base font-semibold text-slate-800">{paciente.nome}</h1>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Prontuário Completo
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                    <span>{idade} anos</span>
                    <span>•</span>
                    <span>{paciente.sexo}</span>
                    <span>•</span>
                    <span className="font-mono text-xs text-slate-400">
                      {paciente.numeroProntuario ? `Prontuário: ${paciente.numeroProntuario}` : `ID: ${paciente.id.substring(0, 12).toUpperCase()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="flex items-center gap-6 text-sm">
                {paciente.celular && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{paciente.celular}</span>
                  </div>
                )}
                {paciente.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="max-w-[200px] truncate">{paciente.email}</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="gap-2 text-xs"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2 text-xs"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'consultas' ? data.consultas.length :
                           tab.id === 'prontuarios' ? data.prontuarios.length :
                           tab.id === 'exames' ? data.solicitacoesExames.length :
                           tab.id === 'prescricoes' ? data.prescricoes.length :
                           tab.id === 'documentos' ? data.documentos.length :
                           tab.id === 'pagamentos' ? data.pagamentos.length :
                           tab.id === 'mensagens' ? data.mensagens.length : 0;
              
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
                  <Icon className="w-4 h-4 inline mr-1.5" />
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs bg-slate-100 text-slate-600 border-slate-200">
                      {count}
                    </Badge>
                  )}
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
          {/* Dados Pessoais Tab */}
          {activeTab === 'dados-pessoais' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              <div className="grid grid-cols-12 gap-6">
                {/* Coluna Esquerda */}
                <div className="col-span-8">
                  <DadosPessoaisSection
                    paciente={paciente}
                    expanded={true}
                    onToggle={() => {}}
                  />
                  
                  {data.planosSaude.length > 0 && (
                    <div className="mt-6">
                      <PlanosSaudeSection
                        planosSaude={data.planosSaude}
                        expanded={true}
                        onToggle={() => {}}
                      />
                    </div>
                  )}
                </div>

                {/* Coluna Direita - Sidebar */}
                <div className="col-span-4 space-y-4">
                  {/* Patient Info Card - Compact */}
                  <Card className="border-slate-200 shadow-lg shadow-blue-100/50 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">{paciente.nome}</h3>
                          <p className="text-xs text-slate-500">{idade} anos • {paciente.sexo}</p>
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

                  {/* Quick Stats */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-800">Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Consultas</span>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {data.consultas.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Prontuários</span>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {data.prontuarios.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Exames</span>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {data.solicitacoesExames.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Prescrições</span>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {data.prescricoes.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Documentos</span>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {data.documentos.length}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Consultas Tab */}
          {activeTab === 'consultas' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              <HistoricoConsultasSection
                consultas={data.consultas}
                expanded={true}
                onToggle={() => {}}
              />
            </div>
          )}

          {/* Prontuários Tab */}
          {activeTab === 'prontuarios' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              <ProntuariosSection
                prontuarios={data.prontuarios}
                expanded={true}
                onToggle={() => {}}
              />
            </div>
          )}

          {/* Exames Tab */}
          {activeTab === 'exames' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              {data.solicitacoesExames.length > 0 ? (
                <ExamesSection
                  solicitacoesExames={data.solicitacoesExames}
                  expanded={true}
                  onToggle={() => {}}
                />
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Nenhum exame encontrado</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Prescrições Tab */}
          {activeTab === 'prescricoes' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              {data.prescricoes.length > 0 ? (
                <PrescricoesSection
                  prescricoes={data.prescricoes}
                  expanded={true}
                  onToggle={() => {}}
                />
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Pill className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Nenhuma prescrição encontrada</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Documentos Tab */}
          {activeTab === 'documentos' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              {data.documentos.length > 0 ? (
                <DocumentosSection
                  documentos={data.documentos}
                  expanded={true}
                  onToggle={() => {}}
                />
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Nenhum documento encontrado</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Pagamentos Tab */}
          {activeTab === 'pagamentos' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              {data.pagamentos.length > 0 ? (
                <PagamentosSection
                  pagamentos={data.pagamentos}
                  expanded={true}
                  onToggle={() => {}}
                />
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Nenhum pagamento encontrado</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Mensagens Tab */}
          {activeTab === 'mensagens' && (
            <div className="animate-in fade-in duration-500 px-8 pt-6 pb-28 max-w-[1600px] mx-auto">
              {data.mensagens.length > 0 ? (
                <MensagensSection
                  mensagens={data.mensagens}
                  expanded={true}
                  onToggle={() => {}}
                />
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Nenhuma mensagem encontrada</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
