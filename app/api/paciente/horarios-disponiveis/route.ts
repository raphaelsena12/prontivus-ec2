import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { brazilDayStart, brazilDayEnd, brazilDateTime, brazilToday, getBrazilHourMinute } from "@/lib/timezone-utils";
import { obterFaixasAgendaMedicoParaData } from "@/lib/medico-escala";

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

  return { authorized: true, clinicaId };
}

// GET /api/paciente/horarios-disponiveis?medicoId=xxx&data=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");
    const dataParam = searchParams.get("data");

    if (!medicoId) {
      return NextResponse.json(
        { error: "medicoId é obrigatório" },
        { status: 400 }
      );
    }

    if (!dataParam) {
      return NextResponse.json(
        { error: "data é obrigatória (formato: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Verificar se médico pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: medicoId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Parse da data com fuso Brasil
    const dataSelecionada = brazilDayStart(dataParam);
    const dataInicio = brazilDayStart(dataParam);

    // Buscar agendamentos existentes do médico neste dia
    const agendamentos = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: medicoId,
        dataHora: {
          gte: dataInicio,
          lt: brazilDayEnd(dataParam),
        },
        status: {
          notIn: ["CANCELADA", "CANCELADO"],
        },
      },
      select: {
        dataHora: true,
      },
    });

    console.log(`[Horários Disponíveis] Data: ${dataParam}, Médico: ${medicoId}`);
    console.log(`[Horários Disponíveis] Agendamentos encontrados: ${agendamentos.length}`);
    agendamentos.forEach((ag) => {
      console.log(`  - ${ag.dataHora}`);
    });

    // Buscar bloqueios de agenda que afetam o dia selecionado
    const dataFimDia = brazilDayEnd(dataParam);
    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: medicoId,
        dataInicio: {
          lte: dataFimDia,
        },
        dataFim: {
          gte: dataSelecionada,
        },
      },
    });

    console.log(`[Horários Disponíveis] Bloqueios encontrados: ${bloqueios.length}`);

    // Gerar horários disponíveis de acordo com a escala do médico
    const faixasAgenda = await obterFaixasAgendaMedicoParaData(auth.clinicaId!, medicoId, dataSelecionada);
    if (faixasAgenda.length === 0) {
      return NextResponse.json({ horarios: [], data: dataParam, medicoId });
    }

    const horariosDisponiveis: string[] = [];
    const horariosOcupados = new Set<string>();

    // Marcar horários ocupados por agendamentos (convertido para fuso Brasil)
    agendamentos.forEach((agendamento) => {
      const { hours, minutes } = getBrazilHourMinute(new Date(agendamento.dataHora));
      const chave = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      horariosOcupados.add(chave);
    });

    // Marcar horários bloqueados
    bloqueios.forEach((bloqueio) => {
      const dataInicioBloqueio = new Date(bloqueio.dataInicio);
      const dataFimBloqueio = new Date(bloqueio.dataFim);
      const dataInicioBloqueioStr = dataInicioBloqueio.toISOString().split("T")[0];
      const dataFimBloqueioStr = dataFimBloqueio.toISOString().split("T")[0];
      
      // Verificar se o bloqueio afeta o dia selecionado
      const afetaDia = 
        dataInicioBloqueioStr === dataParam ||
        dataFimBloqueioStr === dataParam ||
        (dataInicioBloqueio <= dataSelecionada && dataFimBloqueio >= dataSelecionada) ||
        (dataInicioBloqueio <= dataFimDia && dataFimBloqueio >= dataSelecionada);

      if (afetaDia) {
        const [horaInicioStr, minutoInicioStr] = bloqueio.horaInicio.split(":");
        const horaInicio = parseInt(horaInicioStr, 10);
        const minutoInicio = parseInt(minutoInicioStr, 10);
        
        const [horaFimStr, minutoFimStr] = bloqueio.horaFim.split(":");
        const horaFim = parseInt(horaFimStr, 10);
        const minutoFim = parseInt(minutoFimStr, 10);

        // Determinar horários de início e fim considerando o dia selecionado
        let horaInicioFinal = horaInicio;
        let minutoInicioFinal = minutoInicio;
        let horaFimFinal = horaFim;
        let minutoFimFinal = minutoFim;

        // Se o bloqueio começa antes do dia, começar no início da agenda regular
        if (dataInicioBloqueioStr < dataParam) {
          horaInicioFinal = 0;
          minutoInicioFinal = 0;
        }

        // Se o bloqueio termina depois do dia, terminar no fim do dia
        if (dataFimBloqueioStr > dataParam) {
          horaFimFinal = 23;
          minutoFimFinal = 0;
        }

        // Marcar todos os horários dentro do bloqueio
        let horaAtual = horaInicioFinal;
        let minutoAtual = minutoInicioFinal;
        
        while (
          horaAtual < horaFimFinal ||
          (horaAtual === horaFimFinal && minutoAtual < minutoFimFinal)
        ) {
          const chave = `${horaAtual.toString().padStart(2, "0")}:${minutoAtual.toString().padStart(2, "0")}`;
          horariosOcupados.add(chave);
          
          minutoAtual += 30;
          if (minutoAtual >= 60) {
            minutoAtual = 0;
            horaAtual++;
          }
          
          // Proteção contra loop infinito
          if (horaAtual >= 23) break;
        }
      }
    });

    // Gerar lista de horários disponíveis
    const agora = new Date();
    // Comparar data no fuso Brasil
    const eHoje = brazilToday() === dataParam;

    console.log(`[Horários Disponíveis] É hoje? ${eHoje}, Agora: ${agora.toISOString()}, Data selecionada: ${dataParam}`);

    for (const faixa of faixasAgenda) {
      const [iniH, iniM] = faixa.horaInicio.split(":").map(Number);
      const [fimH, fimM] = faixa.horaFim.split(":").map(Number);
      let minutos = iniH * 60 + iniM;
      const limite = fimH * 60 + fimM;

      while (minutos < limite) {
        const hora = Math.floor(minutos / 60);
        const minuto = minutos % 60;
        const chave = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`;
        if (!horariosOcupados.has(chave)) {
          if (eHoje) {
            const dataHoraHorario = brazilDateTime(dataParam, chave);
            const margem = 10 * 60 * 1000;
            if (dataHoraHorario.getTime() > agora.getTime() + margem) {
              horariosDisponiveis.push(chave);
            }
          } else {
            horariosDisponiveis.push(chave);
          }
        }

        minutos += 10;
      }
    }

    console.log(`[Horários Disponíveis] Horários ocupados: ${Array.from(horariosOcupados).join(", ")}`);
    console.log(`[Horários Disponíveis] Horários disponíveis: ${horariosDisponiveis.length} - ${horariosDisponiveis.join(", ")}`);

    return NextResponse.json({
      horarios: horariosDisponiveis,
      data: dataParam,
      medicoId: medicoId,
    });
  } catch (error) {
    console.error("Erro ao buscar horários disponíveis:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários disponíveis" },
      { status: 500 }
    );
  }
}
