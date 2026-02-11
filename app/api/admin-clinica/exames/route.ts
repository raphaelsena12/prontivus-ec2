import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const exameSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["LABORATORIAL", "IMAGEM", "OUTROS"]).optional(),
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

    const [exames, total] = await Promise.all([
      prisma.exame.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.exame.count({ where }),
    ]);

    return NextResponse.json({
      exames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar exames:", error);
    return NextResponse.json(
      { error: "Erro ao listar exames" },
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
    const validation = exameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const exame = await prisma.exame.create({
      data: {
        ...validation.data,
        clinicaId: auth.clinicaId!,
      },
    });

    return NextResponse.json({ exame }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar exame:", error);
    return NextResponse.json(
      { error: "Erro ao criar exame" },
      { status: 500 }
    );
  }
}















