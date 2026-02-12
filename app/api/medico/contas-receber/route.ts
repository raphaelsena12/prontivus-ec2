import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  pacienteId: z.string().uuid().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

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

export async function POST(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = contaReceberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verificar se o paciente pertence às consultas do médico (se fornecido)
    if (validation.data.pacienteId) {
      const consulta = await prisma.consulta.findFirst({
        where: {
          pacienteId: validation.data.pacienteId,
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!consulta) {
        return NextResponse.json(
          { error: "Paciente não encontrado ou não pertence às suas consultas" },
          { status: 403 }
        );
      }
    }

    const conta = await prisma.contaReceber.create({
      data: {
        ...validation.data,
        dataVencimento: new Date(validation.data.dataVencimento),
        clinicaId: auth.clinicaId,
        status: "PENDENTE",
      },
    });

    return NextResponse.json({ conta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta a receber" },
      { status: 500 }
    );
  }
}













