"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Calendar,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
  Pill,
  ClipboardList,
  Stethoscope,
  MapPin,
  FileText,
  Building2,
  FileText as FileDoc,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCPF, formatTime } from '@/lib/utils';

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
  consultas: Array<{
    id: string;
    dataHora: string;
    status: string;
    tipoConsulta: { nome: string } | null;
    medico: { usuario: { nome: string } };
    codigoTuss: { codigoTuss: string; descricao: string } | null;
    valorCobrado: number | string | null;
    prontuarios?: Array<{ id: string; diagnostico: string | null; createdAt: string }>;
  }>;
  prontuarios: any[];
  solicitacoesExames: Array<{
    id: string;
    status: string;
    dataSolicitacao: string;
    dataRealizacao: string | null;
    resultado: string | null;
    observacoes: string | null;
    exame: { nome: string; tipo: string | null; descricao: string | null };
    consulta: { id: string; dataHora: string; medico: { usuario: { nome: string } } };
  }>;
  prescricoes: Array<{
    id: string;
    posologia: string;
    quantidade: number;
    observacoes: string | null;
    medicamento: {
      nome: string;
      principioAtivo: string | null;
      laboratorio: string | null;
      apresentacao: string | null;
    };
    consulta: { id: string; dataHora: string; medico: { usuario: { nome: string } } };
    createdAt: string;
  }>;
  pagamentos: any[];
  documentos: any[];
  mensagens: any[];
}

type TimelineItem =
  | { kind: 'consulta'; date: Date; raw: ProntuarioCompleto['consultas'][0] }
  | { kind: 'exame'; date: Date; raw: ProntuarioCompleto['solicitacoesExames'][0] }
  | { kind: 'prescricao'; date: Date; raw: ProntuarioCompleto['prescricoes'][0] };

interface ProntuarioPacienteContentProps {
  pacienteId: string;
}

const CONSULTA_STATUS: Record<string, { label: string; color: string }> = {
  AGENDADA:       { label: 'Agendada',        color: 'bg-slate-100 text-slate-700 border-slate-300' },
  CONFIRMADA:     { label: 'Confirmada',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  EM_ATENDIMENTO: { label: 'Em Atendimento',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  REALIZADA:      { label: 'Realizada',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELADA:      { label: 'Cancelada',        color: 'bg-red-50 text-red-700 border-red-200' },
};

const EXAME_STATUS: Record<string, { label: string; color: string }> = {
  SOLICITADO: { label: 'Solicitado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  REALIZADO:  { label: 'Realizado',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELADO:  { label: 'Cancelado',  color: 'bg-red-50 text-red-700 border-red-200' },
};

export function ProntuarioPacienteContent({ pacienteId }: ProntuarioPacienteContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProntuarioCompleto | null>(null);
  const [loadingFicha, setLoadingFicha] = useState<string | null>(null);
  const [medsOpen, setMedsOpen] = useState(true);
  const [examesOpen, setExamesOpen] = useState(true);
  const [histOpen, setHistOpen] = useState(true);

  useEffect(() => {
    fetchProntuarioCompleto();
  }, [pacienteId]);

  const fetchProntuarioCompleto = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/paciente/${pacienteId}/prontuario-completo`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${response.status}`);
      }
      setData(await response.json());
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar prontuário');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirFichaAtendimento = async (consultaId: string) => {
    try {
      setLoadingFicha(consultaId);
      const response = await fetch('/api/medico/documentos/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoDocumento: 'ficha-atendimento', consultaId, dados: {} }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao gerar ficha');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      toast.success('Ficha de atendimento gerada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao abrir ficha');
    } finally {
      setLoadingFicha(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">Carregando prontuário...</p>
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
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const { paciente } = data;

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const idade = calcularIdade(paciente.dataNascimento);

  // ── Montar timeline unificada ──────────────────────────────────────────────
  const timeline: TimelineItem[] = [
    ...data.consultas.map((c) => ({
      kind: 'consulta' as const,
      date: new Date(c.dataHora),
      raw: c,
    })),
    ...data.solicitacoesExames.map((e) => ({
      kind: 'exame' as const,
      date: new Date(e.dataSolicitacao),
      raw: e,
    })),
    ...data.prescricoes.map((p) => ({
      kind: 'prescricao' as const,
      date: new Date(p.createdAt),
      raw: p,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // ── Endereço formatado ─────────────────────────────────────────────────────
  const enderecoFormatado = [
    paciente.endereco,
    paciente.numero && `Nº ${paciente.numero}`,
    paciente.complemento,
    paciente.bairro,
    paciente.cidade && paciente.estado ? `${paciente.cidade}/${paciente.estado}` : paciente.cidade || paciente.estado,
    paciente.cep && `CEP ${paciente.cep}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-6 py-2.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-slate-500 hover:text-slate-800 -ml-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar
          </Button>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-sm font-semibold text-slate-800 truncate">{paciente.nome}</span>
          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium shrink-0">
            Prontuário
          </Badge>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-6 pb-24">

        {/* ══ Cabeçalho completo do paciente ══ */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          {/* Faixa de identidade */}
          <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight">{paciente.nome}</h1>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-0.5">
                <span className="text-sm text-slate-500">{idade} anos · {paciente.sexo}</span>
                {paciente.numeroProntuario && (
                  <span className="text-xs font-mono text-slate-400">Prontuário Nº {paciente.numeroProntuario}</span>
                )}
              </div>
            </div>
            {/* Contadores */}
            <div className="flex items-center gap-6 shrink-0">
              {[
                { label: 'Consultas', n: data.consultas.length },
                { label: 'Exames', n: data.solicitacoesExames.length },
                { label: 'Prescrições', n: data.prescricoes.length },
              ].map(({ label, n }) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-bold text-slate-800">{n}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-x-8 gap-y-5">

              {/* ── Identificação ── */}
              <InfoGroup title="Identificação">
                <InfoRow label="CPF" value={formatCPF(paciente.cpf)} />
                {paciente.rg && <InfoRow label="RG" value={paciente.rg} />}
                <InfoRow
                  label="Data de Nascimento"
                  value={`${formatDate(new Date(paciente.dataNascimento))} (${idade} anos)`}
                />
                {paciente.estadoCivil && <InfoRow label="Estado Civil" value={paciente.estadoCivil} />}
                {paciente.profissao && <InfoRow label="Profissão" value={paciente.profissao} />}
              </InfoGroup>

              {/* ── Contato ── */}
              <InfoGroup title="Contato">
                {paciente.celular && <InfoRow label="Celular" value={paciente.celular} icon={Phone} />}
                {paciente.telefone && <InfoRow label="Telefone" value={paciente.telefone} icon={Phone} />}
                {paciente.email && <InfoRow label="E-mail" value={paciente.email} icon={Mail} />}
                {enderecoFormatado && <InfoRow label="Endereço" value={enderecoFormatado} icon={MapPin} />}
              </InfoGroup>

              {/* ── Filiação + Planos ── */}
              <div className="space-y-5">
                {(paciente.nomeMae || paciente.nomePai) && (
                  <InfoGroup title="Filiação">
                    {paciente.nomeMae && <InfoRow label="Mãe" value={paciente.nomeMae} />}
                    {paciente.nomePai && <InfoRow label="Pai" value={paciente.nomePai} />}
                  </InfoGroup>
                )}

                {data.planosSaude.length > 0 && (
                  <InfoGroup title="Planos de Saúde">
                    {data.planosSaude.map((plano: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 font-medium">
                          {plano.planoSaude?.nome || plano.nome || '—'}
                        </span>
                        {plano.numeroCarteirinha && (
                          <span className="text-xs text-slate-500 font-mono">· {plano.numeroCarteirinha}</span>
                        )}
                      </div>
                    ))}
                  </InfoGroup>
                )}
              </div>
            </div>

            {paciente.observacoes && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Observações</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{paciente.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ Medicamentos em Uso ══ */}
        <div>
          <button
            onClick={() => setMedsOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 mb-4 group"
          >
            <Pill className="w-4 h-4 text-emerald-500 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Medicamentos em Uso</h2>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 mr-1">{data.prescricoes.length} item(s)</span>
            {medsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {medsOpen && (
            data.prescricoes.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-8 text-center text-sm text-slate-400">
                  Nenhuma prescrição registrada.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {data.prescricoes.map((p) => (
                  <Card key={p.id} className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Pill className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{p.medicamento.nome}</p>
                          {p.medicamento.principioAtivo && (
                            <p className="text-xs text-slate-500 mt-0.5">{p.medicamento.principioAtivo}</p>
                          )}
                          <p className="text-xs text-slate-600 mt-1.5">
                            <span className="font-medium">Posologia:</span> {p.posologia}
                          </p>
                          {p.medicamento.apresentacao && (
                            <p className="text-xs text-slate-500">{p.medicamento.apresentacao}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {p.consulta.medico.usuario.nome} · {formatDate(new Date(p.consulta.dataHora))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>

        {/* ══ Exames Realizados ══ */}
        <div>
          <button
            onClick={() => setExamesOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 mb-4 group"
          >
            <ClipboardList className="w-4 h-4 text-violet-500 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Exames Realizados</h2>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 mr-1">{data.solicitacoesExames.length} item(s)</span>
            {examesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {examesOpen && (
            data.solicitacoesExames.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-8 text-center text-sm text-slate-400">
                  Nenhum exame registrado.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {data.solicitacoesExames.map((e) => {
                  const status = EXAME_STATUS[e.status] ?? { label: e.status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
                  return (
                    <Card key={e.id} className="border-slate-200 shadow-sm bg-white">
                      <CardContent className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <ClipboardList className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 leading-tight">{e.exame.nome}</p>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            {e.exame.tipo && (
                              <p className="text-xs text-slate-500 mt-0.5">{e.exame.tipo}</p>
                            )}
                            <p className="text-xs text-slate-600 mt-1.5">
                              <span className="font-medium">Solicitado em:</span> {formatDate(new Date(e.dataSolicitacao))}
                            </p>
                            {e.dataRealizacao && (
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Realizado em:</span> {formatDate(new Date(e.dataRealizacao))}
                              </p>
                            )}
                            {e.resultado && (
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-medium">Resultado:</span> {e.resultado}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              {e.consulta.medico.usuario.nome}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ══ Histórico de Consultas ══ */}
        <div>
          <button
            onClick={() => setHistOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 mb-5 group"
          >
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Histórico de Consultas</h2>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 mr-1">{timeline.length} registro(s)</span>
            {histOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {histOpen && (
            timeline.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  Nenhum registro encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Linha vertical */}
                <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-slate-200 pointer-events-none" />

                <div className="space-y-4">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-0">
                      {/* Data */}
                      <div className="w-[7.5rem] shrink-0 pt-3.5 pr-4 text-right">
                        <p className="text-xs font-semibold text-slate-700 leading-tight">
                          {item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.date.getFullYear()}
                        </p>
                      </div>

                      {/* Marcador */}
                      <div className="shrink-0 flex flex-col items-center">
                        <div
                          className={`mt-3 w-4 h-4 rounded-full border-2 bg-white shrink-0 z-10 ${
                            item.kind === 'consulta'
                              ? 'border-blue-500'
                              : item.kind === 'exame'
                              ? 'border-violet-500'
                              : 'border-emerald-500'
                          }`}
                        />
                      </div>

                      {/* Card do evento */}
                      <div className="flex-1 pl-4 pb-2">
                        {item.kind === 'consulta' && (
                          <ConsultaCard consulta={item.raw} onAbrirFicha={handleAbrirFichaAtendimento} loadingFicha={loadingFicha} />
                        )}
                        {item.kind === 'exame' && <ExameCard exame={item.raw} />}
                        {item.kind === 'prescricao' && <PrescricaoCard prescricao={item.raw} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Cards da timeline ── */

function ConsultaCard({
  consulta,
  onAbrirFicha,
  loadingFicha,
}: {
  consulta: ProntuarioCompleto['consultas'][0];
  onAbrirFicha: (id: string) => void;
  loadingFicha: string | null;
}) {
  const status = CONSULTA_STATUS[consulta.status] ?? { label: consulta.status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
  const prontuario = consulta.prontuarios?.[0];
  const hora = formatTime(consulta.dataHora);

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm font-semibold text-slate-800">Consulta</span>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
              {status.label}
            </span>
            {consulta.tipoConsulta && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                {consulta.tipoConsulta.nome}
              </span>
            )}
          </div>
          {hora && <span className="text-xs text-slate-400 shrink-0">{hora}</span>}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <User className="w-3 h-3" />
          <span>{consulta.medico.usuario.nome}</span>
        </div>

        {consulta.codigoTuss && (
          <p className="mt-1.5 text-xs text-slate-400">
            {consulta.codigoTuss.codigoTuss} · {consulta.codigoTuss.descricao}
          </p>
        )}

        {prontuario?.diagnostico && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Diagnóstico</p>
            <p className="text-sm text-slate-700">{prontuario.diagnostico}</p>
          </div>
        )}

        {consulta.status === 'REALIZADA' && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAbrirFicha(consulta.id)}
              disabled={loadingFicha === consulta.id}
              className="h-7 text-xs px-3"
            >
              {loadingFicha === consulta.id ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Gerando...</>
              ) : (
                <><FileDoc className="w-3 h-3 mr-1.5" />Ficha de Atendimento</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExameCard({ exame }: { exame: ProntuarioCompleto['solicitacoesExames'][0] }) {
  const status = EXAME_STATUS[exame.status] ?? { label: exame.status, color: 'bg-slate-100 text-slate-700 border-slate-300' };

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-sm font-semibold text-slate-800">{exame.exame.nome}</span>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
            {status.label}
          </span>
          {exame.exame.tipo && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
              {exame.exame.tipo}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <User className="w-3 h-3" />
          <span>{exame.consulta.medico.usuario.nome}</span>
        </div>

        {exame.dataRealizacao && (
          <p className="mt-1 text-xs text-slate-400">
            Realizado em {formatDate(new Date(exame.dataRealizacao))}
          </p>
        )}

        {exame.resultado && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Resultado</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{exame.resultado}</p>
          </div>
        )}

        {exame.observacoes && (
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{exame.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrescricaoCard({ prescricao }: { prescricao: ProntuarioCompleto['prescricoes'][0] }) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Pill className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-800">{prescricao.medicamento.nome}</span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <User className="w-3 h-3" />
          <span>{prescricao.consulta.medico.usuario.nome}</span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {prescricao.medicamento.principioAtivo && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Princípio ativo:</span> {prescricao.medicamento.principioAtivo}
            </span>
          )}
          {prescricao.medicamento.apresentacao && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Apresentação:</span> {prescricao.medicamento.apresentacao}
            </span>
          )}
          <span className="text-slate-500">
            <span className="font-medium text-slate-600">Posologia:</span> {prescricao.posologia}
          </span>
          <span className="text-slate-500">
            <span className="font-medium text-slate-600">Qtd.:</span> {prescricao.quantidade} un.
          </span>
        </div>

        {prescricao.observacoes && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{prescricao.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Auxiliares do cabeçalho ── */

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
