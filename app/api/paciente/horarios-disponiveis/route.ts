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

    // Parse da data
    const dataSelecionada = new Date(dataParam + "T00:00:00");
    const dataInicio = new Date(dataParam + "T08:00:00"); // Início do dia útil: 08:00
    const dataFim = new Date(dataParam + "T18:00:00"); // Fim do dia útil: 18:00

    // Buscar agendamentos existentes do médico neste dia
    const agendamentos = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: medicoId,
        dataHora: {
          gte: dataInicio,
          lt: new Date(dataParam + "T23:59:59"), // Até o final do dia
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
    const dataFimDia = new Date(dataParam + "T23:59:59");
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

    // Gerar horários disponíveis (de 30 em 30 minutos, das 8h às 18h)
    const horariosDisponiveis: string[] = [];
    const horariosOcupados = new Set<string>();

    // Marcar horários ocupados por agendamentos
    agendamentos.forEach((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const hora = dataHora.getHours();
      const minutos = dataHora.getMinutes();
      const chave = `${hora.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
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

        // Se o bloqueio começa antes do dia, começar às 8h
        if (dataInicioBloqueioStr < dataParam) {
          horaInicioFinal = 8;
          minutoInicioFinal = 0;
        }

        // Se o bloqueio termina depois do dia, terminar às 18h
        if (dataFimBloqueioStr > dataParam) {
          horaFimFinal = 18;
          minutoFimFinal = 0;
        }

        // Garantir que os horários estão dentro do intervalo válido (8h-18h)
        horaInicioFinal = Math.max(8, Math.min(18, horaInicioFinal));
        horaFimFinal = Math.max(8, Math.min(18, horaFimFinal));

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
          if (horaAtual >= 18) break;
        }
      }
    });

    // Gerar lista de horários disponíveis
    const agora = new Date();
    // Comparar apenas a data (sem hora) para determinar se é hoje
    const hojeLocal = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataSelecionadaLocal = new Date(dataParam + "T00:00:00");
    const eHoje = hojeLocal.getTime() === dataSelecionadaLocal.getTime();

    console.log(`[Horários Disponíveis] É hoje? ${eHoje}, Agora: ${agora.toISOString()}, Data selecionada: ${dataParam}`);

    for (let hora = 8; hora < 18; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const chave = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`;
        if (!horariosOcupados.has(chave)) {
          // Verificar se não é um horário passado (apenas se for hoje)
          if (eHoje) {
            const dataHoraHorario = new Date(dataParam + `T${chave}:00`);
            
            // Adicionar 10 minutos de margem para evitar problemas de timezone
            const margem = 10 * 60 * 1000; // 10 minutos em milissegundos
            if (dataHoraHorario.getTime() > agora.getTime() + margem) {
              horariosDisponiveis.push(chave);
            } else {
              console.log(`[Horários Disponíveis] Horário ${chave} ignorado (passado ou muito próximo)`);
            }
          } else {
            // Se não for hoje, adicionar todos os horários disponíveis
            horariosDisponiveis.push(chave);
          }
        } else {
          console.log(`[Horários Disponíveis] Horário ${chave} ocupado`);
        }
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
