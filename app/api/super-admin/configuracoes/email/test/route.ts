import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { verifySMTPConnection } from "@/lib/email/smtp-service";
import nodemailer from "nodemailer";
import { z } from "zod";

const testEmailSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  user: z.string().email(),
  password: z.string().optional(),
});

// POST /api/super-admin/configuracoes/email/test
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
    const validatedData = testEmailSchema.parse(body);

    // Criar transporter temporário para teste
    const testTransporter = nodemailer.createTransport({
      host: validatedData.host,
      port: validatedData.port,
      secure: validatedData.port === 465,
      auth: {
        user: validatedData.user,
        pass: validatedData.password || process.env.SMTP_PASSWORD,
      },
    });

    // Testar conexão
    await testTransporter.verify();

    return NextResponse.json({
      success: true,
      message: "Conexão SMTP testada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao testar conexão SMTP:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Falha ao testar conexão SMTP",
      },
      { status: 400 }
    );
  }
}








