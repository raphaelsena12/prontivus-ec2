import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface AgendamentoAlteracaoData {
  pacienteNome: string;
  medicoNome: string;
  dataHoraAnterior: Date;
  dataHoraNova: Date;
  tipoConsulta?: string;
  codigoTuss?: string;
  descricaoTuss?: string;
  observacoes?: string;
  clinicaNome?: string;
  motivoAlteracao?: string;
  baseUrl?: string;
}

/**
 * Formata a data e hora para exibição
 */
function formatarDataHora(dataHora: Date): string {
  const data = new Date(dataHora);
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const ano = data.getFullYear();
  const horas = data.getHours().toString().padStart(2, "0");
  const minutos = data.getMinutes().toString().padStart(2, "0");

  const diasSemana = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const diaSemana = diasSemana[data.getDay()];

  return `${diaSemana}, ${dia}/${mes}/${ano} às ${horas}:${minutos}`;
}

/**
 * Gera o HTML do email de alteração de agendamento
 */
export function gerarEmailAlteracaoAgendamento(
  data: AgendamentoAlteracaoData
): string {
  const dataHoraAnteriorFormatada = formatarDataHora(data.dataHoraAnterior);
  const dataHoraNovaFormatada = formatarDataHora(data.dataHoraNova);
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Agendamento Alterado - Prontivus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    ${gerarEstilosBase()}
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f7fa;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f5f7fa;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .email-header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 40px 40px 30px;
      text-align: center;
    }
    .header-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px;
    }
    .greeting {
      font-size: 18px;
      color: #1a1a1a;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .greeting strong {
      color: #1a1a1a;
      font-weight: 600;
    }
    .content-text {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .change-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 32px 0;
    }
    .date-box {
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .date-box.old {
      background-color: #fee2e2;
      border: 2px solid #fca5a5;
    }
    .date-box.new {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
    }
    .date-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .date-box.old .date-label {
      color: #991b1b;
    }
    .date-box.new .date-label {
      color: #92400e;
    }
    .date-value {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
    }
    .date-box.old .date-value {
      color: #7f1d1d;
      text-decoration: line-through;
    }
    .date-box.new .date-value {
      color: #78350f;
    }
    .highlight-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
      text-align: center;
    }
    .highlight-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #92400e;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .highlight-date {
      font-size: 24px;
      font-weight: 700;
      color: #78350f;
      line-height: 1.3;
    }
    .info-card {
      background-color: #f7fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #4a5568;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #1a1a1a;
      flex: 1;
      font-weight: 500;
    }
    .motivo-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .motivo-box strong {
      display: block;
      color: #1e40af;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .motivo-box p {
      color: #1e3a8a;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .observacoes-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .observacoes-box strong {
      display: block;
      color: #92400e;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .observacoes-box p {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .reminder-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .reminder-box p {
      color: #1e40af;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 32px 0;
    }
    ${gerarEstilosFooter()}
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      .email-header {
        padding: 30px 20px 20px;
      }
      .email-header h1 {
        font-size: 24px;
      }
      .email-body {
        padding: 30px 20px;
      }
      .change-comparison {
        grid-template-columns: 1fr;
      }
      .info-row {
        flex-direction: column;
        gap: 4px;
      }
      .info-label {
        min-width: auto;
      }
      .email-footer {
        padding: 24px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <img src="${logoUrl}" alt="Prontivus" class="logo" />
      </div>
      
      <!-- Body -->
      <div class="email-body">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Agendamento Alterado</h1>
        
        <p class="greeting">Olá, <strong>${data.pacienteNome}</strong>!</p>
        
        <p class="content-text">
          Informamos que seu agendamento foi alterado. Por favor, verifique os novos dados abaixo:
        </p>
        
        <div class="change-comparison">
          <div class="date-box old">
            <div class="date-label">Data Anterior</div>
            <div class="date-value">${dataHoraAnteriorFormatada}</div>
          </div>
          <div class="date-box new">
            <div class="date-label">Nova Data</div>
            <div class="date-value">${dataHoraNovaFormatada}</div>
          </div>
        </div>
        
        <div class="highlight-card">
          <div class="highlight-label">Nova Data e Horário</div>
          <div class="highlight-date">${dataHoraNovaFormatada}</div>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Médico:</span>
            <span class="info-value">${data.medicoNome}</span>
          </div>
          ${data.tipoConsulta ? `
          <div class="info-row">
            <span class="info-label">Tipo de Consulta:</span>
            <span class="info-value">${data.tipoConsulta}</span>
          </div>
          ` : ""}
          ${data.codigoTuss && data.descricaoTuss ? `
          <div class="info-row">
            <span class="info-label">Procedimento:</span>
            <span class="info-value">${data.descricaoTuss} (${data.codigoTuss})</span>
          </div>
          ` : ""}
          ${data.clinicaNome ? `
          <div class="info-row">
            <span class="info-label">Clínica:</span>
            <span class="info-value">${data.clinicaNome}</span>
          </div>
          ` : ""}
        </div>
        
        ${data.motivoAlteracao ? `
        <div class="motivo-box">
          <strong>Motivo da Alteração</strong>
          <p>${data.motivoAlteracao}</p>
        </div>
        ` : ""}
        
        ${data.observacoes ? `
        <div class="observacoes-box">
          <strong>Observações</strong>
          <p>${data.observacoes}</p>
        </div>
        ` : ""}
        
        <div class="reminder-box">
          <p>
            <strong>💡 Lembrete:</strong> Por favor, confirme se a nova data e hora são adequadas para você. 
            Em caso de necessidade de remarcação ou cancelamento, entre em contato conosco o quanto antes.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Estamos à disposição para ajudá-lo!
        </p>
      </div>
      
      ${gerarEmailFooter(baseUrl)}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Gera a versão em texto simples do email
 */
export function gerarEmailAlteracaoAgendamentoTexto(
  data: AgendamentoAlteracaoData
): string {
  const dataHoraAnteriorFormatada = formatarDataHora(data.dataHoraAnterior);
  const dataHoraNovaFormatada = formatarDataHora(data.dataHoraNova);

  return `
AGENDAMENTO ALTERADO - PRONTIVUS
=================================

Olá ${data.pacienteNome},

Informamos que seu agendamento foi alterado. Por favor, verifique os novos dados abaixo:

═══════════════════════════════════════
ALTERAÇÃO DE DATA
═══════════════════════════════════════
Data Anterior: ${dataHoraAnteriorFormatada}
Nova Data: ${dataHoraNovaFormatada}

═══════════════════════════════════════
DETALHES DO AGENDAMENTO
═══════════════════════════════════════
Médico: ${data.medicoNome}
${data.tipoConsulta ? `Tipo de Consulta: ${data.tipoConsulta}\n` : ""}
${data.codigoTuss && data.descricaoTuss ? `Procedimento: ${data.descricaoTuss} (${data.codigoTuss})\n` : ""}
${data.clinicaNome ? `Clínica: ${data.clinicaNome}\n` : ""}
${data.motivoAlteracao ? `\nMotivo da Alteração:\n${data.motivoAlteracao}\n` : ""}
${data.observacoes ? `\nObservações:\n${data.observacoes}\n` : ""}

💡 LEMBRETE: Por favor, confirme se a nova data e hora são adequadas para você. 
Em caso de necessidade de remarcação ou cancelamento, entre em contato conosco o quanto antes.

Estamos à disposição para ajudá-lo!

---
Este é um email automático. Por favor, não responda a esta mensagem.
${data.clinicaNome ? `${data.clinicaNome}\n` : ""}
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
