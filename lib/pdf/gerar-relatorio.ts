/**
 * Função compartilhada de geração de relatórios PDF
 * Usada tanto na rota de visualização/download quanto na rota de upload S3
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { TipoRelatorio } from "./relatorios";
import {
  gerarRelatorioFaturamento,
  gerarRelatorioVendas,
  gerarRelatorioFaturamentoMedico,
  gerarRelatorioEstoque,
  gerarRelatorioContasPagar,
  gerarRelatorioContasReceber,
} from "./relatorios";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function gerarRelatorioPdf(
  tipo: TipoRelatorio,
  clinicaId: string,
  dataInicio: string,
  dataFim: string
): Promise<Buffer> {
  // Parsear sem conversão UTC (usa fuso local do servidor)
  const [iniY, iniM, iniD] = dataInicio.split("-").map(Number);
  const [fimY, fimM, fimD] = dataFim.split("-").map(Number);
  const inicio = new Date(iniY, iniM - 1, iniD, 0, 0, 0, 0);
  const fim = new Date(fimY, fimM - 1, fimD, 23, 59, 59, 999);

  // Buscar info da clínica
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { nome: true, cnpj: true, telefone: true, email: true, endereco: true, cidade: true, estado: true, logoUrl: true },
  });

  // Determinar chave S3 da logo: preferir Tenant.logoUrl, fallback para avatar do admin
  let logoKey: string | null = clinica?.logoUrl ?? null;
  if (!logoKey) {
    const adminUser = await prisma.usuarioTenant.findFirst({
      where: { tenantId: clinicaId, tipo: "ADMIN_CLINICA" },
      select: { usuario: { select: { avatar: true } } },
    });
    logoKey = adminUser?.usuario?.avatar ?? null;
  }

  // Buscar logo do S3 (a chave S3 não é uma URL completa)
  let logo: { data: string; format: string } | undefined;
  if (logoKey) {
    try {
      const cmd = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos",
        Key: logoKey,
      });
      const s3Res = await s3.send(cmd);
      const chunks: Uint8Array[] = [];
      for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buf = Buffer.concat(chunks);
      const ct = s3Res.ContentType || logoKey;
      const format = ct.includes("png") ? "PNG" : ct.includes("webp") ? "WEBP" : "JPEG";
      logo = { data: buf.toString("base64"), format };
    } catch {
      // logo indisponível — ignora
    }
  }

  const clinicaInfo = {
    nome: clinica?.nome || "Clínica",
    cnpj: clinica?.cnpj || "",
    telefone: clinica?.telefone || undefined,
    email: clinica?.email || undefined,
    endereco: clinica?.endereco || undefined,
    cidade: clinica?.cidade || undefined,
    estado: clinica?.estado || undefined,
    logo,
  };

  // ── Faturamento ────────────────────────────────────────────────────────────
  if (tipo === "faturamento") {
    const consultas = await prisma.consulta.findMany({
      where: { clinicaId, status: "REALIZADA", dataHora: { gte: inicio, lte: fim } },
      select: {
        id: true, dataHora: true, valorCobrado: true,
        paciente: { select: { nome: true } },
        medico: { select: { usuario: { select: { nome: true } } } },
        operadora: { select: { nomeFantasia: true, razaoSocial: true } },
        codigoTuss: { select: { descricao: true } },
      },
      orderBy: { dataHora: "asc" },
    });

    return gerarRelatorioFaturamento({
      clinica: clinicaInfo,
      inicio: dataInicio,
      fim: dataFim,
      consultas: consultas.map((c) => ({
        id: c.id,
        data: c.dataHora,
        paciente: c.paciente?.nome || "—",
        medico: c.medico?.usuario?.nome || "—",
        procedimento: c.codigoTuss?.descricao || "Consulta",
        operadora: c.operadora?.nomeFantasia || c.operadora?.razaoSocial || null,
        valorCobrado: Number(c.valorCobrado || 0),
      })),
    });
  }

  // ── Vendas ─────────────────────────────────────────────────────────────────
  if (tipo === "vendas") {
    const consultas = await prisma.consulta.findMany({
      where: { clinicaId, dataHora: { gte: inicio, lte: fim } },
      select: {
        id: true, dataHora: true, status: true, valorCobrado: true,
        paciente: { select: { nome: true } },
        medico: { select: { usuario: { select: { nome: true } } } },
        operadora: { select: { nomeFantasia: true, razaoSocial: true } },
      },
      orderBy: { dataHora: "asc" },
    });

    return gerarRelatorioVendas({
      clinica: clinicaInfo,
      inicio: dataInicio,
      fim: dataFim,
      consultas: consultas.map((c) => ({
        id: c.id,
        data: c.dataHora,
        paciente: c.paciente?.nome || "—",
        medico: c.medico?.usuario?.nome || "—",
        status: c.status,
        operadora: c.operadora?.nomeFantasia || c.operadora?.razaoSocial || null,
        valorCobrado: Number(c.valorCobrado || 0),
      })),
    });
  }

  // ── Faturamento por Médico ─────────────────────────────────────────────────
  if (tipo === "faturamento-medico") {
    const consultas = await prisma.consulta.findMany({
      where: { clinicaId, status: "REALIZADA", dataHora: { gte: inicio, lte: fim } },
      select: {
        id: true, dataHora: true, valorCobrado: true, valorRepassado: true, medicoId: true,
        medico: { select: { especialidade: true, usuario: { select: { nome: true } } } },
        paciente: { select: { nome: true } },
      },
      orderBy: { dataHora: "asc" },
    });

    const medicoMap = new Map<string, {
      medicoId: string; nome: string; especialidade: string;
      totalConsultas: number; valorTotal: number; valorRepasse: number;
      consultas: { data: Date; paciente: string; valorCobrado: number; valorRepassado: number }[];
    }>();

    for (const c of consultas) {
      const existing = medicoMap.get(c.medicoId);
      const nome = c.medico?.usuario?.nome || "Médico";
      const esp = c.medico?.especialidade || "Clínica Geral";
      const vCob = Number(c.valorCobrado || 0);
      const vRep = Number(c.valorRepassado || 0);
      const row = { data: c.dataHora, paciente: c.paciente?.nome || "—", valorCobrado: vCob, valorRepassado: vRep };

      if (!existing) {
        medicoMap.set(c.medicoId, { medicoId: c.medicoId, nome, especialidade: esp, totalConsultas: 1, valorTotal: vCob, valorRepasse: vRep, consultas: [row] });
      } else {
        existing.totalConsultas++;
        existing.valorTotal += vCob;
        existing.valorRepasse += vRep;
        existing.consultas.push(row);
      }
    }

    return gerarRelatorioFaturamentoMedico({
      clinica: clinicaInfo,
      inicio: dataInicio,
      fim: dataFim,
      medicos: Array.from(medicoMap.values()).sort((a, b) => b.valorTotal - a.valorTotal),
    });
  }

  // ── Estoque ────────────────────────────────────────────────────────────────
  if (tipo === "estoque") {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { clinicaId, data: { gte: inicio, lte: fim } },
      select: {
        id: true, data: true, tipoEstoque: true, tipo: true,
        quantidade: true, motivo: true, observacoes: true,
        estoqueMedicamento: { select: { medicamento: { select: { nome: true } } } },
        estoqueInsumo: { select: { insumo: { select: { nome: true } } } },
      },
      orderBy: { data: "asc" },
    });

    return gerarRelatorioEstoque({
      clinica: clinicaInfo,
      inicio: dataInicio,
      fim: dataFim,
      movimentacoes: movimentacoes.map((m) => ({
        id: m.id, data: m.data, tipoEstoque: m.tipoEstoque,
        item: m.tipoEstoque === "MEDICAMENTO"
          ? m.estoqueMedicamento?.medicamento?.nome || "—"
          : m.estoqueInsumo?.insumo?.nome || "—",
        tipo: m.tipo, quantidade: m.quantidade,
        motivo: m.motivo, observacoes: m.observacoes,
      })),
    });
  }

  // ── Contas a Pagar ─────────────────────────────────────────────────────────
  if (tipo === "contas-pagar") {
    const contas = await prisma.contaPagar.findMany({
      where: { clinicaId, dataVencimento: { gte: inicio, lte: fim } },
      select: {
        id: true, descricao: true, fornecedor: true, valor: true,
        dataVencimento: true, dataPagamento: true, status: true, observacoes: true,
      },
      orderBy: { dataVencimento: "asc" },
    });

    return gerarRelatorioContasPagar({
      clinica: clinicaInfo,
      inicio: dataInicio,
      fim: dataFim,
      contas: contas.map((c) => ({ ...c, valor: Number(c.valor) })),
    });
  }

  // ── Contas a Receber ───────────────────────────────────────────────────────
  const contas = await prisma.contaReceber.findMany({
    where: { clinicaId, dataVencimento: { gte: inicio, lte: fim } },
    select: {
      id: true, descricao: true, valor: true,
      dataVencimento: true, dataRecebimento: true, status: true, observacoes: true,
      paciente: { select: { nome: true } },
    },
    orderBy: { dataVencimento: "asc" },
  });

  return gerarRelatorioContasReceber({
    clinica: clinicaInfo,
    inicio: dataInicio,
    fim: dataFim,
    contas: contas.map((c) => ({
      id: c.id, descricao: c.descricao,
      paciente: c.paciente?.nome || null,
      valor: Number(c.valor),
      dataVencimento: c.dataVencimento,
      dataRecebimento: c.dataRecebimento,
      status: c.status, observacoes: c.observacoes,
    })),
  });
}
