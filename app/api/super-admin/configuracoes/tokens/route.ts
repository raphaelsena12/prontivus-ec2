import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const tokensConfigSchema = z.object({
  alertaUsoPercentual: z.number().int().min(0).max(100),
  alertaUsoAbsoluto: z.number().int().min(0),
  resetarTokensMensalmente: z.boolean(),
  permitirExcederLimite: z.boolean(),
  bloqueioAutomatico: z.boolean(),
});

// PUT /api/super-admin/configuracoes/tokens
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
    const validatedData = tokensConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados
    // Por enquanto, apenas validamos e retornamos sucesso

    return NextResponse.json({
      message: "Configurações de tokens salvas com sucesso",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações de tokens:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








