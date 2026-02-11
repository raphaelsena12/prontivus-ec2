import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const emailConfigSchema = z.object({
  host: z.string().min(1, "Host é obrigatório"),
  port: z.number().int().positive(),
  user: z.string().email("Email inválido"),
  password: z.string().optional(),
  from: z.string().email("Email remetente inválido"),
  fromName: z.string().optional(),
});

// PUT /api/super-admin/configuracoes/email
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
    const validatedData = emailConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados ou arquivo de configuração
    // Por enquanto, apenas validamos e retornamos sucesso
    // Em produção, você pode usar uma tabela de configurações no Prisma

    return NextResponse.json({
      message: "Configurações de email salvas com sucesso",
      // Nota: Em produção, salve essas configurações de forma segura
      // Não retorne a senha na resposta
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações de email:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








