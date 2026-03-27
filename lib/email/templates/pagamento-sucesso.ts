import { gerarLayoutEmail, gerarInfoCard, gerarBotao } from './email-footer';

interface PagamentoSucessoEmailData {
  nomeClinica: string;
  plano: string;
  dataRenovacao: string;
  loginUrl: string;
  baseUrl?: string;
  reativacao?: boolean;
  dataProximoVencimento?: string;
}

export function gerarEmailPagamentoSucesso(data: PagamentoSucessoEmailData): string {
  const { nomeClinica, plano, dataRenovacao, loginUrl, reativacao = false, dataProximoVencimento } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  const headerTitle = reativacao ? 'Conta reativada' : 'Pagamento confirmado';
  const headerSubtitle = reativacao
    ? 'Seu pagamento foi confirmado e o acesso foi restaurado'
    : 'Sua assinatura foi renovada com sucesso';
  const mensagem = reativacao
    ? `Sua conta foi reativada com sucesso. Todos os recursos do plano <strong>${plano}</strong> estão disponíveis novamente.`
    : `Confirmamos o pagamento da sua assinatura. Sua conta está ativa e em dia.`;

  const rows: Array<{ label: string; valor: string }> = [
    { label: 'Plano', valor: plano },
    { label: reativacao ? 'Data da reativação' : 'Data do pagamento', valor: dataRenovacao },
  ];
  if (dataProximoVencimento) {
    rows.push({ label: 'Próximo vencimento', valor: dataProximoVencimento });
  }

  const corpo = `
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px; line-height: 1.5;">Olá, ${nomeClinica}!</p>
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.7;">
      ${mensagem}
    </p>

    ${gerarInfoCard(rows)}

    ${gerarBotao('Acessar minha conta', loginUrl, '#16a34a')}

    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.7;">
      Dúvidas? Entre em contato: <a href="mailto:suporte@prontivus.com" style="color: #1B3566; text-decoration: none;">suporte@prontivus.com</a>
    </p>`;

  return gerarLayoutEmail({
    logoUrl,
    headerBgColor: '#16a34a',
    headerTitle,
    headerSubtitle,
    corpo,
    baseUrl,
  });
}

export function gerarEmailPagamentoSucessoTexto(data: PagamentoSucessoEmailData): string {
  const { nomeClinica, plano, dataRenovacao, loginUrl, reativacao = false, dataProximoVencimento } = data;

  const titulo = reativacao ? 'CONTA REATIVADA' : 'PAGAMENTO CONFIRMADO';
  const mensagem = reativacao
    ? `Sua conta foi reativada com sucesso. Todos os recursos do plano ${plano} estão disponíveis novamente.`
    : `Confirmamos o pagamento da sua assinatura. Sua conta está ativa e em dia.`;

  let detalhes = `Plano: ${plano}\n${reativacao ? 'Data da reativação' : 'Data do pagamento'}: ${dataRenovacao}`;
  if (dataProximoVencimento) {
    detalhes += `\nPróximo vencimento: ${dataProximoVencimento}`;
  }

  return `${titulo} — PRONTIVUS
${'='.repeat(Math.max(titulo.length + 12, 30))}

Olá, ${nomeClinica}!

${mensagem}

${detalhes}

Acessar minha conta: ${loginUrl}

Dúvidas? suporte@prontivus.com

---
E-mail automático. Não responda a esta mensagem.
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.`.trim();
}
