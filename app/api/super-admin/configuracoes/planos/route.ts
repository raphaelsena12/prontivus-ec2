import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoPlano } from "@/lib/generated/prisma/enums";
import { z } from "zod";

const planoSchema = z.object({
  nome: z.nativeEnum(TipoPlano),
  tokensMensais: z.number().int().positive(),
  preco: z.number().positive(),
  telemedicineHabilitada: z.boolean(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

// POST /api/super-admin/configuracoes/planos
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = planoSchema.parse(body);

    // Verificar se já existe plano com este nome
    const planoExistente = await prisma.plano.findUnique({
      where: { nome: validatedData.nome },
    });

    if (planoExistente) {
      return NextResponse.json(
        { error: "Já existe um plano com este nome" },
        { status: 409 }
      );
    }

    const plano = await prisma.plano.create({
      data: {
        nome: validatedData.nome,
        tokensMensais: validatedData.tokensMensais,
        preco: validatedData.preco,
        telemedicineHabilitada: validatedData.telemedicineHabilitada,
        descricao: validatedData.descricao || null,
        ativo: validatedData.ativo ?? true,
      },
    });

    return NextResponse.json(
      { plano, message: "Plano criado com sucesso" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao criar plano:", error);
    return NextResponse.json(
      { error: "Erro ao criar plano" },
      { status: 500 }
    );
  }
}








