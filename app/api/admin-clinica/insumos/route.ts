import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const insumoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  unidade: z.string().optional(),
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
          { nome: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [insumos, total] = await Promise.all([
      prisma.insumo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.insumo.count({ where }),
    ]);

    return NextResponse.json({
      insumos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar insumos:", error);
    return NextResponse.json(
      { error: "Erro ao listar insumos" },
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
    const validation = insumoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const insumo = await prisma.insumo.create({
      data: {
        ...validation.data,
        clinicaId: auth.clinicaId!,
      },
    });

    return NextResponse.json({ insumo }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar insumo:", error);
    return NextResponse.json(
      { error: "Erro ao criar insumo" },
      { status: 500 }
    );
  }
}

