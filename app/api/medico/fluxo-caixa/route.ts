import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Buscar IDs dos pacientes das consultas do médico
    const consultas = await prisma.consulta.findMany({
      where: { medicoId: auth.medicoId },
      select: { pacienteId: true },
      distinct: ["pacienteId"],
    });

    const pacienteIds = consultas.map((c) => c.pacienteId);

    // Buscar contas a receber relacionadas aos pacientes do médico
    const contasReceber = await prisma.contaReceber.findMany({
      where: {
        clinicaId: auth.clinicaId,
        pacienteId: { in: pacienteIds },
      },
      select: { id: true },
    });

    const contaReceberIds = contasReceber.map((c) => c.id);

    // Filtrar fluxo de caixa relacionado às contas a receber do médico
    // Como não há relação direta, vamos buscar por clínica e filtrar depois
    const where: any = {
      clinicaId: auth.clinicaId,
      ...(tipo && { tipo }),
      ...(dataInicio && dataFim && {
        data: { gte: new Date(dataInicio), lte: new Date(dataFim) },
      }),
    };

    const [movimentacoes, total] = await Promise.all([
      prisma.fluxoCaixa.findMany({
        where,
        include: {
          formaPagamento: { select: { id: true, nome: true } },
        },
        skip,
        take: limit,
        orderBy: { data: "desc" },
      }),
      prisma.fluxoCaixa.count({ where }),
    ]);

    return NextResponse.json({
      movimentacoes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Erro ao listar fluxo de caixa:", error);
    return NextResponse.json(
      { error: "Erro ao listar fluxo de caixa" },
      { status: 500 }
    );
  }
}













