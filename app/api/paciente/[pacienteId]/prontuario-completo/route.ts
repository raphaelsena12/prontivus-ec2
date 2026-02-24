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

  // Permitir acesso para médico, secretaria e admin-clinica
  const userTipo = session.user.tipo;
  const isAllowed = 
    userTipo === TipoUsuario.MEDICO ||
    userTipo === TipoUsuario.SECRETARIA ||
    userTipo === TipoUsuario.ADMIN_CLINICA;

  if (!isAllowed) {
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

  return { authorized: true, clinicaId };
}

// GET /api/paciente/[pacienteId]/prontuario-completo - Buscar prontuário completo do paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { pacienteId } = await params;

    // Verificar se o paciente pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar todos os dados do paciente em paralelo
    const [
      planosSaude,
      consultas,
      prontuarios,
      solicitacoesExames,
      prescricoes,
      pagamentos,
      documentos,
      mensagens,
    ] = await Promise.all([
      // Planos de saúde
      prisma.pacientePlano.findMany({
        where: {
          pacienteId,
        },
        include: {
          planoSaude: {
            include: {
              operadora: {
                select: {
                  nomeFantasia: true,
                  razaoSocial: true,
                },
              },
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      }),

      // Consultas
      prisma.consulta.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          tipoConsulta: {
            select: {
              nome: true,
            },
          },
          codigoTuss: {
            select: {
              codigoTuss: true,
              descricao: true,
            },
          },
          operadora: {
            select: {
              nomeFantasia: true,
            },
          },
          planoSaude: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          dataHora: "desc",
        },
      }),

      // Prontuários
      prisma.prontuario.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
              tipoConsulta: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Solicitações de exames
      prisma.solicitacaoExame.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        include: {
          exame: {
            select: {
              nome: true,
              tipo: true,
              descricao: true,
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
              medico: {
                include: {
                  usuario: {
                    select: {
                      nome: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataSolicitacao: "desc",
        },
      }),

      // Prescrições de medicamentos
      prisma.prescricaoMedicamento.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        include: {
          medicamento: {
            select: {
              nome: true,
              principioAtivo: true,
              laboratorio: true,
              apresentacao: true,
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
              medico: {
                include: {
                  usuario: {
                    select: {
                      nome: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Pagamentos
      prisma.pagamentoConsulta.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Documentos gerados
      prisma.documentoGerado.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        include: {
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Mensagens
      prisma.mensagem.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json(
      {
        paciente,
        planosSaude,
        consultas,
        prontuarios,
        solicitacoesExames,
        prescricoes,
        pagamentos,
        documentos,
        mensagens,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao buscar prontuário completo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar prontuário completo" },
      { status: 500 }
    );
  }
}
