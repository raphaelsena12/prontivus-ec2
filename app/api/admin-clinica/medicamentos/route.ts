import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const medicamentoClinicaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  principioAtivo: z.string().optional(),
  laboratorio: z.string().optional(),
  apresentacao: z.string().optional(),
  concentracao: z.string().optional(),
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where = {
      // Catálogo global (gerenciado pelo SUPER_ADMIN)
      clinicaId: null,
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { principioAtivo: { contains: search, mode: "insensitive" as const } },
          { laboratorio: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [medicamentos, total] = await Promise.all([
      prisma.medicamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.medicamento.count({ where }),
    ]);

    return NextResponse.json({
      medicamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar medicamentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar medicamentos" },
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
    const validation = medicamentoClinicaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const medicamento = await prisma.medicamento.create({
      data: {
        nome: validation.data.nome,
        principioAtivo: validation.data.principioAtivo ?? null,
        laboratorio: validation.data.laboratorio ?? null,
        apresentacao: validation.data.apresentacao ?? null,
        concentracao: validation.data.concentracao ?? null,
        unidade: validation.data.unidade ?? null,
        clinicaId: auth.clinicaId!,
      },
    });

    return NextResponse.json({ medicamento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar medicamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar medicamento" },
      { status: 500 }
    );
  }
}















