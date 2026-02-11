import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const manipuladoSchema = z.object({
  medicoId: z.string().min(1, "Médico é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  informacoes: z.string().optional(),
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
          { descricao: { contains: search, mode: "insensitive" as const } },
          { informacoes: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [manipulados, total] = await Promise.all([
      prisma.manipulado.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
      }),
      prisma.manipulado.count({ where }),
    ]);

    return NextResponse.json({
      manipulados,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar manipulados:", error);
    return NextResponse.json(
      { error: "Erro ao listar manipulados" },
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
    const validation = manipuladoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verificar se o médico pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: validation.data.medicoId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado ou não pertence à clínica" },
        { status: 404 }
      );
    }

    const manipulado = await prisma.manipulado.create({
      data: {
        ...validation.data,
        clinicaId: auth.clinicaId!,
        informacoes: validation.data.informacoes || null,
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ manipulado }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar manipulado:", error);
    return NextResponse.json(
      { error: "Erro ao criar manipulado" },
      { status: 500 }
    );
  }
}
