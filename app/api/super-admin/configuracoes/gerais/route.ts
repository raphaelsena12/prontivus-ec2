import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const geraisConfigSchema = z.object({
  nomeSistema: z.string().min(1, "Nome do sistema é obrigatório"),
  descricaoSistema: z.string().optional(),
  modoManutencao: z.boolean(),
  mensagemManutencao: z.string().optional(),
  urlLogo: z.string().url().optional().or(z.literal("")),
  urlFavicon: z.string().url().optional().or(z.literal("")),
});

// PUT /api/super-admin/configuracoes/gerais
export async function PUT(request: NextRequest) {
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
    const validatedData = geraisConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados
    // Por enquanto, apenas validamos e retornamos sucesso

    return NextResponse.json({
      message: "Configurações gerais salvas com sucesso",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações gerais:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








