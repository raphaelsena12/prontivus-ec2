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
    const { cpfLastFour } = body;

    if (!cpfLastFour || !/^\d{4}$/.test(cpfLastFour)) {
      return NextResponse.json(
        { error: "Informe os 4 últimos dígitos do CPF" },
        { status: 400 }
      );
    }

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
