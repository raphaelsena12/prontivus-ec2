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
        { error: "Acesso negado. Apenas médicos e secretárias podem acessar esta rota." },
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

  let medicoId: string | null = null;
  if (isMedico) {
    const medico = await prisma.medico.findFirst({
      where: {
        usuarioId: session.user.id,
        clinicaId: clinicaId,
      },
    });

    if (!medico) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Médico não encontrado" },
          { status: 404 }
        ),
      };
    }
    medicoId = medico.id;
  }

  return {
    authorized: true,
    clinicaId,
    usuarioId: session.user.id,
    usuarioTipo: session.user.tipo,
    medicoId,
  };
}

// GET /api/chat/mensagens - Buscar mensagens
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    // Desabilitar cache para garantir dados sempre atualizados
    const responseHeaders = new Headers();
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor");

    const where: any = {
      clinicaId: auth.clinicaId,
    };

    if (auth.usuarioTipo === TipoUsuario.MEDICO) {
      where.medicoId = auth.medicoId;
    } else {
      where.secretariaId = auth.usuarioId;
    }

    if (cursor) {
      where.createdAt = {
        lt: new Date(cursor),
      };
    }

    const mensagens = await prisma.mensagemMedicoSecretaria.findMany({
      where,
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                avatar: true,
              },
            },
          },
        },
        secretaria: {
          select: {
            id: true,
            nome: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Inverter para ordem cronológica (mais antiga primeiro)
    const mensagensOrdenadas = mensagens.reverse();

    return NextResponse.json({
      mensagens: mensagensOrdenadas,
      hasMore: mensagens.length === limit,
      nextCursor: mensagens.length > 0 ? mensagens[0].createdAt.toISOString() : null,
    }, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar mensagens" },
      { status: 500 }
    );
  }
}

// POST /api/chat/mensagens - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { conteudo, outroUsuarioId } = body;

    if (!conteudo || !conteudo.trim()) {
      return NextResponse.json(
        { error: "Conteúdo da mensagem é obrigatório" },
        { status: 400 }
      );
    }

    let medicoId: string;
    let secretariaId: string;
    let enviadoPorMedico: boolean;

    if (auth.usuarioTipo === TipoUsuario.MEDICO) {
      if (!auth.medicoId) {
        return NextResponse.json(
          { error: "Médico não encontrado" },
          { status: 404 }
        );
      }
      medicoId = auth.medicoId;
      secretariaId = outroUsuarioId;
      enviadoPorMedico = true;

      // Verificar se a secretária existe e pertence à mesma clínica
      const secretaria = await prisma.usuario.findFirst({
        where: {
          id: secretariaId,
          tipo: TipoUsuario.SECRETARIA,
          clinicaId: auth.clinicaId,
        },
      });

      if (!secretaria) {
        return NextResponse.json(
          { error: "Secretária não encontrada" },
          { status: 404 }
        );
      }
    } else {
      // Secretária enviando
      if (!outroUsuarioId) {
        return NextResponse.json(
          { error: "ID do médico é obrigatório" },
          { status: 400 }
        );
      }

      // Buscar médico pelo usuarioId
      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: outroUsuarioId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!medico) {
        return NextResponse.json(
          { error: "Médico não encontrado" },
          { status: 404 }
        );
      }

      medicoId = medico.id;
      if (!auth.usuarioId) {
        return NextResponse.json(
          { error: "ID do usuário não encontrado" },
          { status: 403 }
        );
      }
      secretariaId = auth.usuarioId;
      enviadoPorMedico = false;
    }

    const mensagem = await prisma.mensagemMedicoSecretaria.create({
      data: {
        clinicaId: auth.clinicaId,
        medicoId,
        secretariaId,
        conteudo: conteudo.trim(),
        enviadoPorMedico,
        lida: false,
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                avatar: true,
              },
            },
          },
        },
        secretaria: {
          select: {
            id: true,
            nome: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ mensagem }, { status: 201 });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
