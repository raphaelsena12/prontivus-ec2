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

// PATCH /api/chat/mensagens/[id]/lida - Marcar mensagem como lida
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    // Resolver params se for uma Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const mensagemId = resolvedParams.id;

    if (!mensagemId || typeof mensagemId !== 'string') {
      return NextResponse.json(
        { error: "ID da mensagem inválido" },
        { status: 400 }
      );
    }

    // Verificar se a mensagem existe e pertence à mesma clínica
    let mensagem;
    try {
      mensagem = await prisma.mensagemMedicoSecretaria.findUnique({
        where: { id: mensagemId },
      });
    } catch (dbError: any) {
      console.error("Erro ao buscar mensagem:", dbError);
      return NextResponse.json(
        { 
          error: "Erro ao buscar mensagem",
          details: dbError.message || "Erro desconhecido"
        },
        { status: 500 }
      );
    }

    if (!mensagem) {
      return NextResponse.json(
        { error: "Mensagem não encontrada" },
        { status: 404 }
      );
    }

    if (mensagem.clinicaId !== auth.clinicaId) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Verificar se o usuário pode marcar esta mensagem como lida
    // (apenas se não foi ele quem enviou)
    const podeMarcarComoLida =
      (auth.usuarioTipo === TipoUsuario.MEDICO && !mensagem.enviadoPorMedico) ||
      (auth.usuarioTipo === TipoUsuario.SECRETARIA && mensagem.enviadoPorMedico);

    if (!podeMarcarComoLida) {
      // Se a mensagem já foi enviada por este usuário, não precisa marcar como lida
      // Retornar sucesso silenciosamente
      return NextResponse.json({ 
        mensagem: mensagem,
        message: "Mensagem própria, não precisa marcar como lida"
      });
    }

    // Se já está marcada como lida, retornar sucesso
    if (mensagem.lida) {
      return NextResponse.json({ 
        mensagem: mensagem,
        message: "Mensagem já estava marcada como lida"
      });
    }

    try {
      const mensagemAtualizada = await prisma.mensagemMedicoSecretaria.update({
        where: { id: mensagemId },
        data: {
          lida: true,
          dataLeitura: new Date(),
        },
      });

      return NextResponse.json({ mensagem: mensagemAtualizada });
    } catch (dbError: any) {
      console.error("Erro no banco de dados ao marcar mensagem como lida:", dbError);
      
      // Se o erro for porque a mensagem não existe mais ou já foi atualizada, retornar sucesso
      if (dbError.code === 'P2025' || dbError.meta?.cause === 'Record to update not found.') {
        return NextResponse.json({ 
          mensagem: mensagem,
          message: "Mensagem não encontrada ou já atualizada"
        });
      }
      
      throw dbError;
    }
  } catch (error: any) {
    console.error("Erro ao marcar mensagem como lida:", error);
    console.error("Detalhes do erro:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    
    return NextResponse.json(
      { 
        error: "Erro ao marcar mensagem como lida",
        details: error.message || "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
