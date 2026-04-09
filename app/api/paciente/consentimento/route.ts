import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { VERSAO_TERMO_ATUAL, getTextoTermo } from "@/lib/lgpd/termo-consentimento";
import { auditLogFromRequest } from "@/lib/audit-log";

/**
 * GET /api/paciente/consentimento
 *
 * Retorna o status do consentimento do paciente logado:
 * - Se já aceitou a versão atual do termo
 * - O texto do termo para exibir
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!session.user.clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada na sessão" }, { status: 403 });
    }

    const paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        clinicaId: session.user.clinicaId,
        ativo: true,
      },
      select: { id: true, clinicaId: true },
    });

    if (!paciente) {
      // Tentar buscar apenas pelo usuarioId (paciente pode estar em outra clínica)
      const pacienteSemClinica = await prisma.paciente.findFirst({
        where: {
          usuarioId: session.user.id,
          ativo: true,
        },
        select: { id: true, clinicaId: true },
      });

      if (!pacienteSemClinica) {
        return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
      }

      // Usar a clínica do paciente encontrado
      const clinica = await prisma.tenant.findUnique({
        where: { id: pacienteSemClinica.clinicaId },
        select: { nome: true },
      });

      const consentimento = await prisma.consentimentoLGPD.findFirst({
        where: {
          pacienteId: pacienteSemClinica.id,
          clinicaId: pacienteSemClinica.clinicaId,
          versaoTermo: VERSAO_TERMO_ATUAL,
          revogadoEm: null,
        },
        orderBy: { aceitoEm: "desc" },
      });

      return NextResponse.json({
        consentimentoAceito: !!consentimento,
        versaoAtual: VERSAO_TERMO_ATUAL,
        aceitoEm: consentimento?.aceitoEm || null,
        textoTermo: getTextoTermo(clinica?.nome || "a clínica"),
      });
    }

    // Buscar o consentimento ativo mais recente para a versão atual
    const consentimento = await prisma.consentimentoLGPD.findFirst({
      where: {
        pacienteId: paciente.id,
        clinicaId: paciente.clinicaId,
        versaoTermo: VERSAO_TERMO_ATUAL,
        revogadoEm: null,
      },
      orderBy: { aceitoEm: "desc" },
    });

    // Buscar nome da clínica para o texto do termo
    const clinica = await prisma.tenant.findUnique({
      where: { id: paciente.clinicaId },
      select: { nome: true },
    });

    return NextResponse.json({
      consentimentoAceito: !!consentimento,
      versaoAtual: VERSAO_TERMO_ATUAL,
      aceitoEm: consentimento?.aceitoEm || null,
      textoTermo: getTextoTermo(clinica?.nome || "a clínica"),
    });
  } catch (error) {
    console.error("Erro ao verificar consentimento:", error);
    return NextResponse.json(
      { error: "Erro ao verificar consentimento" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/paciente/consentimento
 *
 * Registra o aceite do termo de consentimento LGPD pelo paciente.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar paciente: primeiro pela clínica da sessão, depois fallback pelo usuarioId
    let paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        ...(session.user.clinicaId ? { clinicaId: session.user.clinicaId } : {}),
        ativo: true,
      },
      select: { id: true, clinicaId: true, nome: true },
    });

    if (!paciente) {
      paciente = await prisma.paciente.findFirst({
        where: { usuarioId: session.user.id, ativo: true },
        select: { id: true, clinicaId: true, nome: true },
      });
    }

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    // Verificar se já aceitou essa versão
    const jaAceitou = await prisma.consentimentoLGPD.findFirst({
      where: {
        pacienteId: paciente.id,
        clinicaId: paciente.clinicaId,
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
      where: { id: paciente.clinicaId },
      select: { nome: true },
    });

    const ipAddress =
      request.headers.get("x-client-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    const consentimento = await prisma.consentimentoLGPD.create({
      data: {
        pacienteId: paciente.id,
        clinicaId: paciente.clinicaId,
        versaoTermo: VERSAO_TERMO_ATUAL,
        textoTermo: getTextoTermo(clinica?.nome || "a clínica"),
        canalAceite: "PORTAL_ONLINE",
        ipAddress,
      },
    });

    auditLogFromRequest(request, {
      action: "CREATE",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        pacienteNome: paciente.nome,
        operacao: "Aceitou termo de consentimento LGPD",
        versaoTermo: VERSAO_TERMO_ATUAL,
        canalAceite: "PORTAL_ONLINE",
      },
    });

    return NextResponse.json({ consentimento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar consentimento:", error);
    return NextResponse.json(
      { error: "Erro ao registrar consentimento" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/paciente/consentimento
 *
 * Revoga o consentimento LGPD do paciente.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        ...(session.user.clinicaId ? { clinicaId: session.user.clinicaId } : {}),
        ativo: true,
      },
      select: { id: true, clinicaId: true, nome: true },
    });

    if (!paciente) {
      paciente = await prisma.paciente.findFirst({
        where: { usuarioId: session.user.id, ativo: true },
        select: { id: true, clinicaId: true, nome: true },
      });
    }

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    // Revogar todos os consentimentos ativos
    const { count } = await prisma.consentimentoLGPD.updateMany({
      where: {
        pacienteId: paciente.id,
        clinicaId: paciente.clinicaId,
        revogadoEm: null,
      },
      data: {
        revogadoEm: new Date(),
      },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "Nenhum consentimento ativo para revogar" },
        { status: 404 }
      );
    }

    auditLogFromRequest(request, {
      action: "UPDATE",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        pacienteNome: paciente.nome,
        operacao: "Revogou consentimento LGPD",
        consentimentosRevogados: count,
      },
    });

    return NextResponse.json({
      message: "Consentimento revogado com sucesso",
      consentimentosRevogados: count,
    });
  } catch (error) {
    console.error("Erro ao revogar consentimento:", error);
    return NextResponse.json(
      { error: "Erro ao revogar consentimento" },
      { status: 500 }
    );
  }
}
