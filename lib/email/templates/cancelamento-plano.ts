import { gerarLayoutEmail, gerarInfoCard, gerarBotao, gerarAlerta } from './email-footer';

interface CancelamentoPlanoEmailData {
  nomeClinica: string;
  plano: string;
  dataFimAcesso?: string;
  loginUrl: string;
  baseUrl?: string;
}

export function gerarEmailCancelamentoPlano(data: CancelamentoPlanoEmailData): string {
  const { nomeClinica, plano, dataFimAcesso, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  const rows: Array<{ label: string; valor: string }> = [
    { label: 'Plano cancelado', valor: plano },
  ];
  if (dataFimAcesso) {
    rows.push({ label: 'Acesso ativo até', valor: dataFimAcesso });
  }

  const acessoTexto = dataFimAcesso
    ? `Seu acesso ao sistema permanece ativo até <strong>${dataFimAcesso}</strong>. Após essa data, o acesso será encerrado e os dados retidos por 30 dias.`
    : 'O acesso ao sistema foi encerrado. Os dados serão retidos por 30 dias.';

  const subtitulo = dataFimAcesso
    ? `Acesso ativo até ${dataFimAcesso}`
    : 'Seu acesso ao sistema foi encerrado';

  const corpo = `
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px; line-height: 1.5;">Olá, ${nomeClinica}!</p>
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.7;">
      Confirmamos o cancelamento da sua assinatura do plano <strong>${plano}</strong>. ${acessoTexto}
    </p>

    ${gerarInfoCard(rows)}

    ${gerarAlerta('info', 'Se mudar de ideia, você pode reativar sua assinatura a qualquer momento. Nenhuma cobrança adicional será gerada até a reativação.')}

    ${gerarBotao('Reativar minha assinatura', loginUrl, '#1B3566')}

    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.7;">
      Agradecemos por ter utilizado o Prontivus. Dúvidas? <a href="mailto:suporte@prontivus.com" style="color: #1B3566; text-decoration: none;">suporte@prontivus.com</a>
    </p>`;

  return gerarLayoutEmail({
    logoUrl,
    headerBgColor: '#374151',
    headerTitle: 'Assinatura cancelada',
    headerSubtitle: subtitulo,
    corpo,
    baseUrl,
  });
}

export function gerarEmailCancelamentoPlanoTexto(data: CancelamentoPlanoEmailData): string {
  const { nomeClinica, plano, dataFimAcesso, loginUrl } = data;

  const acessoTexto = dataFimAcesso
    ? `Seu acesso ao sistema permanece ativo até ${dataFimAcesso}. Após essa data, o acesso será encerrado e os dados retidos por 30 dias.`
    : 'O acesso ao sistema foi encerrado. Os dados serão retidos por 30 dias.';

  return `ASSINATURA CANCELADA — PRONTIVUS
==================================

Olá, ${nomeClinica}!

Confirmamos o cancelamento da sua assinatura do plano ${plano}. ${acessoTexto}

Plano cancelado: ${plano}${dataFimAcesso ? `\nAcesso ativo até: ${dataFimAcesso}` : ''}

Se mudar de ideia, você pode reativar sua assinatura a qualquer momento. Nenhuma cobrança adicional será gerada até a reativação.

Reativar assinatura: ${loginUrl}

Agradecemos por ter utilizado o Prontivus.
Dúvidas? suporte@prontivus.com

---
E-mail automático. Não responda a esta mensagem.
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.`.trim();
}
