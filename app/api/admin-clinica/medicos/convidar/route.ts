import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const convidarMedicoSchema = z.object({
  email: z.string().email("Email inválido"),
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
});

// POST - Convidar/associar médico existente à clínica
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = convidarMedicoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, crm, especialidade } = validation.data;

    // Buscar usuário pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado",
          message:
            "O médico deve ter uma conta no sistema antes de ser associado à clínica.",
        },
        { status: 404 }
      );
    }

    if (!usuario.ativo) {
      return NextResponse.json(
        { error: "Usuário está desativado no sistema" },
        { status: 400 }
      );
    }

    // Verificar se já está associado a esta clínica (tabela pode não existir ainda)
    let existingAssociation = null;
    try {
      existingAssociation = await prisma.usuarioTenant.findUnique({
        where: {
          usuarioId_tenantId: {
            usuarioId: usuario.id,
            tenantId: auth.clinicaId!,
          },
        },
      });

      if (existingAssociation) {
        if (existingAssociation.ativo) {
          return NextResponse.json(
            { error: "Usuário já está associado a esta clínica" },
            { status: 409 }
          );
        } else {
          // Reativar associação existente
          await prisma.usuarioTenant.update({
            where: { id: existingAssociation.id },
            data: { ativo: true, tipo: TipoUsuario.MEDICO },
          });
        }
      }
    } catch {
      // Tabela UsuarioTenant pode não existir ainda - ignorar erro
    }

    // Verificar se já existe registro de médico nesta clínica
    const existingMedico = await prisma.medico.findFirst({
      where: {
        usuarioId: usuario.id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (existingMedico) {
      if (existingMedico.ativo) {
        return NextResponse.json(
          { error: "Este usuário já é médico nesta clínica" },
          { status: 409 }
        );
      } else {
        // Reativar médico existente
        const medico = await prisma.medico.update({
          where: { id: existingMedico.id },
          data: {
            ativo: true,
            crm,
            especialidade,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        });

        return NextResponse.json(
          {
            medico,
            message: "Médico reativado na clínica com sucesso",
          },
          { status: 200 }
        );
      }
    }

    // Criar UsuarioTenant se não existir (tabela pode não existir ainda)
    if (!existingAssociation) {
      try {
        await prisma.usuarioTenant.create({
          data: {
            usuarioId: usuario.id,
            tenantId: auth.clinicaId!,
            tipo: TipoUsuario.MEDICO,
            ativo: true,
            isPrimary: false, // Não é a clínica principal
          },
        });
      } catch {
        // Tabela UsuarioTenant pode não existir ainda - ignorar erro
        // O usuário ainda será associado via clinicaId legado no registro de Médico
      }
    }

    // Criar registro de Médico para esta clínica
    const result = await prisma.medico.create({
      data: {
        usuarioId: usuario.id,
        clinicaId: auth.clinicaId!,
        crm,
        especialidade,
        ativo: true,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        medico: result,
        message: "Médico associado à clínica com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao convidar médico:", error);
    return NextResponse.json(
      { error: "Erro interno ao convidar médico" },
      { status: 500 }
    );
  }
}

// GET - Buscar médico por email (para preencher dados antes de convidar)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { found: false, message: "Usuário não encontrado" },
        { status: 200 }
      );
    }

    // Verificar se já está associado a esta clínica (tabela pode não existir ainda)
    let existingAssociation = null;
    try {
      existingAssociation = await prisma.usuarioTenant.findUnique({
        where: {
          usuarioId_tenantId: {
            usuarioId: usuario.id,
            tenantId: auth.clinicaId!,
          },
        },
      });
    } catch {
      // Tabela UsuarioTenant pode não existir ainda - ignorar erro
    }

    // Verificar se já é médico nesta clínica
    const existingMedico = await prisma.medico.findFirst({
      where: {
        usuarioId: usuario.id,
        clinicaId: auth.clinicaId!,
      },
    });

    return NextResponse.json({
      found: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        ativo: usuario.ativo,
      },
      jaAssociado: !!existingAssociation?.ativo,
      jaMedico: !!existingMedico?.ativo,
    });
  } catch (error) {
    console.error("Erro ao buscar médico:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar médico" },
      { status: 500 }
    );
  }
}
