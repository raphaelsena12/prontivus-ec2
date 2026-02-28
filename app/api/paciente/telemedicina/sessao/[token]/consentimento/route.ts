import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/paciente/telemedicina/sessao/[token]/consentimento
// Rota PÚBLICA — registra o consentimento LGPD do paciente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const body = await request.json();
    const { consentGiven, consentVersion } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { error: "O consentimento é obrigatório para prosseguir" },
        { status: 400 }
      );
    }

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { patientToken: token },
      include: {
        consulta: { select: { pacienteId: true } },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    if (new Date() > sessao.patientTokenExpiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    // Identidade deve ter sido verificada primeiro
    if (!sessao.identityVerifiedAt) {
      return NextResponse.json(
        { error: "Validação de identidade pendente" },
        { status: 403 }
      );
    }

    // Verifica se já existe consentimento para evitar duplicata
    const consentimentoExistente = await prisma.telemedicineConsent.findFirst({
      where: { sessionId: sessao.id, consentGiven: true },
    });

    if (consentimentoExistente) {
      return NextResponse.json({ success: true, alreadyConsented: true });
    }

    // Cria o registro de consentimento
    await prisma.telemedicineConsent.create({
      data: {
        sessionId: sessao.id,
        pacienteId: sessao.consulta.pacienteId,
        consentGiven: true,
        consentVersion: consentVersion || "1.0",
        ipAddress: ip,
        userAgent,
        consentTimestamp: new Date(),
      },
    });

    // Registra log
    await prisma.telemedicineLog.create({
      data: {
        sessionId: sessao.id,
        pacienteId: sessao.consulta.pacienteId,
        role: "PATIENT",
        eventType: "CONSENT_GIVEN",
        ipAddress: ip,
        metadata: {
          consentVersion: consentVersion || "1.0",
          userAgent,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao registrar consentimento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
