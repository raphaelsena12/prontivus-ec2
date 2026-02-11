import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface AgendamentoConfirmacaoData {
  pacienteNome: string;
  medicoNome: string;
  dataHora: Date;
  tipoConsulta?: string;
  codigoTuss?: string;
  descricaoTuss?: string;
  observacoes?: string;
  clinicaNome?: string;
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
 * Gera o HTML do email de confirmação de agendamento
 */
export function gerarEmailConfirmacaoAgendamento(
  data: AgendamentoConfirmacaoData
): string {
  const dataHoraFormatada = formatarDataHora(data.dataHora);
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Agendamento Confirmado - Prontivus</title>
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
    .logo {
      max-width: 180px;
      height: auto;
      margin: 0 auto 30px;
      display: block;
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
    .highlight-card {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
      text-align: center;
    }
    .highlight-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #059669;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .highlight-date {
      font-size: 24px;
      font-weight: 700;
      color: #065f46;
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
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Agendamento Confirmado</h1>
        
        <p class="greeting">Olá, <strong>${data.pacienteNome}</strong>!</p>
        
        <p class="content-text">
          Seu agendamento foi confirmado com sucesso. Anote os detalhes abaixo:
        </p>
        
        <div class="highlight-card">
          <div class="highlight-label">Data e Horário</div>
          <div class="highlight-date">${dataHoraFormatada}</div>
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
        
        ${data.observacoes ? `
        <div class="observacoes-box">
          <strong>Observações</strong>
          <p>${data.observacoes}</p>
        </div>
        ` : ""}
        
        <div class="reminder-box">
          <p>
            <strong>💡 Lembrete:</strong> Por favor, chegue com alguns minutos de antecedência. 
            Em caso de necessidade de remarcação ou cancelamento, entre em contato conosco o quanto antes.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Estamos ansiosos para atendê-lo!
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
export function gerarEmailConfirmacaoAgendamentoTexto(
  data: AgendamentoConfirmacaoData
): string {
  const dataHoraFormatada = formatarDataHora(data.dataHora);

  return `
AGENDAMENTO CONFIRMADO - PRONTIVUS
===================================

Olá ${data.pacienteNome},

Seu agendamento foi confirmado com sucesso!

═══════════════════════════════════════
DATA E HORÁRIO
═══════════════════════════════════════
${dataHoraFormatada}

═══════════════════════════════════════
DETALHES DO AGENDAMENTO
═══════════════════════════════════════
Médico: ${data.medicoNome}
${data.tipoConsulta ? `Tipo de Consulta: ${data.tipoConsulta}\n` : ""}
${data.codigoTuss && data.descricaoTuss ? `Procedimento: ${data.descricaoTuss} (${data.codigoTuss})\n` : ""}
${data.clinicaNome ? `Clínica: ${data.clinicaNome}\n` : ""}
${data.observacoes ? `\nObservações:\n${data.observacoes}\n` : ""}

💡 LEMBRETE: Por favor, chegue com alguns minutos de antecedência. 
Em caso de necessidade de remarcação ou cancelamento, entre em contato conosco o quanto antes.

Estamos ansiosos para atendê-lo!

---
Este é um email automático. Por favor, não responda a esta mensagem.
${data.clinicaNome ? `${data.clinicaNome}\n` : ""}
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
