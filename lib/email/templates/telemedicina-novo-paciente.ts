import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface TelemedicinaNovoPackienteData {
  medicoNome: string;
  pacienteNome: string;
  sessionUrl: string;
  valor: number;
}

export function gerarEmailTelemedicinaNovoPackiente(data: TelemedicinaNovoPackienteData): string {
  const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Paciente Aguardando - Prontivus</title>
  <style>
    ${gerarEstilosBase()}
    ${gerarEstilosFooter()}
    .hero { background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center; color: #fff; }
    .hero h1 { font-size: 22px; font-weight: 700; margin: 12px 0 4px; }
    .hero p { font-size: 14px; opacity: 0.9; margin: 0; }
    .body { background: #fff; padding: 32px 40px; }
    .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }
    .row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; }
    .label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; min-width: 90px; padding-top: 2px; }
    .value { font-size: 14px; color: #1e293b; font-weight: 500; }
    .btn { display: block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff !important; text-decoration: none; text-align: center; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 10px; margin: 24px 0; }
    .alert { background: #fefce8; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0; padding: 12px 16px; font-size: 13px; color: #713f12; margin-bottom: 0; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <tr><td>
          <div class="hero">
            <div style="font-size:40px;margin-bottom:4px;">🔔</div>
            <h1>Paciente Aguardando Atendimento</h1>
            <p>Um novo paciente pagou e está na sala de espera virtual</p>
          </div>
        </td></tr>
        <tr><td class="body">
          <p style="font-size:15px;color:#1e293b;margin:0 0 20px;">Olá, Dr(a). <strong>${data.medicoNome}</strong>!</p>
          <p style="font-size:14px;color:#475569;margin:0 0 24px;">
            O paciente abaixo concluiu o pagamento e está aguardando você na sala de atendimento virtual. Entre na consulta o quanto antes.
          </p>
          <div class="card">
            <div class="row">
              <span class="label">Paciente</span>
              <span class="value">${data.pacienteNome}</span>
            </div>
            <div class="row" style="margin-bottom:0;">
              <span class="label">Valor pago</span>
              <span class="value">${valorFormatado}</span>
            </div>
          </div>
          <a href="${data.sessionUrl}" class="btn">▶ Entrar na Consulta Agora</a>
          <div class="alert">
            ⏰ O paciente ficará aguardando por até 30 minutos. Após esse período, a sessão será cancelada automaticamente.
          </div>
        </td></tr>
        <tr><td>${gerarEmailFooter()}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function gerarEmailTelemedicinaNovoPackienteTexto(data: TelemedicinaNovoPackienteData): string {
  const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor);
  return `
Olá, Dr(a). ${data.medicoNome}!

NOVO PACIENTE AGUARDANDO ATENDIMENTO

Paciente: ${data.pacienteNome}
Valor pago: ${valorFormatado}

Entre na consulta agora:
${data.sessionUrl}

ATENÇÃO: O paciente aguardará por até 30 minutos. Após esse período a sessão será cancelada automaticamente.

Prontivus - Sistema de Gestão Médica
`.trim();
}
