/**
 * TISS XML Builder - Padrão TISS v4.02.00 (ANS)
 * Gera XML de lotes de guias conforme XSD oficial:
 *   tissV4_02_00.xsd, tissGuiasV4_02_00.xsd,
 *   tissComplexTypesV4_02_00.xsd, tissSimpleTypesV4_02_00.xsd
 *
 * Referência: https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss
 */

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Interfaces de dados de entrada
// ---------------------------------------------------------------------------

/** ct_prestadorIdentificacao: choice(CNPJ | CPF | codigoPrestadorNaOperadora) */
export interface TissPrestador {
  cnpj: string; // st_CNPJ (14 dígitos)
  cnes: string; // st_texto7 — obrigatório na guiaConsulta
  /** Código do prestador na operadora (st_texto14). Se fornecido, usado no contratadoExecutante */
  codigoPrestadorNaOperadora?: string;
  nomeContratado: string; // st_texto70 — nome da clínica/empresa
}

/** Dados do profissional executante — ct_contratadoProfissionalDados */
export interface TissProfissionalExecutante {
  nomeProfissional?: string; // st_texto70 (opcional)
  conselhoProfissional: string; // dm_conselhoProfissional — ex: "06" = CRM
  numeroConselhoProfissional: string; // st_texto15 — ex: "123456"
  uf: string; // dm_UF — ex: "SP"
  cbos: string; // dm_CBOS — ex: "225120"
}

/** Dados da operadora de destino */
export interface TissOperadora {
  registroANS: string; // st_registroANS (6 dígitos)
}

/** ct_procedimentoDados */
export interface TissProcedimentoDados {
  codigoTabela: string; // dm_tabela — "22" para TUSS procedimentos, "18" taxas, "19" materiais, "20" medicamentos
  codigoProcedimento: string; // st_texto10
  descricaoProcedimento: string; // st_texto150
}

/** ct_procedimentoExecutadoSadt — procedimento executado SP/SADT */
export interface TissProcedimentoExecutadoSadt {
  sequencialItem: number; // st_numerico4
  dataExecucao: Date; // st_data
  procedimento: TissProcedimentoDados;
  quantidadeExecutada: number; // st_numerico3
  reducaoAcrescimo: number; // st_decimal3-2 — 1.00 = sem alteração
  valorUnitario: number; // st_decimal10-2
  valorTotal: number; // st_decimal10-2
}

// ---------------------------------------------------------------------------
// Guia de Consulta — ctm_consultaGuia
// ---------------------------------------------------------------------------
export interface TissGuiaConsulta {
  tipo: "CONSULTA";
  /** ct_guiaCabecalho */
  registroANS: string; // da operadora (6 dígitos)
  numeroGuiaPrestador: string; // st_texto20
  /** ct_beneficiarioDados */
  numeroCarteira: string; // st_texto20
  atendimentoRN: "S" | "N"; // dm_simNao
  /** contratadoExecutante (ct_contratadoDados + CNES) */
  contratadoExecutante: {
    codigoPrestadorNaOperadora?: string;
    cnpjContratado?: string;
    cnes: string;
  };
  /** ct_contratadoProfissionalDados */
  profissionalExecutante: TissProfissionalExecutante;
  /** dm_indicadorAcidente: "0"=Trabalho, "1"=Trânsito, "2"=Outros, "9"=Não acidente */
  indicacaoAcidente: string;
  /** ctm_consultaAtendimento */
  dadosAtendimento: {
    regimeAtendimento: string; // dm_regimeAtendimento — "01"=Ambulatorial
    dataAtendimento: Date;
    tipoConsulta: string; // dm_tipoConsulta — "1"=Primeira, "2"=Seguimento
    procedimento: {
      codigoTabela: string; // dm_tabela — "22"
      codigoProcedimento: string; // st_texto10
      valorProcedimento: number; // st_decimal10-2
    };
  };
}

// ---------------------------------------------------------------------------
// Guia SP/SADT — ctm_sp-sadtGuia
// ---------------------------------------------------------------------------
export interface TissGuiaSPSADT {
  tipo: "SPSADT";
  /** ct_guiaCabecalho (extended) */
  registroANS: string;
  numeroGuiaPrestador: string;
  /** ct_beneficiarioDados */
  numeroCarteira: string;
  atendimentoRN: "S" | "N";
  /** dadosSolicitante */
  dadosSolicitante: {
    contratadoSolicitante: {
      codigoPrestadorNaOperadora?: string;
      cnpjContratado?: string;
    };
    nomeContratadoSolicitante: string;
    profissionalSolicitante: TissProfissionalExecutante;
  };
  /** dadosSolicitacao */
  dadosSolicitacao: {
    caraterAtendimento: string; // dm_caraterAtendimento — "1"=Eletiva, "2"=Urgência
    indicacaoClinica?: string;
  };
  /** dadosExecutante */
  dadosExecutante: {
    contratadoExecutante: {
      codigoPrestadorNaOperadora?: string;
      cnpjContratado?: string;
    };
    cnes: string;
  };
  /** ctm_sp-sadtAtendimento */
  dadosAtendimento: {
    tipoAtendimento: string; // dm_tipoAtendimento — "04"=Consulta, "03"=Outras terapias
    indicacaoAcidente: string; // dm_indicadorAcidente
    regimeAtendimento: string; // dm_regimeAtendimento
  };
  /** procedimentosExecutados (opcional no XSD, mas necessário para faturamento) */
  procedimentosExecutados: TissProcedimentoExecutadoSadt[];
  /** ct_guiaValorTotal */
  valorTotal: {
    valorProcedimentos?: number;
    valorTotalGeral: number;
  };
}

export type TissGuia = TissGuiaConsulta | TissGuiaSPSADT;

export interface TissLoteParams {
  numeroLote: string; // st_texto12
  sequencialTransacao: string; // st_texto12
  prestador: TissPrestador;
  operadora: TissOperadora;
  profissionalExecutante: TissProfissionalExecutante;
  guias: TissGuia[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function dec2(n: number): string {
  return n.toFixed(2);
}

// ---------------------------------------------------------------------------
// ct_contratadoDados — choice(codigoPrestadorNaOperadora | cpfContratado | cnpjContratado)
// ---------------------------------------------------------------------------
function buildContratadoDados(dados: {
  codigoPrestadorNaOperadora?: string;
  cnpjContratado?: string;
  cpfContratado?: string;
}): string {
  if (dados.codigoPrestadorNaOperadora) {
    return `<ans:codigoPrestadorNaOperadora>${escapeXml(dados.codigoPrestadorNaOperadora)}</ans:codigoPrestadorNaOperadora>`;
  }
  if (dados.cnpjContratado) {
    return `<ans:cnpjContratado>${escapeXml(dados.cnpjContratado)}</ans:cnpjContratado>`;
  }
  if (dados.cpfContratado) {
    return `<ans:cpfContratado>${escapeXml(dados.cpfContratado)}</ans:cpfContratado>`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// ct_contratadoProfissionalDados
// ---------------------------------------------------------------------------
function buildProfissionalExecutante(prof: TissProfissionalExecutante): string {
  return [
    prof.nomeProfissional
      ? `<ans:nomeProfissional>${escapeXml(prof.nomeProfissional)}</ans:nomeProfissional>`
      : "",
    `<ans:conselhoProfissional>${escapeXml(prof.conselhoProfissional)}</ans:conselhoProfissional>`,
    `<ans:numeroConselhoProfissional>${escapeXml(prof.numeroConselhoProfissional)}</ans:numeroConselhoProfissional>`,
    `<ans:UF>${escapeXml(prof.uf)}</ans:UF>`,
    `<ans:CBOS>${escapeXml(prof.cbos)}</ans:CBOS>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// ct_procedimentoDados
// ---------------------------------------------------------------------------
function buildProcedimentoDados(proc: TissProcedimentoDados): string {
  return [
    `<ans:codigoTabela>${escapeXml(proc.codigoTabela)}</ans:codigoTabela>`,
    `<ans:codigoProcedimento>${escapeXml(proc.codigoProcedimento)}</ans:codigoProcedimento>`,
    `<ans:descricaoProcedimento>${escapeXml(proc.descricaoProcedimento)}</ans:descricaoProcedimento>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Guia de Consulta — ctm_consultaGuia
// ---------------------------------------------------------------------------
function buildGuiaConsulta(guia: TissGuiaConsulta): string {
  const exec = guia.contratadoExecutante;
  const contratadoId = exec.codigoPrestadorNaOperadora
    ? `<ans:codigoPrestadorNaOperadora>${escapeXml(exec.codigoPrestadorNaOperadora)}</ans:codigoPrestadorNaOperadora>`
    : exec.cnpjContratado
      ? `<ans:cnpjContratado>${escapeXml(exec.cnpjContratado)}</ans:cnpjContratado>`
      : "";

  const atend = guia.dadosAtendimento;

  return `<ans:guiaConsulta>
<ans:cabecalhoConsulta>
<ans:registroANS>${escapeXml(guia.registroANS)}</ans:registroANS>
<ans:numeroGuiaPrestador>${escapeXml(guia.numeroGuiaPrestador)}</ans:numeroGuiaPrestador>
</ans:cabecalhoConsulta>
<ans:dadosBeneficiario>
<ans:numeroCarteira>${escapeXml(guia.numeroCarteira)}</ans:numeroCarteira>
<ans:atendimentoRN>${guia.atendimentoRN}</ans:atendimentoRN>
</ans:dadosBeneficiario>
<ans:contratadoExecutante>
${contratadoId}
<ans:CNES>${escapeXml(exec.cnes)}</ans:CNES>
</ans:contratadoExecutante>
<ans:profissionalExecutante>
${buildProfissionalExecutante(guia.profissionalExecutante)}
</ans:profissionalExecutante>
<ans:indicacaoAcidente>${escapeXml(guia.indicacaoAcidente)}</ans:indicacaoAcidente>
<ans:dadosAtendimento>
<ans:regimeAtendimento>${escapeXml(atend.regimeAtendimento)}</ans:regimeAtendimento>
<ans:dataAtendimento>${formatDate(atend.dataAtendimento)}</ans:dataAtendimento>
<ans:tipoConsulta>${escapeXml(atend.tipoConsulta)}</ans:tipoConsulta>
<ans:procedimento>
<ans:codigoTabela>${escapeXml(atend.procedimento.codigoTabela)}</ans:codigoTabela>
<ans:codigoProcedimento>${escapeXml(atend.procedimento.codigoProcedimento)}</ans:codigoProcedimento>
<ans:valorProcedimento>${dec2(atend.procedimento.valorProcedimento)}</ans:valorProcedimento>
</ans:procedimento>
</ans:dadosAtendimento>
</ans:guiaConsulta>`;
}

// ---------------------------------------------------------------------------
// Guia SP/SADT — ctm_sp-sadtGuia
// ---------------------------------------------------------------------------
function buildGuiaSPSADT(guia: TissGuiaSPSADT): string {
  const sol = guia.dadosSolicitante;
  const exec = guia.dadosExecutante;

  const procsXml = guia.procedimentosExecutados
    .map(
      (p) => `<ans:procedimentoExecutado>
<ans:sequencialItem>${p.sequencialItem}</ans:sequencialItem>
<ans:dataExecucao>${formatDate(p.dataExecucao)}</ans:dataExecucao>
<ans:procedimento>
${buildProcedimentoDados(p.procedimento)}
</ans:procedimento>
<ans:quantidadeExecutada>${p.quantidadeExecutada}</ans:quantidadeExecutada>
<ans:reducaoAcrescimo>${dec2(p.reducaoAcrescimo)}</ans:reducaoAcrescimo>
<ans:valorUnitario>${dec2(p.valorUnitario)}</ans:valorUnitario>
<ans:valorTotal>${dec2(p.valorTotal)}</ans:valorTotal>
</ans:procedimentoExecutado>`
    )
    .join("\n");

  const valorTotalXml = [
    guia.valorTotal.valorProcedimentos != null
      ? `<ans:valorProcedimentos>${dec2(guia.valorTotal.valorProcedimentos)}</ans:valorProcedimentos>`
      : "",
    `<ans:valorTotalGeral>${dec2(guia.valorTotal.valorTotalGeral)}</ans:valorTotalGeral>`,
  ]
    .filter(Boolean)
    .join("\n");

  return `<ans:guiaSP-SADT>
<ans:cabecalhoGuia>
<ans:registroANS>${escapeXml(guia.registroANS)}</ans:registroANS>
<ans:numeroGuiaPrestador>${escapeXml(guia.numeroGuiaPrestador)}</ans:numeroGuiaPrestador>
</ans:cabecalhoGuia>
<ans:dadosBeneficiario>
<ans:numeroCarteira>${escapeXml(guia.numeroCarteira)}</ans:numeroCarteira>
<ans:atendimentoRN>${guia.atendimentoRN}</ans:atendimentoRN>
</ans:dadosBeneficiario>
<ans:dadosSolicitante>
<ans:contratadoSolicitante>
${buildContratadoDados(sol.contratadoSolicitante)}
</ans:contratadoSolicitante>
<ans:nomeContratadoSolicitante>${escapeXml(sol.nomeContratadoSolicitante)}</ans:nomeContratadoSolicitante>
<ans:profissionalSolicitante>
${buildProfissionalExecutante(sol.profissionalSolicitante)}
</ans:profissionalSolicitante>
</ans:dadosSolicitante>
<ans:dadosSolicitacao>
<ans:caraterAtendimento>${escapeXml(guia.dadosSolicitacao.caraterAtendimento)}</ans:caraterAtendimento>${
    guia.dadosSolicitacao.indicacaoClinica
      ? `\n<ans:indicacaoClinica>${escapeXml(guia.dadosSolicitacao.indicacaoClinica)}</ans:indicacaoClinica>`
      : ""
  }
</ans:dadosSolicitacao>
<ans:dadosExecutante>
<ans:contratadoExecutante>
${buildContratadoDados(exec.contratadoExecutante)}
</ans:contratadoExecutante>
<ans:CNES>${escapeXml(exec.cnes)}</ans:CNES>
</ans:dadosExecutante>
<ans:dadosAtendimento>
<ans:tipoAtendimento>${escapeXml(guia.dadosAtendimento.tipoAtendimento)}</ans:tipoAtendimento>
<ans:indicacaoAcidente>${escapeXml(guia.dadosAtendimento.indicacaoAcidente)}</ans:indicacaoAcidente>
<ans:regimeAtendimento>${escapeXml(guia.dadosAtendimento.regimeAtendimento)}</ans:regimeAtendimento>
</ans:dadosAtendimento>${
    procsXml
      ? `\n<ans:procedimentosExecutados>\n${procsXml}\n</ans:procedimentosExecutados>`
      : ""
  }
<ans:valorTotal>
${valorTotalXml}
</ans:valorTotal>
</ans:guiaSP-SADT>`;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
function buildGuia(guia: TissGuia): string {
  if (guia.tipo === "CONSULTA") return buildGuiaConsulta(guia);
  return buildGuiaSPSADT(guia);
}

// ---------------------------------------------------------------------------
// Hash MD5 — epílogo obrigatório segundo tissV4_02_00.xsd
// Calcula o MD5 hex do conteúdo entre <ans:cabecalho> e </ans:prestadorParaOperadora>
// ---------------------------------------------------------------------------
function computeTissHash(xmlContent: string): string {
  return createHash("md5").update(xmlContent, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Função principal — buildTissXml
// ---------------------------------------------------------------------------
export function buildTissXml(params: TissLoteParams): string {
  const now = new Date();
  const guiasXml = params.guias.map(buildGuia).join("\n");

  // Garantir que sequencialTransacao tenha no máximo 12 caracteres (st_texto12)
  const seqTransacao = params.sequencialTransacao.slice(0, 12);

  // Identificação do prestador na origem — ct_prestadorIdentificacao (choice)
  const origemPrestador = params.prestador.cnpj
    ? `<ans:CNPJ>${escapeXml(params.prestador.cnpj)}</ans:CNPJ>`
    : params.prestador.codigoPrestadorNaOperadora
      ? `<ans:codigoPrestadorNaOperadora>${escapeXml(params.prestador.codigoPrestadorNaOperadora)}</ans:codigoPrestadorNaOperadora>`
      : "";

  // Corpo da mensagem (cabecalho + prestadorParaOperadora) para calcular hash
  const cabecalho = `<ans:cabecalho>
<ans:identificacaoTransacao>
<ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
<ans:sequencialTransacao>${escapeXml(seqTransacao)}</ans:sequencialTransacao>
<ans:dataRegistroTransacao>${formatDate(now)}</ans:dataRegistroTransacao>
<ans:horaRegistroTransacao>${formatTime(now)}</ans:horaRegistroTransacao>
</ans:identificacaoTransacao>
<ans:origem>
<ans:identificacaoPrestador>
${origemPrestador}
</ans:identificacaoPrestador>
</ans:origem>
<ans:destino>
<ans:registroANS>${escapeXml(params.operadora.registroANS)}</ans:registroANS>
</ans:destino>
<ans:Padrao>4.02.00</ans:Padrao>
</ans:cabecalho>`;

  const prestadorParaOperadora = `<ans:prestadorParaOperadora>
<ans:loteGuias>
<ans:numeroLote>${escapeXml(params.numeroLote.slice(0, 12))}</ans:numeroLote>
<ans:guiasTISS>
${guiasXml}
</ans:guiasTISS>
</ans:loteGuias>
</ans:prestadorParaOperadora>`;

  // Hash MD5 sobre cabecalho + corpo
  const hashContent = cabecalho + prestadorParaOperadora;
  const hash = computeTissHash(hashContent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas tissV4_02_00.xsd">
${cabecalho}
${prestadorParaOperadora}
<ans:epilogo>
<ans:hash>${hash}</ans:hash>
</ans:epilogo>
</ans:mensagemTISS>`;
}
