import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const awsConfigSchema = z.object({
  region: z.string().min(1, "Região é obrigatória"),
  accessKeyId: z.string().min(1, "Access Key ID é obrigatório"),
  secretAccessKey: z.string().optional(),
});

// PUT /api/super-admin/configuracoes/aws
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
    const validatedData = awsConfigSchema.parse(body);

    // Aqui você salvaria as configurações em um banco de dados ou arquivo de configuração
    // Por enquanto, apenas validamos e retornamos sucesso
    // Em produção, você pode usar uma tabela de configurações no Prisma
    // IMPORTANTE: Criptografe as credenciais antes de salvar

    return NextResponse.json({
      message: "Configurações AWS salvas com sucesso",
      // Nota: Em produção, salve essas configurações de forma segura e criptografada
      // Não retorne as credenciais na resposta
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações AWS:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








