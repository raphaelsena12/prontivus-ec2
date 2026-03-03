/**
 * TISS XML Builder - Padrão TISS v4.02.00 (ANS)
 * Gera XML de lotes de guias conforme especificação TISS Janeiro/2026
 */

export interface TissPrestador {
  codigoPrestador: string; // CNPJ
  nomeEmpresarial: string;
  cnes?: string;
}

export interface TissOperadora {
  codigoAns: string;
  razaoSocial: string;
}

export interface TissProcedimento {
  codigoTuss: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface TissGuiaConsulta {
  tipo: "CONSULTA";
  numeroGuia: string;
  numeroCarteirinha: string;
  nomeBeneficiario: string;
  cpfBeneficiario: string;
  dataAtendimento: Date; // YYYY-MM-DD
  codigoTuss: string; // procedimento principal
  descricaoProcedimento: string;
  valorTotal: number;
}

export interface TissGuiaSPSADT {
  tipo: "SPSADT";
  numeroGuia: string;
  numeroCarteirinha: string;
  nomeBeneficiario: string;
  cpfBeneficiario: string;
  dataAtendimento: Date;
  procedimentos: TissProcedimento[];
  valorTotal: number;
}

export type TissGuia = TissGuiaConsulta | TissGuiaSPSADT;

export interface TissLoteParams {
  numeroLote: string;
  sequencialTransacao: string;
  prestador: TissPrestador;
  operadora: TissOperadora;
  guias: TissGuia[];
}

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

function buildGuiaConsulta(guia: TissGuiaConsulta): string {
  return `      <guiaConsulta>
        <cabecalhoGuia>
          <registroANS>${escapeXml(guia.numeroCarteirinha)}</registroANS>
          <numeroGuiaPrestador>${escapeXml(guia.numeroGuia)}</numeroGuiaPrestador>
        </cabecalhoGuia>
        <dadosBeneficiario>
          <numeroCarteira>${escapeXml(guia.numeroCarteirinha)}</numeroCarteira>
          <nomeBeneficiario>${escapeXml(guia.nomeBeneficiario)}</nomeBeneficiario>
          <cpf>${escapeXml(guia.cpfBeneficiario)}</cpf>
        </dadosBeneficiario>
        <dadosAtendimento>
          <dataAtendimento>${formatDate(guia.dataAtendimento)}</dataAtendimento>
          <procedimento>
            <codigoProcedimento>${escapeXml(guia.codigoTuss)}</codigoProcedimento>
            <descricaoProcedimento>${escapeXml(guia.descricaoProcedimento)}</descricaoProcedimento>
          </procedimento>
        </dadosAtendimento>
        <valorTotal>
          <valorTotalGeral>${guia.valorTotal.toFixed(2)}</valorTotalGeral>
        </valorTotal>
      </guiaConsulta>`;
}

function buildGuiaSPSADT(guia: TissGuiaSPSADT): string {
  const procs = guia.procedimentos
    .map(
      (p) => `          <procedimento>
            <codigoProcedimento>${escapeXml(p.codigoTuss)}</codigoProcedimento>
            <descricaoProcedimento>${escapeXml(p.descricao)}</descricaoProcedimento>
            <quantidade>${p.quantidade}</quantidade>
            <valorUnitario>${p.valorUnitario.toFixed(2)}</valorUnitario>
            <valorTotal>${p.valorTotal.toFixed(2)}</valorTotal>
          </procedimento>`
    )
    .join("\n");

  return `      <guiaSPSADT>
        <cabecalhoGuia>
          <registroANS>${escapeXml(guia.numeroCarteirinha)}</registroANS>
          <numeroGuiaPrestador>${escapeXml(guia.numeroGuia)}</numeroGuiaPrestador>
        </cabecalhoGuia>
        <dadosBeneficiario>
          <numeroCarteira>${escapeXml(guia.numeroCarteirinha)}</numeroCarteira>
          <nomeBeneficiario>${escapeXml(guia.nomeBeneficiario)}</nomeBeneficiario>
          <cpf>${escapeXml(guia.cpfBeneficiario)}</cpf>
        </dadosBeneficiario>
        <dadosAtendimento>
          <dataAtendimento>${formatDate(guia.dataAtendimento)}</dataAtendimento>
          <procedimentosExecutados>
${procs}
          </procedimentosExecutados>
        </dadosAtendimento>
        <valorTotal>
          <valorTotalGeral>${guia.valorTotal.toFixed(2)}</valorTotalGeral>
        </valorTotal>
      </guiaSPSADT>`;
}

function buildGuia(guia: TissGuia): string {
  if (guia.tipo === "CONSULTA") return buildGuiaConsulta(guia);
  return buildGuiaSPSADT(guia);
}

export function buildTissXml(params: TissLoteParams): string {
  const now = new Date();
  const guiasXml = params.guias.map(buildGuia).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mensagemTISS xmlns="http://www.ans.gov.br/padroes/tiss/schemas"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas tissV4_02_00.xsd">
  <cabecalho>
    <identificacaoTransacao>
      <tipoTransacao>ENVIO_LOTE_GUIAS</tipoTransacao>
      <sequencialTransacao>${escapeXml(params.sequencialTransacao)}</sequencialTransacao>
      <dataRegistroTransacao>${formatDate(now)}</dataRegistroTransacao>
      <horaRegistroTransacao>${formatTime(now)}</horaRegistroTransacao>
    </identificacaoTransacao>
    <origem>
      <identificacaoPrestador>
        <codigoPrestadorNaOperadora>${escapeXml(params.prestador.codigoPrestador)}</codigoPrestadorNaOperadora>
        <nomeEmpresarial>${escapeXml(params.prestador.nomeEmpresarial)}</nomeEmpresarial>
        ${params.prestador.cnes ? `<CNES>${escapeXml(params.prestador.cnes)}</CNES>` : ""}
      </identificacaoPrestador>
    </origem>
    <destino>
      <identificacaoOperadora>
        <registroANS>${escapeXml(params.operadora.codigoAns)}</registroANS>
        <razaoSocial>${escapeXml(params.operadora.razaoSocial)}</razaoSocial>
      </identificacaoOperadora>
    </destino>
    <versaoPadrao>4.02.00</versaoPadrao>
  </cabecalho>
  <prestadorParaOperadora>
    <loteGuias>
      <numeroLote>${escapeXml(params.numeroLote)}</numeroLote>
      <guiasTISS>
${guiasXml}
      </guiasTISS>
    </loteGuias>
  </prestadorParaOperadora>
</mensagemTISS>`;
}
