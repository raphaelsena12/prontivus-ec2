import { gerarLayoutEmail, gerarInfoCard, gerarBotao, gerarAlerta } from './email-footer';

interface BoasVindasEmailData {
  nomeClinica: string;
  email: string;
  senha: string;
  plano: string;
  loginUrl: string;
  baseUrl?: string;
}

export function gerarEmailBoasVindas(data: BoasVindasEmailData): string {
  const { nomeClinica, email, senha, plano, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  const corpo = `
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px; line-height: 1.5;">Olá, ${nomeClinica}!</p>
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px; line-height: 1.7;">
      Sua assinatura do plano <strong>${plano}</strong> foi ativada com sucesso. Abaixo estão suas credenciais para acessar o sistema.
    </p>

    ${gerarInfoCard([
      { label: 'E-mail de acesso', valor: email },
      { label: 'Senha temporária', valor: `<span style="font-family: 'Courier New', Courier, monospace; font-size: 18px; letter-spacing: 2px; color: #16a34a;">${senha}</span>` },
    ])}

    ${gerarAlerta('aviso', '<strong>Importante:</strong> por segurança, altere sua senha no primeiro acesso em <em>Minha Conta &gt; Segurança</em>.')}

    ${gerarBotao('Acessar minha conta', loginUrl, '#1B3566')}

    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.7;">
      Se precisar de ajuda para começar, entre em contato pelo chat dentro do sistema ou em
      <a href="mailto:suporte@prontivus.com" style="color: #1B3566; text-decoration: none;">suporte@prontivus.com</a>.
    </p>`;

  return gerarLayoutEmail({
    logoUrl,
    headerBgColor: '#1B3566',
    headerTitle: 'Bem-vindo ao Prontivus',
    headerSubtitle: `Sua conta foi ativada — Plano ${plano}`,
    corpo,
    baseUrl,
  });
}

export function gerarEmailBoasVindasTexto(data: BoasVindasEmailData): string {
  const { nomeClinica, email, senha, plano, loginUrl } = data;

  return `BEM-VINDO AO PRONTIVUS
======================

Olá, ${nomeClinica}!

Sua assinatura do plano ${plano} foi ativada com sucesso. Abaixo estão suas credenciais para acessar o sistema.

E-MAIL DE ACESSO: ${email}
SENHA TEMPORÁRIA: ${senha}

IMPORTANTE: por segurança, altere sua senha no primeiro acesso.

Acessar minha conta: ${loginUrl}

Se precisar de ajuda, entre em contato: suporte@prontivus.com

---
E-mail automático. Não responda a esta mensagem.
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.`.trim();
}
