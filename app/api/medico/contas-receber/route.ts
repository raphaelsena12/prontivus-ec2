import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
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
      });
    }

    const where: any = {
      clinicaId: auth.clinicaId,
      pacienteId: { in: pacienteIds },
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
      ...(status && { status }),
    };

    const [contas, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: {
          paciente: { select: { id: true, nome: true } },
          formaPagamento: { select: { id: true, nome: true } },
        },
        skip,
        take: limit,
        orderBy: { dataVencimento: "asc" },
      }),
      prisma.contaReceber.count({ where }),
    ]);

    return NextResponse.json({
      contas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Erro ao listar contas a receber:", error);
    return NextResponse.json(
      { error: "Erro ao listar contas a receber" },
      { status: 500 }
    );
  }
}













