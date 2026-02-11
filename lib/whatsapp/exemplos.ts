/**
 * Exemplos de uso do módulo WhatsApp
 * 
 * Este arquivo contém exemplos práticos de como usar
 * o módulo de integração com WhatsApp no Prontivus.
 */

import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  gerarMensagemConfirmacaoAgendamento,
  gerarMensagemAlteracaoAgendamento,
  gerarMensagemCancelamentoAgendamento,
  gerarMensagemLembreteConsulta,
} from "./index";

// ============================================
// EXEMPLO 1: Enviar Confirmação de Agendamento
// ============================================

export async function exemploEnviarConfirmacaoAgendamento(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHora: Date,
  medicoNome: string,
  clinicaNome: string
) {
  const mensagem = gerarMensagemConfirmacaoAgendamento(
    pacienteNome,
    dataHora,
    medicoNome,
    clinicaNome
  );

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}

// ============================================
// EXEMPLO 2: Enviar Lembrete de Consulta
// ============================================

export async function exemploEnviarLembreteConsulta(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHora: Date,
  medicoNome: string
) {
  const mensagem = gerarMensagemLembreteConsulta(
    pacienteNome,
    dataHora,
    medicoNome
  );

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}

// ============================================
// EXEMPLO 3: Enviar Alteração de Agendamento
// ============================================

export async function exemploEnviarAlteracaoAgendamento(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHoraAntiga: Date,
  dataHoraNova: Date,
  medicoNome: string
) {
  const mensagem = gerarMensagemAlteracaoAgendamento(
    pacienteNome,
    dataHoraAntiga,
    dataHoraNova,
    medicoNome
  );

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}

// ============================================
// EXEMPLO 4: Enviar Cancelamento
// ============================================

export async function exemploEnviarCancelamento(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHora: Date,
  motivo?: string
) {
  const mensagem = gerarMensagemCancelamentoAgendamento(
    pacienteNome,
    dataHora,
    motivo
  );

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}

// ============================================
// EXEMPLO 5: Enviar Mensagem Personalizada
// ============================================

export async function exemploEnviarMensagemPersonalizada(
  pacienteTelefone: string,
  conteudo: string
) {
  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: conteudo,
  });
}

// ============================================
// EXEMPLO 6: Enviar Template (Fora da Janela de 24h)
// ============================================

export async function exemploEnviarTemplate(
  pacienteTelefone: string,
  templateId: string,
  parametros: string[]
) {
  await sendWhatsAppTemplate({
    to: pacienteTelefone,
    message: "", // Não usado em templates, mas requerido pela interface
    templateId,
    templateParams: parametros,
  });
}

// ============================================
// EXEMPLO 7: Integração com Agendamento (API Route)
// ============================================

/*
// Em app/api/secretaria/agendamentos/route.ts

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { gerarMensagemConfirmacaoAgendamento } from "@/lib/whatsapp/templates/agendamento-confirmacao";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { pacienteId, medicoId, dataHora, clinicaId } = await request.json();

  // Criar agendamento
  const agendamento = await prisma.consulta.create({
    data: {
      pacienteId,
      medicoId,
      clinicaId,
      dataHora: new Date(dataHora),
      status: "AGENDADA",
    },
    include: {
      paciente: true,
      medico: {
        include: {
          usuario: true,
        },
      },
      clinica: true,
    },
  });

  // Enviar WhatsApp se o paciente tiver telefone
  if (agendamento.paciente.telefone) {
    try {
      const mensagem = gerarMensagemConfirmacaoAgendamento(
        agendamento.paciente.nome,
        agendamento.dataHora,
        agendamento.medico.usuario.nome,
        agendamento.clinica.nome
      );

      await sendWhatsAppMessage({
        to: agendamento.paciente.telefone,
        message: mensagem,
      });
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
      // Não falhar o agendamento se o WhatsApp falhar
    }
  }

  return Response.json({ success: true, agendamento });
}
*/

// ============================================
// EXEMPLO 8: Enviar Lembrete em Lote (Cron Job)
// ============================================

/*
// Em scripts/enviar-lembretes-whatsapp.ts

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { gerarMensagemLembreteConsulta } from "@/lib/whatsapp/templates/agendamento-confirmacao";
import { prisma } from "@/lib/prisma";

export async function enviarLembretesConsultas() {
  // Buscar consultas agendadas para amanhã
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(23, 59, 59, 999);

  const consultas = await prisma.consulta.findMany({
    where: {
      status: "AGENDADA",
      dataHora: {
        gte: amanha,
        lte: fimAmanha,
      },
    },
    include: {
      paciente: true,
      medico: {
        include: {
          usuario: true,
        },
      },
    },
  });

  for (const consulta of consultas) {
    if (consulta.paciente.telefone) {
      try {
        const mensagem = gerarMensagemLembreteConsulta(
          consulta.paciente.nome,
          consulta.dataHora,
          consulta.medico.usuario.nome
        );

        await sendWhatsAppMessage({
          to: consulta.paciente.telefone,
          message: mensagem,
        });

        console.log(`✅ Lembrete enviado para ${consulta.paciente.nome}`);
      } catch (error) {
        console.error(
          `❌ Erro ao enviar lembrete para ${consulta.paciente.nome}:`,
          error
        );
      }
    }
  }
}
*/
