import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.PACIENTE) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas pacientes podem acessar." },
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
        { status: 404 }
      ),
    };
  }

  // Buscar o paciente pelo usuarioId
  const paciente = await prisma.paciente.findFirst({
    where: {
      clinicaId: clinicaId,
      usuarioId: session.user.id,
    },
    select: { id: true },
  });

  if (!paciente) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { authorized: true, clinicaId, pacienteId: paciente.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Buscar todas as consultas do paciente
    const consultas = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        pacienteId: auth.pacienteId,
      },
      select: {
        id: true,
      },
    });

    const consultaIds = consultas.map((c) => c.id);

    // Buscar prescrições das consultas do paciente
    const where: any = {
      clinicaId: auth.clinicaId,
      consultaId: { in: consultaIds },
      ...(search && {
        OR: [
          { consulta: { medico: { usuario: { nome: { contains: search, mode: "insensitive" as const } } } } },
          { medicamento: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const prescricoesRaw = await prisma.prescricaoMedicamento.findMany({
      where,
      include: {
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
          },
          select: {
            id: true,
            dataHora: true,
          },
        },
        medicamento: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Agrupar prescrições por consulta para criar o formato esperado
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

    return NextResponse.json({
      prescricoes,
    });
  } catch (error) {
    console.error("Erro ao listar prescrições:", error);
    return NextResponse.json(
      { error: "Erro ao listar prescrições" },
      { status: 500 }
    );
  }
}
