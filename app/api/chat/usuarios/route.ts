import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  const isMedico = session.user.tipo === TipoUsuario.MEDICO;
  const isSecretaria = session.user.tipo === TipoUsuario.SECRETARIA;

  if (!isMedico && !isSecretaria) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    clinicaId,
    usuarioId: session.user.id,
    usuarioTipo: session.user.tipo,
  };
}

// GET /api/chat/usuarios - Listar médicos ou secretárias para chat
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    if (auth.usuarioTipo === TipoUsuario.MEDICO) {
      // Médico vê as secretárias
      const secretarias = await prisma.usuario.findMany({
        where: {
          tipo: TipoUsuario.SECRETARIA,
          clinicaId: auth.clinicaId,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          avatar: true,
        },
        orderBy: { nome: "asc" },
      });

      // Buscar médico do usuário atual
      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: auth.usuarioId,
          clinicaId: auth.clinicaId,
        },
        select: { id: true },
      });

      if (!medico) {
        // Se não encontrou médico, retornar secretárias sem contagem
        return NextResponse.json({ 
          usuarios: secretarias.map(s => ({ ...s, mensagensNaoLidas: 0 }))
        });
      }

      // Contar mensagens não lidas por secretária
      const usuariosComContagem = await Promise.all(
        secretarias.map(async (secretaria) => {
          const naoLidas = await prisma.mensagemMedicoSecretaria.count({
            where: {
              clinicaId: auth.clinicaId,
              medicoId: medico.id,
              secretariaId: secretaria.id,
              lida: false,
              enviadoPorMedico: false, // Mensagens enviadas pela secretária
            },
          });

          return {
            ...secretaria,
            mensagensNaoLidas: naoLidas,
          };
        })
      );

      return NextResponse.json({ usuarios: usuariosComContagem });
    } else {
      // Secretária vê os médicos
      const medicos = await prisma.medico.findMany({
        where: {
          clinicaId: auth.clinicaId,
          ativo: true,
        },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          usuario: {
            nome: "asc",
          },
        },
      });

      // Contar mensagens não lidas por médico
      const medicosComContagem = await Promise.all(
        medicos.map(async (medico) => {
          const naoLidas = await prisma.mensagemMedicoSecretaria.count({
            where: {
              clinicaId: auth.clinicaId,
              medicoId: medico.id,
              secretariaId: auth.usuarioId,
              lida: false,
              enviadoPorMedico: true, // Mensagens enviadas pelo médico
            },
          });

          return {
            id: medico.usuario.id,
            nome: medico.usuario.nome,
            email: medico.usuario.email,
            avatar: medico.usuario.avatar,
            crm: medico.crm,
            especialidade: medico.especialidade,
            mensagensNaoLidas: naoLidas,
          };
        })
      );

      return NextResponse.json({ usuarios: medicosComContagem });
    }
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao listar usuários" },
      { status: 500 }
    );
  }
}
