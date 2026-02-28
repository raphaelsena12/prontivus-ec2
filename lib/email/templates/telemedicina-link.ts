import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface TelemedicinaLinkData {
  pacienteNome: string;
  medicoNome: string;
  especialidade?: string;
  dataHora: Date;
  clinicaNome?: string;
  accessLink: string;
  baseUrl?: string;
}

function formatarDataHora(dataHora: Date): string {
  const data = new Date(dataHora);
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const ano = data.getFullYear();
  const horas = data.getHours().toString().padStart(2, "0");
  const minutos = data.getMinutes().toString().padStart(2, "0");
  const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return `${diasSemana[data.getDay()]}, ${dia}/${mes}/${ano} às ${horas}:${minutos}`;
}

export function gerarEmailTelemedicinalink(data: TelemedicinaLinkData): string {
  const dataHoraFormatada = formatarDataHora(data.dataHora);
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sua Consulta Online - Prontivus</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${gerarEstilosBase()}
    ${gerarEstilosFooter()}
    .tele-hero {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 12px 12px 0 0;
      padding: 32px 40px;
      text-align: center;
      color: #ffffff;
    }
    .tele-hero h1 { font-size: 22px; font-weight: 700; margin: 12px 0 4px; }
    .tele-hero p { font-size: 14px; opacity: 0.85; margin: 0; }
    .tele-body { background: #ffffff; padding: 32px 40px; }
    .tele-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .tele-card-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; }
    .tele-card-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; min-width: 90px; padding-top: 2px; }
    .tele-card-value { font-size: 14px; color: #1e293b; font-weight: 500; }
    .tele-btn {
      display: block;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #ffffff !important;
      text-decoration: none;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 10px;
      margin: 24px 0;
    }
    .tele-steps {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .tele-steps h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 14px; }
    .tele-step { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    .tele-step-num {
      background: #1e40af;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .tele-step-text { font-size: 13px; color: #475569; }
    .tele-warning {
      background: #fff7ed;
      border-left: 4px solid #f97316;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 12px;
      color: #92400e;
      margin-bottom: 24px;
    }
    .tele-link-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11px;
      color: #475569;
      word-break: break-all;
      font-family: monospace;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
          <!-- Logo -->
          <tr>
            <td style="background:#ffffff;padding:20px 40px;border-bottom:1px solid #e2e8f0;text-align:center;">
              <img src="${logoUrl}" alt="Prontivus" style="height:36px;" />
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td>
              <div class="tele-hero">
                <div style="font-size:40px;margin-bottom:4px;">🎥</div>
                <h1>Sua Consulta Online está Pronta</h1>
                <p>Acesse o link abaixo no horário agendado para iniciar sua consulta por vídeo</p>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="tele-body">
              <p style="font-size:15px;color:#1e293b;margin:0 0 20px;">Olá, <strong>${data.pacienteNome}</strong>!</p>
              <p style="font-size:14px;color:#475569;margin:0 0 24px;">Sua consulta de telemedicina foi confirmada. Abaixo você encontra os detalhes e o link para acessar a sala de atendimento virtual.</p>

              <!-- Info Card -->
              <div class="tele-card">
                <div class="tele-card-row">
                  <span class="tele-card-label">Médico</span>
                  <span class="tele-card-value">Dr(a). ${data.medicoNome}${data.especialidade ? ` — ${data.especialidade}` : ''}</span>
                </div>
                <div class="tele-card-row">
                  <span class="tele-card-label">Data e Hora</span>
                  <span class="tele-card-value">${dataHoraFormatada}</span>
                </div>
                ${data.clinicaNome ? `
                <div class="tele-card-row" style="margin-bottom:0;">
                  <span class="tele-card-label">Clínica</span>
                  <span class="tele-card-value">${data.clinicaNome}</span>
                </div>` : ''}
              </div>

              <!-- CTA Button -->
              <a href="${data.accessLink}" class="tele-btn">
                🔗 Acessar Sala de Atendimento
              </a>

              <!-- Steps -->
              <div class="tele-steps">
                <h3>📋 Como funciona?</h3>
                <div class="tele-step">
                  <div class="tele-step-num">1</div>
                  <div class="tele-step-text">Clique no botão acima no horário da sua consulta</div>
                </div>
                <div class="tele-step">
                  <div class="tele-step-num">2</div>
                  <div class="tele-step-text">Informe os <strong>4 últimos dígitos do seu CPF</strong> para validar sua identidade</div>
                </div>
                <div class="tele-step">
                  <div class="tele-step-num">3</div>
                  <div class="tele-step-text">Leia e aceite o termo de consentimento de telemedicina (LGPD)</div>
                </div>
                <div class="tele-step">
                  <div class="tele-step-num">4</div>
                  <div class="tele-step-text">Permita o acesso à câmera e microfone do seu dispositivo e aguarde o médico</div>
                </div>
              </div>

              <!-- Warning -->
              <div class="tele-warning">
                ⏰ <strong>Atenção:</strong> Este link é pessoal e intransferível. Ele expira em <strong>24 horas</strong> e pode ser utilizado apenas uma vez. Não compartilhe com outras pessoas.
              </div>

              <p style="font-size:13px;color:#64748b;margin:0 0 8px;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
              <div class="tele-link-box">${data.accessLink}</div>

              <p style="font-size:13px;color:#64748b;margin:24px 0 0;">Qualquer dúvida, entre em contato com a clínica.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td>
              ${gerarEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function gerarEmailTelemedicinalinkTexto(data: TelemedicinaLinkData): string {
  const dataHoraFormatada = formatarDataHora(data.dataHora);
  return `
Olá, ${data.pacienteNome}!

Sua consulta de telemedicina foi confirmada.

DETALHES:
- Médico: Dr(a). ${data.medicoNome}${data.especialidade ? ` — ${data.especialidade}` : ''}
- Data e Hora: ${dataHoraFormatada}
${data.clinicaNome ? `- Clínica: ${data.clinicaNome}` : ''}

ACESSE SUA CONSULTA:
${data.accessLink}

COMO FUNCIONA:
1. Acesse o link acima no horário agendado
2. Informe os 4 últimos dígitos do seu CPF
3. Aceite o termo de consentimento
4. Permita acesso à câmera e microfone

ATENÇÃO: Este link é pessoal e expira em 24 horas. Não compartilhe.

Prontivus - Sistema de Gestão Médica
`.trim();
}
