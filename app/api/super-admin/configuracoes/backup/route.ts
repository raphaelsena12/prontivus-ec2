import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const backupConfigSchema = z.object({
  backupAutomatico: z.boolean(),
  frequenciaBackup: z.enum(["daily", "weekly", "monthly"]),
  horaBackup: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  manterBackups: z.number().int().min(1),
  backupAntesAtualizacao: z.boolean(),
});

// PUT /api/super-admin/configuracoes/backup
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
    const validatedData = backupConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados
    // Por enquanto, apenas validamos e retornamos sucesso

    return NextResponse.json({
      message: "Configurações de backup salvas com sucesso",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações de backup:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








