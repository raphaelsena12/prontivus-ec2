/**
 * Templates de mensagens WhatsApp para agendamentos
 */

/**
 * Gera mensagem de confirmação de agendamento
 */
export function gerarMensagemConfirmacaoAgendamento(
  pacienteNome: string,
  dataHora: Date,
  medicoNome?: string,
  clinicaNome?: string
): string {
  const dataFormatada = dataHora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let mensagem = `✅ *Confirmação de Agendamento*\n\n`;
  mensagem += `Olá ${pacienteNome}!\n\n`;
  mensagem += `Sua consulta foi *confirmada*:\n\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n`;
  mensagem += `🕐 *Horário:* ${horaFormatada}\n`;

  if (medicoNome) {
    mensagem += `👨‍⚕️ *Médico:* ${medicoNome}\n`;
  }

  if (clinicaNome) {
    mensagem += `🏥 *Clínica:* ${clinicaNome}\n`;
  }

  mensagem += `\n⚠️ *Importante:*\n`;
  mensagem += `• Chegue com 15 minutos de antecedência\n`;
  mensagem += `• Traga documentos e exames anteriores\n`;
  mensagem += `• Em caso de cancelamento, avise com antecedência\n\n`;
  mensagem += `Qualquer dúvida, estamos à disposição!\n\n`;
  mensagem += `_Esta é uma mensagem automática. Por favor, não responda._`;

  return mensagem;
}

/**
 * Gera mensagem de alteração de agendamento
 */
export function gerarMensagemAlteracaoAgendamento(
  pacienteNome: string,
  dataHoraAntiga: Date,
  dataHoraNova: Date,
  medicoNome?: string
): string {
  const dataAntigaFormatada = dataHoraAntiga.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaAntigaFormatada = dataHoraAntiga.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dataNovaFormatada = dataHoraNova.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaNovaFormatada = dataHoraNova.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let mensagem = `🔄 *Alteração de Agendamento*\n\n`;
  mensagem += `Olá ${pacienteNome}!\n\n`;
  mensagem += `Sua consulta foi *alterada*:\n\n`;
  mensagem += `❌ *Data Anterior:*\n`;
  mensagem += `${dataAntigaFormatada} às ${horaAntigaFormatada}\n\n`;
  mensagem += `✅ *Nova Data:*\n`;
  mensagem += `${dataNovaFormatada} às ${horaNovaFormatada}\n`;

  if (medicoNome) {
    mensagem += `\n👨‍⚕️ *Médico:* ${medicoNome}\n`;
  }

  mensagem += `\nPor favor, confirme se o novo horário está adequado.\n\n`;
  mensagem += `_Esta é uma mensagem automática. Por favor, não responda._`;

  return mensagem;
}

/**
 * Gera mensagem de cancelamento de agendamento
 */
export function gerarMensagemCancelamentoAgendamento(
  pacienteNome: string,
  dataHora: Date,
  motivo?: string
): string {
  const dataFormatada = dataHora.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let mensagem = `❌ *Cancelamento de Agendamento*\n\n`;
  mensagem += `Olá ${pacienteNome}!\n\n`;
  mensagem += `Sua consulta foi *cancelada*:\n\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n`;
  mensagem += `🕐 *Horário:* ${horaFormatada}\n`;

  if (motivo) {
    mensagem += `\n📝 *Motivo:* ${motivo}\n`;
  }

  mensagem += `\nPara reagendar, entre em contato conosco.\n\n`;
  mensagem += `_Esta é uma mensagem automática. Por favor, não responda._`;

  return mensagem;
}

/**
 * Gera mensagem de lembrete de consulta
 */
export function gerarMensagemLembreteConsulta(
  pacienteNome: string,
  dataHora: Date,
  medicoNome?: string
): string {
  const dataFormatada = dataHora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let mensagem = `⏰ *Lembrete de Consulta*\n\n`;
  mensagem += `Olá ${pacienteNome}!\n\n`;
  mensagem += `Este é um lembrete: você tem uma consulta agendada:\n\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n`;
  mensagem += `🕐 *Horário:* ${horaFormatada}\n`;

  if (medicoNome) {
    mensagem += `👨‍⚕️ *Médico:* ${medicoNome}\n`;
  }

  mensagem += `\n⚠️ *Lembre-se:*\n`;
  mensagem += `• Chegue com 15 minutos de antecedência\n`;
  mensagem += `• Traga documentos e exames anteriores\n\n`;
  mensagem += `Nos vemos em breve!\n\n`;
  mensagem += `_Esta é uma mensagem automática. Por favor, não responda._`;

  return mensagem;
}
