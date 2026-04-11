import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/paciente/telemedicina/sessao/[token]/validar-identidade
// Rota PÚBLICA — valida os últimos 4 dígitos do CPF do paciente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const body = await request.json();
    const { cpfLastFour, skipValidation } = body;

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { patientToken: token },
      include: {
        consulta: {
          select: { paciente: { select: { id: true, cpf: true } } },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    if (new Date() > sessao.patientTokenExpiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    if (["finished", "cancelled"].includes(sessao.status)) {
      return NextResponse.json({ error: "Sessão encerrada" }, { status: 410 });
    }

    // Se já foi verificado, retorna sucesso
    if (sessao.identityVerifiedAt) {
      return NextResponse.json({ verified: true });
    }

    // App mobile: paciente já está autenticado, pular validação de CPF
    if (skipValidation) {
      const paciente = sessao.consulta.paciente;
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: { identityVerifiedAt: new Date() },
      });
      await prisma.telemedicineLog.create({
        data: {
          sessionId: sessao.id,
          pacienteId: paciente.id,
          role: "PATIENT",
          eventType: "IDENTITY_VERIFIED",
          ipAddress: ip,
          metadata: { method: "APP_AUTHENTICATED", result: "success" },
        },
      });
      return NextResponse.json({ verified: true });
    }

    if (!cpfLastFour || !/^\d{4}$/.test(cpfLastFour)) {
      return NextResponse.json(
        { error: "Informe os 4 últimos dígitos do CPF" },
        { status: 400 }
      );
    }

    // P1-4: Rate limiting baseado em logs — máximo 5 falhas na última hora por sessão
    const falhasRecentes = await prisma.telemedicineLog.count({
      where: {
        sessionId: sessao.id,
        eventType: "IDENTITY_FAILED",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (falhasRecentes >= 5) {
      return NextResponse.json(
        { error: "Muitas tentativas incorretas. Aguarde 1 hora ou entre em contato com a clínica." },
        { status: 429 }
      );
    }

    const paciente = sessao.consulta.paciente;
    const cpfNumeros = (paciente.cpf || "").replace(/\D/g, "");
    const cpfValido = cpfNumeros.slice(-4) === cpfLastFour;

    // Registra log com resultado
    await prisma.telemedicineLog.create({
      data: {
        sessionId: sessao.id,
        pacienteId: paciente.id,
        role: "PATIENT",
        eventType: cpfValido ? "IDENTITY_VERIFIED" : "IDENTITY_FAILED",
        ipAddress: ip,
        metadata: {
          method: "CPF_LAST4",
          result: cpfValido ? "success" : "failure",
        },
      },
    });

    if (!cpfValido) {
      return NextResponse.json(
        { error: "CPF incorreto. Verifique e tente novamente." },
        { status: 401 }
      );
    }

    // Marca identidade como verificada
    await prisma.telemedicineSession.update({
      where: { id: sessao.id },
      data: { identityVerifiedAt: new Date() },
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Erro ao validar identidade:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
