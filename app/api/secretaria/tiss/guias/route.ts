import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const guiaSchema = z.object({
  tipoGuia: z.enum(["CONSULTA", "SPSADT", "INTERNACAO", "HONORARIO"]),
  pacienteId: z.string().uuid(),
  operadoraId: z.string().uuid(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  medicoId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().min(1),
  dataAtendimento: z.string().transform((s) => new Date(s)),
  consultaId: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  indicacaoAcidente: z.string().optional().default("9"),
  tipoConsulta: z.string().optional().default("1"),
  regimeAtendimento: z.string().optional().default("01"),
  caraterAtendimento: z.string().optional().default("1"),
});

export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tipoGuia = searchParams.get("tipoGuia");
  const operadoraId = searchParams.get("operadoraId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { clinicaId };
  if (status) where.status = status;
  if (tipoGuia) where.tipoGuia = tipoGuia;
  if (operadoraId) where.operadoraId = operadoraId;

  const [guias, total] = await Promise.all([
    prisma.guiaTiss.findMany({
      where,
      include: {
        paciente: { select: { id: true, nome: true, cpf: true } },
        operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
        planoSaude: { select: { id: true, nome: true } },
        procedimentos: {
          include: {
            codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.guiaTiss.count({ where }),
  ]);

  return NextResponse.json({ guias, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const body = await req.json();
  const parsed = guiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Verify paciente belongs to clinica
  const paciente = await prisma.paciente.findFirst({
    where: { id: data.pacienteId, clinicaId },
  });
  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  // Verify operadora belongs to clinica
  const operadora = await prisma.operadora.findFirst({
    where: {
      id: data.operadoraId,
      tenantsAceitacao: { some: { tenantId: clinicaId, aceita: true } },
    },
  });
  if (!operadora) {
    return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });
  }

  // Generate guide number: tipo + timestamp
  const numeroGuia = `${data.tipoGuia.substring(0, 3)}-${Date.now()}`;

  // Se não forneceu medicoId, tenta pegar da consulta
  let medicoId = data.medicoId ?? null;
  if (!medicoId && data.consultaId) {
    const consulta = await prisma.consulta.findFirst({
      where: { id: data.consultaId, clinicaId },
      select: { medicoId: true },
    });
    medicoId = consulta?.medicoId ?? null;
  }

  const guia = await prisma.guiaTiss.create({
    data: {
      clinicaId,
      tipoGuia: data.tipoGuia,
      pacienteId: data.pacienteId,
      operadoraId: data.operadoraId,
      planoSaudeId: data.planoSaudeId ?? null,
      medicoId,
      numeroCarteirinha: data.numeroCarteirinha,
      dataAtendimento: data.dataAtendimento,
      consultaId: data.consultaId ?? null,
      observacoes: data.observacoes ?? null,
      indicacaoAcidente: data.indicacaoAcidente,
      tipoConsulta: data.tipoConsulta,
      regimeAtendimento: data.regimeAtendimento,
      caraterAtendimento: data.caraterAtendimento,
      numeroGuia,
      status: "RASCUNHO",
    },
    include: {
      paciente: { select: { id: true, nome: true } },
      operadora: { select: { id: true, razaoSocial: true } },
    },
  });

  // Marca a consulta como preparada para TISS
  if (data.consultaId) {
    await prisma.consulta.update({
      where: { id: data.consultaId },
      data: { preparadoTiss: true },
    });
  }

  return NextResponse.json(guia, { status: 201 });
}
