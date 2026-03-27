import { gerarLayoutEmail, gerarInfoCard, gerarBotao, gerarAlerta } from './email-footer';

interface AlteracaoPlanoEmailData {
  nomeClinica: string;
  planoAnterior: string;
  planoNovo: string;
  upgrade: boolean;
  dataAlteracao: string;
  loginUrl: string;
  baseUrl?: string;
}

export function gerarEmailAlteracaoPlano(data: AlteracaoPlanoEmailData): string {
  const { nomeClinica, planoAnterior, planoNovo, upgrade, dataAlteracao, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  const headerTitle = upgrade ? 'Upgrade realizado' : 'Plano alterado';
  const headerSubtitle = upgrade
    ? 'Seu plano foi atualizado para um nível superior'
    : 'Seu plano foi atualizado';
  const headerBgColor = upgrade ? '#7c3aed' : '#1B3566';

  const alertaConteudo = upgrade
    ? `Seus novos recursos e limites ampliados já estão disponíveis na sua conta.`
    : `Alguns recursos do plano anterior podem não estar mais disponíveis. Em caso de dúvidas, entre em contato com o suporte.`;
  const alertaTipo = upgrade ? 'sucesso' : 'aviso';

  const corpo = `
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px; line-height: 1.5;">Olá, ${nomeClinica}!</p>
    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.7;">
      Seu plano no Prontivus foi atualizado com sucesso.
    </p>

    ${gerarInfoCard([
      { label: 'Plano anterior', valor: planoAnterior },
      { label: 'Novo plano', valor: planoNovo },
      { label: 'Data da alteração', valor: dataAlteracao },
    ])}

    ${gerarAlerta(alertaTipo as 'sucesso' | 'aviso', alertaConteudo)}

    ${gerarBotao('Acessar minha conta', loginUrl, headerBgColor)}

    <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.7;">
      Dúvidas sobre o novo plano? <a href="mailto:suporte@prontivus.com" style="color: #1B3566; text-decoration: none;">suporte@prontivus.com</a>
    </p>`;

  return gerarLayoutEmail({
    logoUrl,
    headerBgColor,
    headerTitle,
    headerSubtitle,
    corpo,
    baseUrl,
  });
}

export function gerarEmailAlteracaoPlanoTexto(data: AlteracaoPlanoEmailData): string {
  const { nomeClinica, planoAnterior, planoNovo, upgrade, dataAlteracao, loginUrl } = data;
  const titulo = upgrade ? 'UPGRADE REALIZADO' : 'PLANO ALTERADO';

  return `${titulo} — PRONTIVUS
${'='.repeat(Math.max(titulo.length + 12, 30))}

Olá, ${nomeClinica}!

Seu plano no Prontivus foi atualizado com sucesso.

Plano anterior: ${planoAnterior}
Novo plano: ${planoNovo}
Data da alteração: ${dataAlteracao}

${upgrade
  ? 'Seus novos recursos e limites ampliados já estão disponíveis na sua conta.'
  : 'Alguns recursos do plano anterior podem não estar mais disponíveis. Em caso de dúvidas, entre em contato com o suporte.'}

Acessar minha conta: ${loginUrl}

Dúvidas? suporte@prontivus.com

---
E-mail automático. Não responda a esta mensagem.
© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.`.trim();
}
