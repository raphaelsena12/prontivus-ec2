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

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
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

// GET /api/secretaria/fechamento-caixa/resumo-financeiro - Gerar resumo financeiro do dia
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { clinicaId } = auth;
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");
    const medicoId = searchParams.get("medicoId");

    if (!dataParam) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    // Converter data para início e fim do dia
    const data = new Date(dataParam);
    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    // Buscar consultas do dia
    const whereConsulta: any = {
      clinicaId,
      dataHora: {
        gte: inicioDia,
        lte: fimDia,
      },
      ...(medicoId && { medicoId }),
    };

    const consultas = await prisma.consulta.findMany({
      where: whereConsulta,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
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
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
        operadora: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
        planoSaude: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: {
        dataHora: "asc",
      },
    });

    // Buscar pagamentos do dia (incluindo os que não estão vinculados a consultas)
    const pagamentos = await prisma.pagamentoConsulta.findMany({
      where: {
        clinicaId,
        dataPagamento: {
          gte: inicioDia,
          lte: fimDia,
        },
        status: "PAGO",
        ...(medicoId && {
          consulta: {
            medicoId,
          },
        }),
      },
      include: {
        paciente: {
          select: {
            nome: true,
          },
        },
        consulta: {
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
            operadora: {
              select: {
                nomeFantasia: true,
                razaoSocial: true,
              },
            },
            planoSaude: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataPagamento: "asc",
      },
    });

    // Agrupar por forma de pagamento
    const totalPorFormaPagamento: Record<string, number> = {};
    const totalPorConvenio: Record<string, number> = {};
    let totalGeral = 0;
    let totalParticular = 0;
    let totalPlano = 0;

    pagamentos.forEach((pagamento) => {
      const formaPagamento = pagamento.metodoPagamento || "NÃO_INFORMADO";
      const valor = Number(pagamento.valor);

      totalPorFormaPagamento[formaPagamento] = (totalPorFormaPagamento[formaPagamento] || 0) + valor;
      totalGeral += valor;

      // Agrupar por convênio
      if (pagamento.consulta) {
        const convenio = pagamento.consulta.operadora
          ? pagamento.consulta.operadora.nomeFantasia || pagamento.consulta.operadora.razaoSocial
          : "Particular";

        totalPorConvenio[convenio] = (totalPorConvenio[convenio] || 0) + valor;

        if (convenio === "Particular") {
          totalParticular += valor;
        } else {
          totalPlano += valor;
        }
      } else {
        totalParticular += valor;
      }
    });

    // Buscar informações da clínica
    const clinica = await prisma.tenant.findUnique({
      where: {
        id: clinicaId,
      },
      select: {
        nome: true,
        cnpj: true,
        endereco: true,
        cidade: true,
        estado: true,
      },
    });

    // Buscar autorização de fechamento (buscar a primeira autorização do dia se não houver medicoId)
    let autorizacao = null;
    if (medicoId) {
      autorizacao = await prisma.autorizacaoFechamentoCaixa.findUnique({
        where: {
          clinicaId_medicoId_data: {
            clinicaId: clinicaId,
            medicoId: medicoId,
            data: inicioDia,
          },
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
      });
    } else {
      // Buscar primeira autorização do dia
      autorizacao = await prisma.autorizacaoFechamentoCaixa.findFirst({
        where: {
          clinicaId,
          data: inicioDia,
          status: {
            in: ["AUTORIZADO", "FECHADO"],
          },
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
      });
    }

    return NextResponse.json({
      data: dataParam,
      clinica,
      consultas,
      pagamentos,
      totalPorFormaPagamento,
      totalPorConvenio,
      totalGeral,
      totalParticular,
      totalPlano,
      autorizacao,
    });
  } catch (error: any) {
    console.error("Erro ao gerar resumo financeiro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar resumo financeiro" },
      { status: 500 }
    );
  }
}
