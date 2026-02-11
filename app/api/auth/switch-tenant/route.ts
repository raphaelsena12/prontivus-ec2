import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusClinica, TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const switchTenantSchema = z.object({
  tenantId: z.string().uuid("ID de tenant inválido"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = switchTenantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantId } = validation.data;

    // Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        nome: true,
        status: true,
        dataExpiracao: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se o tenant está ativo
    if (tenant.status !== StatusClinica.ATIVA) {
      return NextResponse.json({ error: "Clínica inativa" }, { status: 403 });
    }

    // Verificar licença válida (se tiver data de expiração)
    if (tenant.dataExpiracao) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataExpiracao = new Date(tenant.dataExpiracao);
      dataExpiracao.setHours(0, 0, 0, 0);

      if (dataExpiracao < hoje) {
        return NextResponse.json(
          { error: "Licença da clínica expirada" },
          { status: 403 }
        );
      }
    }
    // Se não tem dataExpiracao, permitir acesso (sem limite)

    // Verificar se o usuário tem acesso a este tenant
    // Primeiro, verificar via UsuarioTenant
    let usuarioTenant = await prisma.usuarioTenant.findUnique({
      where: {
        usuarioId_tenantId: {
          usuarioId: session.user.id,
          tenantId: tenantId,
        },
      },
    });

    let userTipo = session.user.tipo;

    // Se não encontrou via UsuarioTenant e é médico, verificar via tabela Medico
    if (!usuarioTenant && session.user.tipo === TipoUsuario.MEDICO) {
      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: session.user.id,
          clinicaId: tenantId,
          ativo: true,
        },
      });

      if (medico) {
        // Médico tem acesso via tabela Medico
        userTipo = TipoUsuario.MEDICO;
      } else {
        return NextResponse.json(
          { error: "Acesso negado a este tenant" },
          { status: 403 }
        );
      }
    } else if (!usuarioTenant || !usuarioTenant.ativo) {
      // Se não é médico ou não encontrou em nenhum lugar, negar acesso
      return NextResponse.json(
        { error: "Acesso negado a este tenant" },
        { status: 403 }
      );
    } else {
      // Se encontrou via UsuarioTenant, usar o tipo do registro
      userTipo = usuarioTenant.tipo;
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        tipo: userTipo,
      },
    });
  } catch (error) {
    console.error("Erro ao trocar tenant:", error);
    return NextResponse.json(
      { error: "Erro interno ao trocar tenant" },
      { status: 500 }
    );
  }
}
