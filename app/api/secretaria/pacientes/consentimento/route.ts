import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { VERSAO_TERMO_ATUAL, getTextoTermo } from "@/lib/lgpd/termo-consentimento";
import { auditLogFromRequest } from "@/lib/audit-log";

/**
 * POST /api/secretaria/pacientes/consentimento
 *
 * Registra consentimento presencial do paciente (secretária marca no cadastro).
 * Body: { pacienteId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const isAllowed =
      session.user.tipo === TipoUsuario.SECRETARIA ||
      session.user.tipo === TipoUsuario.ADMIN_CLINICA;

    if (!isAllowed) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { pacienteId } = await request.json();

    if (!pacienteId) {
      return NextResponse.json({ error: "pacienteId é obrigatório" }, { status: 400 });
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, clinicaId, ativo: true },
      select: { id: true, clinicaId: true, nome: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    // Verificar se já tem consentimento ativo
    const jaAceitou = await prisma.consentimentoLGPD.findFirst({
      where: {
        pacienteId: paciente.id,
        clinicaId,
        versaoTermo: VERSAO_TERMO_ATUAL,
        revogadoEm: null,
      },
    });

    if (jaAceitou) {
      return NextResponse.json({
        message: "Consentimento já registrado",
        consentimento: jaAceitou,
      });
    }

    const clinica = await prisma.tenant.findUnique({
      where: { id: clinicaId },
      select: { nome: true },
    });

    const consentimento = await prisma.consentimentoLGPD.create({
      data: {
        pacienteId: paciente.id,
        clinicaId,
        versaoTermo: VERSAO_TERMO_ATUAL,
        textoTermo: getTextoTermo(clinica?.nome || "a clínica"),
        canalAceite: "PRESENCIAL",
      },
    });

    auditLogFromRequest(request, {
      action: "CREATE",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        pacienteNome: paciente.nome,
        operacao: "Registrou consentimento LGPD presencial",
        versaoTermo: VERSAO_TERMO_ATUAL,
        registradoPor: session.user.nome,
      },
    });

    return NextResponse.json({ consentimento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar consentimento presencial:", error);
    return NextResponse.json(
      { error: "Erro ao registrar consentimento" },
      { status: 500 }
    );
  }
}
