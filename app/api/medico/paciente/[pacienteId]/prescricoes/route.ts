import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
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

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  const medicoId = await getUserMedicoId();
  if (!clinicaId || !medicoId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica ou médico não encontrado" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId, medicoId };
}

// GET /api/medico/paciente/[pacienteId]/prescricoes - Buscar prescrições do paciente
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

    // Buscar prescrições do paciente
    const prescricoesRaw = await prisma.prescricaoMedicamento.findMany({
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
      take: 20, // Limitar a 20 prescrições mais recentes
    });

    // Agrupar prescrições por consulta
    const prescricoesMap = new Map<string, any>();

    prescricoesRaw.forEach((presc) => {
      const consultaId = presc.consultaId;
      if (!prescricoesMap.has(consultaId)) {
        prescricoesMap.set(consultaId, {
          id: presc.id,
          dataPrescricao: presc.createdAt,
          medico: presc.consulta.medico,
          consulta: presc.consulta,
          medicamentos: [],
        });
      }
      const prescricao = prescricoesMap.get(consultaId);
      prescricao.medicamentos.push({
        id: presc.id,
        medicamento: presc.medicamento,
        dosagem: presc.quantidade ? `${presc.quantidade} unidade(s)` : null,
        posologia: presc.posologia,
      });
    });

    const prescricoes = Array.from(prescricoesMap.values());

    return NextResponse.json({ prescricoes }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar prescrições:", error);
    return NextResponse.json(
      { error: "Erro ao buscar prescrições" },
      { status: 500 }
    );
  }
}
