"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import {
  User,
  Calendar,
  ArrowLeft,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Paperclip,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCPF } from '@/lib/utils';

/* ── Interfaces ─────────────────────────────────────────────────────────── */

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
    observacoes: string | null;
    modalidade: string | null;
    tipoConsulta: { nome: string } | null;
    medico: { usuario: { nome: string } };
    codigoTuss: { codigoTuss: string; descricao: string } | null;
    operadora: { nomeFantasia: string } | null;
    planoSaude: { nome: string } | null;
    valorCobrado: number | string | null;
    prontuarios?: Array<{
      id: string;
      anamnese: string | null;
      exameFisico: string | null;
      diagnostico: string | null;
      conduta: string | null;
      evolucao: string | null;
      createdAt: string;
    }>;
    consultaCids?: Array<{
      id: string;
      code: string;
      description: string;
    }>;
    consultaExames?: Array<{
      id: string;
      nome: string;
      tipo: string | null;
    }>;
    consultaPrescricoes?: Array<{
      id: string;
      medicamento: string;
      dosagem: string | null;
      posologia: string;
      duracao: string | null;
    }>;
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
  documentos: Array<{
    id: string;
    numero: number;
    tipoDocumento: string;
    nomeDocumento: string;
    s3Key: string | null;
    createdAt: string;
    consulta: { id: string; dataHora: string };
    medico: { usuario: { nome: string } };
  }>;
  mensagens: any[];
}

interface ProntuarioPacienteContentProps {
  pacienteId: string;
}

/* ── Lookup de status ───────────────────────────────────────────────────── */

const CONSULTA_STATUS: Record<string, { label: string; border: string; dot: string; badge: string }> = {
  AGENDADA:       { label: 'Agendada',       border: 'border-l-slate-300',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600' },
  CONFIRMADA:     { label: 'Confirmada',     border: 'border-l-blue-400',    dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', border: 'border-l-amber-400',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  REALIZADA:      { label: 'Realizada',      border: 'border-l-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  CANCELADA:      { label: 'Cancelada',      border: 'border-l-red-300',     dot: 'bg-red-300',     badge: 'bg-red-50 text-red-600' },
};

const EXAME_STATUS: Record<string, { label: string; badge: string }> = {
  SOLICITADO: { label: 'Solicitado', badge: 'bg-amber-50 text-amber-700' },
  REALIZADO:  { label: 'Realizado',  badge: 'bg-emerald-50 text-emerald-700' },
  CANCELADO:  { label: 'Cancelado',  badge: 'bg-red-50 text-red-600' },
};

/* ── Componente principal ───────────────────────────────────────────────── */

export function ProntuarioPacienteContent({ pacienteId }: ProntuarioPacienteContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProntuarioCompleto | null>(null);
  const [loadingFicha, setLoadingFicha] = useState<string | null>(null);
  const [histOpen, setHistOpen] = useState(true);

  useEffect(() => { fetchProntuarioCompleto(); }, [pacienteId]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirFichaAtendimento = async (documentoId: string) => {
    try {
      setLoadingFicha(documentoId);
      const response = await fetch(`/api/medico/documentos/${documentoId}/url`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao obter ficha');
      }
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao abrir ficha');
    } finally {
      setLoadingFicha(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-slate-600">Prontuário não encontrado</p>
          <Button onClick={() => router.back()} variant="outline" size="sm">
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

  // Consultas agrupadas por mês
  const consultasOrdenadas = [...data.consultas].sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );

  const consultasPorMes = consultasOrdenadas.reduce<
    Array<{ mesLabel: string; consultas: typeof data.consultas }>
  >((acc, c) => {
    const d = new Date(c.dataHora);
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const ultimo = acc[acc.length - 1];
    if (ultimo?.mesLabel === label) {
      ultimo.consultas.push(c);
    } else {
      acc.push({ mesLabel: label, consultas: [c] });
    }
    return acc;
  }, []);

  const enderecoFormatado = [
    paciente.endereco,
    paciente.numero && `Nº ${paciente.numero}`,
    paciente.complemento,
    paciente.bairro,
    paciente.cidade && paciente.estado
      ? `${paciente.cidade}/${paciente.estado}`
      : paciente.cidade || paciente.estado,
    paciente.cep && `CEP ${paciente.cep}`,
  ].filter(Boolean).join(', ');

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">

      <PageHeader
        icon={BookOpen}
        title="Prontuário"
        subtitle={paciente.numeroProntuario
          ? `N: ${String(paciente.numeroProntuario).padStart(6, '0')}`
          : `N: —`}
      />

      <div className="space-y-5 pb-24">

        {/* ══ Dados do Paciente ══ */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <div className="px-4 py-2.5 flex items-start gap-3">

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Bloco principal */}
            <div className="flex-1 min-w-0">

              {/* Nome + prontuário + contadores */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-sm font-semibold text-slate-900 leading-tight">{paciente.nome}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {idade} anos · {paciente.sexo}
                    {paciente.numeroProntuario && <span className="ml-2 font-mono">Nº {paciente.numeroProntuario}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {[
                    { label: 'Consultas',   n: data.consultas.length },
                    { label: 'Exames',      n: data.solicitacoesExames.length },
                    { label: 'Prescrições', n: data.prescricoes.length },
                  ].map(({ label, n }) => (
                    <div key={label} className="text-center">
                      <p className="text-sm font-bold text-slate-800 leading-none">{n}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid de campos — 6 colunas */}
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-6 gap-x-5 gap-y-1.5">
                <Field label="CPF"          value={formatCPF(paciente.cpf)} />
                <Field label="RG"           value={paciente.rg || '—'} />
                <Field label="Nascimento"   value={`${formatDate(new Date(paciente.dataNascimento))} · ${idade}a`} />
                <Field label="Estado Civil" value={paciente.estadoCivil || '—'} />
                <Field label="Profissão"    value={paciente.profissao || '—'} />
                <Field label="Celular"      value={paciente.celular || '—'} />
                <Field label="Telefone"     value={paciente.telefone || '—'} />
                <Field label="E-mail"       value={paciente.email || '—'} span={2} />
                <Field label="Mãe"          value={paciente.nomeMae || '—'} />
                <Field label="Pai"          value={paciente.nomePai || '—'} />
                {data.planosSaude.length > 0
                  ? data.planosSaude.map((pl: any, i: number) => (
                      <Field
                        key={i}
                        label="Plano de Saúde"
                        value={[pl.planoSaude?.nome || pl.nome, pl.numeroCarteirinha].filter(Boolean).join(' · ')}
                      />
                    ))
                  : <Field label="Plano de Saúde" value="—" />}
                <Field label="Endereço"     value={enderecoFormatado || '—'} span={3} />
                <Field label="Observações"  value={paciente.observacoes || '—'} span={3} />
              </div>
            </div>
          </div>
        </Card>

        {/* ══ Histórico de Consultas ══ */}
        <Section
          icon={Calendar}
          iconColor="text-blue-500"
          title="Histórico de Consultas"
          count={data.consultas.length}
          open={histOpen}
          onToggle={() => setHistOpen(v => !v)}
        >
          {data.consultas.length === 0 ? (
            <EmptyState message="Nenhuma consulta registrada." />
          ) : (
            <div className="space-y-6">
              {consultasPorMes.map(({ mesLabel, consultas }) => (
                <div key={mesLabel}>
                  {/* Separador de mês */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-slate-500 capitalize">{mesLabel}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <div className="space-y-2">
                    {consultas.map((consulta) => (
                      <ConsultaRow
                        key={consulta.id}
                        consulta={consulta}
                        exames={data.solicitacoesExames.filter(e => e.consulta.id === consulta.id)}
                        prescricoes={data.prescricoes.filter(p => p.consulta.id === consulta.id)}
                        cidsLegacy={consulta.consultaCids ?? []}
                        examesLegacy={consulta.consultaExames ?? []}
                        prescricoesLegacy={consulta.consultaPrescricoes ?? []}
                        fichaDocumento={data.documentos.find(d => d.consulta.id === consulta.id && d.tipoDocumento === 'ficha-atendimento') ?? null}
                        examesAnexados={data.documentos.filter(d => d.consulta.id === consulta.id && (d.tipoDocumento === 'exame-imagem' || d.tipoDocumento === 'exame-pdf'))}
                        loadingFicha={loadingFicha}
                        onAbrirFicha={handleAbrirFichaAtendimento}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

/* ── ConsultaRow ────────────────────────────────────────────────────────── */

function ConsultaRow({
  consulta,
  exames,
  prescricoes,
  cidsLegacy,
  examesLegacy,
  prescricoesLegacy,
  fichaDocumento,
  examesAnexados,
  loadingFicha,
  onAbrirFicha,
}: {
  consulta: ProntuarioCompleto['consultas'][0];
  exames: ProntuarioCompleto['solicitacoesExames'];
  prescricoes: ProntuarioCompleto['prescricoes'];
  cidsLegacy: NonNullable<ProntuarioCompleto['consultas'][0]['consultaCids']>;
  examesLegacy: NonNullable<ProntuarioCompleto['consultas'][0]['consultaExames']>;
  prescricoesLegacy: NonNullable<ProntuarioCompleto['consultas'][0]['consultaPrescricoes']>;
  fichaDocumento: ProntuarioCompleto['documentos'][0] | null;
  examesAnexados: ProntuarioCompleto['documentos'];
  loadingFicha: string | null;
  onAbrirFicha: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const st = CONSULTA_STATUS[consulta.status] ?? {
    label: consulta.status,
    border: 'border-l-slate-300',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600',
  };
  const prontuario = consulta.prontuarios?.[0];

  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${st.border} rounded-r-xl rounded-l-sm`}>

      {/* ── Linha principal (layout inalterado) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        {/* Data */}
        <div className="shrink-0 text-center w-10">
          <p className="text-base font-bold text-slate-800 leading-none">
            {new Date(consulta.dataHora).getDate().toString().padStart(2, '0')}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
            {new Date(consulta.dataHora).toLocaleDateString('pt-BR', { month: 'short' })}
          </p>
        </div>

        <div className="w-px h-8 bg-slate-100 shrink-0" />

        {/* Tipo + Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">
              {consulta.tipoConsulta?.nome ?? 'Consulta'}
            </p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${st.badge}`}>
              {st.label}
            </span>
          </div>
          {prontuario?.diagnostico && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {prontuario.diagnostico}
            </p>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Painel expandido ── */}
      {open && (
        <div className="px-4 pb-5 pt-4 border-t border-slate-100 space-y-5">

          {/* Informações da consulta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Detail label="Médico" value={consulta.medico.usuario.nome} />
            {consulta.tipoConsulta && <Detail label="Tipo de Consulta" value={consulta.tipoConsulta.nome} />}
            {consulta.codigoTuss && (
              <Detail
                label="Procedimento (TUSS)"
                value={`${consulta.codigoTuss.codigoTuss} · ${consulta.codigoTuss.descricao}`}
              />
            )}
            {consulta.modalidade && <Detail label="Modalidade" value={consulta.modalidade === 'TELEMEDICINA' ? 'Telemedicina' : 'Presencial'} />}
            {consulta.planoSaude && <Detail label="Plano de Saúde" value={consulta.planoSaude.nome} />}
            {consulta.operadora && <Detail label="Operadora" value={consulta.operadora.nomeFantasia} />}
            {consulta.valorCobrado != null && (
              <Detail label="Valor Cobrado" value={`R$ ${Number(consulta.valorCobrado).toFixed(2).replace('.', ',')}`} />
            )}
            {consulta.observacoes && <Detail label="Observações da Consulta" value={consulta.observacoes} full />}
          </div>

          {/* Prontuário / Registro clínico */}
          {prontuario && (prontuario.anamnese || prontuario.exameFisico || prontuario.diagnostico || prontuario.conduta || prontuario.evolucao) && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Registro Clínico</p>
              <div className="space-y-3">
                {prontuario.anamnese && <Detail label="Anamnese" value={prontuario.anamnese} full />}
                {prontuario.exameFisico && <Detail label="Exame Físico" value={prontuario.exameFisico} full />}
                {prontuario.diagnostico && <Detail label="Diagnóstico" value={prontuario.diagnostico} full />}
                {prontuario.conduta && <Detail label="Conduta" value={prontuario.conduta} full />}
                {prontuario.evolucao && <Detail label="Evolução" value={prontuario.evolucao} full />}
              </div>
            </div>
          )}

          {cidsLegacy.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">CID / CIAP</p>
              <div className="flex flex-wrap gap-2">
                {cidsLegacy.map((c) => (
                  <span key={c.id} className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {c.code}{c.description ? ` · ${c.description}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Exames solicitados nesta consulta */}
          {exames.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Exames Solicitados</p>
              <div className="space-y-2">
                {exames.map(e => {
                  const exSt = EXAME_STATUS[e.status] ?? { label: e.status, badge: 'bg-slate-100 text-slate-600' };
                  return (
                    <div key={e.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-slate-700">{e.exame.nome}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${exSt.badge}`}>{exSt.label}</span>
                        </div>
                        {e.exame.tipo && <p className="text-[10px] text-slate-400 mt-0.5">{e.exame.tipo}</p>}
                        {e.resultado && <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Resultado:</span> {e.resultado}</p>}
                        {e.observacoes && <p className="text-xs text-slate-500 mt-1">{e.observacoes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {examesLegacy.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Exames (Legado)</p>
              <div className="space-y-2">
                {examesLegacy.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{e.nome}</p>
                      {e.tipo && <p className="text-[10px] text-slate-400 mt-0.5">{e.tipo}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescrições desta consulta */}
          {prescricoes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Prescrições</p>
              <div className="space-y-2">
                {prescricoes.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{p.medicamento.nome}</p>
                      {p.medicamento.principioAtivo && <p className="text-[10px] text-slate-400 mt-0.5">{p.medicamento.principioAtivo}</p>}
                      <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Posologia:</span> {p.posologia}</p>
                      <p className="text-xs text-slate-600"><span className="font-medium">Quantidade:</span> {p.quantidade} unidade(s)</p>
                      {p.observacoes && <p className="text-xs text-slate-500 mt-1">{p.observacoes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prescricoesLegacy.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Prescrições (Legado)</p>
              <div className="space-y-2">
                {prescricoesLegacy.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{p.medicamento}</p>
                      {p.dosagem && <p className="text-[10px] text-slate-400 mt-0.5">{p.dosagem}</p>}
                      <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Posologia:</span> {p.posologia}</p>
                      {p.duracao && <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Duração:</span> {p.duracao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exames Anexados */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Exames Anexados</p>
            {examesAnexados.length === 0 ? (
              <p className="text-xs text-slate-300">Nenhum exame anexado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {examesAnexados.map(doc => {
                  const isImage = doc.tipoDocumento === 'exame-imagem';
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onAbrirFicha(doc.id)}
                      disabled={loadingFicha === doc.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors disabled:opacity-50"
                    >
                      {loadingFicha === doc.id
                        ? <Loader2 className="w-3 h-3 animate-spin text-slate-400 shrink-0" />
                        : isImage
                          ? <ImageIcon className="w-3 h-3 text-violet-400 shrink-0" />
                          : <Paperclip className="w-3 h-3 text-blue-400 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{doc.nomeDocumento}</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{isImage ? 'Imagem' : 'PDF'} · {formatDate(new Date(doc.createdAt))}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fallback */}
          {!prontuario && exames.length === 0 && prescricoes.length === 0 && examesLegacy.length === 0 &&
            prescricoesLegacy.length === 0 && cidsLegacy.length === 0 && examesAnexados.length === 0 &&
            !consulta.codigoTuss && consulta.valorCobrado == null && !consulta.observacoes && (
            <p className="text-xs text-slate-400">Sem informações adicionais.</p>
          )}

          {/* Ficha de Atendimento — rodapé direito */}
          {fichaDocumento && (
            <div className="flex items-end justify-end gap-3 pt-3 border-t border-slate-100">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 leading-none">Ficha de Atendimento</p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">#{String(fichaDocumento.numero).padStart(7, '0')}</p>
              </div>
              <button
                onClick={() => onAbrirFicha(fichaDocumento.id)}
                disabled={loadingFicha === fichaDocumento.id}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors disabled:opacity-50 shrink-0"
              >
                {loadingFicha === fichaDocumento.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <><FileText className="w-3 h-3" />Ficha de Atendimento</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/* ── Componentes de layout ──────────────────────────────────────────────── */

function Section({
  icon: Icon,
  iconColor,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 mb-3 group py-1 hover:opacity-80 transition-opacity"
      >
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-xs text-slate-400 font-normal">· {count}</span>
        <div className="flex-1 h-px bg-slate-200 mx-1" />
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>
      {open && children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl py-8 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: number }) {
  const spanClass = span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : span === 6 ? 'col-span-6' : '';
  return (
    <div className={spanClass}>
      <p className="text-[10px] text-slate-400 leading-none mb-0.5">{label}</p>
      <p className="text-xs font-medium text-slate-700 break-words leading-snug">{value}</p>
    </div>
  );
}
