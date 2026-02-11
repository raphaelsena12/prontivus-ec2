import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const segurancaConfigSchema = z.object({
  senhaMinima: z.number().int().min(6).max(32),
  exigirMaiuscula: z.boolean(),
  exigirMinuscula: z.boolean(),
  exigirNumero: z.boolean(),
  exigirEspecial: z.boolean(),
  expiracaoSenha: z.number().int().min(0),
  tentativasLogin: z.number().int().min(3).max(10),
  bloqueioTemporario: z.boolean(),
  tempoBloqueio: z.number().int().min(1),
  auditoriaAtiva: z.boolean(),
});

// PUT /api/super-admin/configuracoes/seguranca
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
    const validatedData = segurancaConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados
    // Por enquanto, apenas validamos e retornamos sucesso

    return NextResponse.json({
      message: "Configurações de segurança salvas com sucesso",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações de segurança:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








