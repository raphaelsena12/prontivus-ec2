import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const procedimentoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  medicamentos: z.array(z.object({
    medicamentoId: z.string(),
    quantidade: z.number().optional(),
    observacoes: z.string().optional(),
  })).optional(),
  insumos: z.array(z.object({
    insumoId: z.string(),
    quantidade: z.number().optional(),
    observacoes: z.string().optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = {
      clinicaId: auth.clinicaId!,
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { nome: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [procedimentos, total] = await Promise.all([
      prisma.procedimento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          procedimentosMedicamentos: {
            include: {
              medicamento: true,
            },
          },
          procedimentosInsumos: {
            include: {
              insumo: true,
            },
          },
        },
      }),
      prisma.procedimento.count({ where }),
    ]);

    return NextResponse.json({
      procedimentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar procedimentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar procedimentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = procedimentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código já existe
    const procedimentoExistente = await prisma.procedimento.findFirst({
      where: {
        codigo: data.codigo,
        clinicaId: auth.clinicaId!,
      },
    });

    if (procedimentoExistente) {
      return NextResponse.json(
        { error: "Código já cadastrado" },
        { status: 409 }
      );
    }

    const procedimento = await prisma.procedimento.create({
      data: {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        valor: data.valor,
        clinicaId: auth.clinicaId!,
        procedimentosMedicamentos: data.medicamentos ? {
          create: data.medicamentos.map((m: any) => ({
            medicamentoId: m.medicamentoId,
            quantidade: m.quantidade ? m.quantidade : null,
            observacoes: m.observacoes || null,
          })),
        } : undefined,
        procedimentosInsumos: data.insumos ? {
          create: data.insumos.map((i: any) => ({
            insumoId: i.insumoId,
            quantidade: i.quantidade ? i.quantidade : null,
            observacoes: i.observacoes || null,
          })),
        } : undefined,
      },
      include: {
        procedimentosMedicamentos: {
          include: {
            medicamento: true,
          },
        },
        procedimentosInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });

    return NextResponse.json({ procedimento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar procedimento:", error);
    return NextResponse.json(
      { error: "Erro ao criar procedimento" },
      { status: 500 }
    );
  }
}















