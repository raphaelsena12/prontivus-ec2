import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
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

    if (pacienteIds.length === 0) {
      return NextResponse.json({
        contas: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        resumo: {
          totalInadimplente: 0,
          quantidadeContas: 0,
          diasMedioAtraso: 0,
        },
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar contas vencidas e pendentes
    const where: any = {
      clinicaId: auth.clinicaId,
      pacienteId: { in: pacienteIds },
      status: { in: ["PENDENTE", "VENCIDO"] },
      dataVencimento: { lt: hoje },
      ...(search && {
        OR: [
          { descricao: { contains: search, mode: "insensitive" as const } },
          {
            paciente: {
              nome: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };

    const [contas, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: {
          paciente: { select: { id: true, nome: true, cpf: true } },
          formaPagamento: { select: { id: true, nome: true } },
        },
        skip,
        take: limit,
        orderBy: { dataVencimento: "asc" },
      }),
      prisma.contaReceber.count({ where }),
    ]);

    // Calcular resumo
    const totalInadimplente = contas.reduce(
      (acc, c) => acc + Number(c.valor),
      0
    );

    const diasAtraso = contas.map((c) => {
      const dias = Math.floor(
        (hoje.getTime() - new Date(c.dataVencimento).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return dias;
    });

    const diasMedioAtraso =
      diasAtraso.length > 0
        ? Math.round(
            diasAtraso.reduce((acc, d) => acc + d, 0) / diasAtraso.length
          )
        : 0;

    return NextResponse.json({
      contas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      resumo: {
        totalInadimplente,
        quantidadeContas: total,
        diasMedioAtraso,
      },
    });
  } catch (error) {
    console.error("Erro ao listar inadimplência:", error);
    return NextResponse.json(
      { error: "Erro ao listar inadimplência" },
      { status: 500 }
    );
  }
}













