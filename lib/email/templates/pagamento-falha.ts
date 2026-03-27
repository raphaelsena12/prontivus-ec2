import { gerarLayoutEmail, gerarInfoCard, gerarBotao, gerarAlerta } from './email-footer';

interface PagamentoFalhaEmailData {
  nomeClinica: string;
  plano: string;
  dataVencimento: string;
  loginUrl: string;
  baseUrl?: string;
}

export function gerarEmailPagamentoFalha(data: PagamentoFalhaEmailData): string {
  const { nomeClinica, plano, dataVencimento, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  const corpo = `
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px; line-height: 1.5;">Olá, ${nomeClinica}!</p>
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.7;">
      Não conseguimos processar o pagamento da sua assinatura do plano <strong>${plano}</strong>. Isso pode ocorrer por cartão expirado, limite insuficiente ou dados incorretos.
    </p>

    ${gerarInfoCard([
      { label: 'Plano', valor: plano },
      { label: 'Vencimento', valor: dataVencimento },
    ])}

    ${gerarAlerta('erro', 'Para regularizar, acesse sua conta e atualize os dados de pagamento em <strong>Configurações &gt; Assinatura</strong>. Se o problema não for resolvido, o acesso poderá ser suspenso.')}

    ${gerarBotao('Atualizar dados de pagamento', loginUrl, '#dc2626')}

    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.7;">
      Dúvidas? Entre em contato: <a href="mailto:suporte@prontivus.com" style="color: #1B3566; text-decoration: none;">suporte@prontivus.com</a>
    </p>`;

  return gerarLayoutEmail({
    logoUrl,
    headerBgColor: '#dc2626',
    headerTitle: 'Falha no pagamento',
    headerSubtitle: 'Não conseguimos processar a cobrança da sua assinatura',
    corpo,
    baseUrl,
  });
}

export function gerarEmailPagamentoFalhaTexto(data: PagamentoFalhaEmailData): string {
  const { nomeClinica, plano, dataVencimento, loginUrl } = data;

  return `FALHA NO PAGAMENTO — PRONTIVUS
================================

Olá, ${nomeClinica}!

Não conseguimos processar o pagamento da sua assinatura do plano ${plano}. Isso pode ocorrer por cartão expirado, limite insuficiente ou dados incorretos.

Plano: ${plano}
Vencimento: ${dataVencimento}

Para regularizar, acesse sua conta e atualize os dados de pagamento em Configurações > Assinatura. Se o problema não for resolvido, o acesso poderá ser suspenso.

Atualizar dados: ${loginUrl}

Dúvidas? suporte@prontivus.com

---
E-mail automático. Não responda a esta mensagem.
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.`.trim();
}
