import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface RecuperacaoSenhaEmailData {
  nome: string;
  resetUrl: string;
  baseUrl?: string;
}

/**
 * Gera o HTML do email de recuperação de senha
 */
export function gerarEmailRecuperacaoSenha(data: RecuperacaoSenhaEmailData): string {
  const { nome, resetUrl, baseUrl = 'https://prontivus.com' } = data;
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Redefinir sua senha - Prontivus</title>
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
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: oklch(0.25 0.08 250);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.3px;
    }
    .link-fallback {
      margin-top: 24px;
      padding: 16px;
      background-color: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      word-break: break-all;
      font-size: 13px;
      color: #4a5568;
      line-height: 1.6;
    }
    .link-fallback strong {
      display: block;
      margin-bottom: 8px;
      color: #1a1a1a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .alert-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 32px 0;
    }
    .alert-box-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .alert-icon {
      font-size: 24px;
      flex-shrink: 0;
      line-height: 1;
    }
    .alert-text {
      flex: 1;
      font-size: 14px;
      color: #92400e;
      line-height: 1.6;
    }
    .alert-text strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 32px 0;
    }
    ${gerarEstilosFooter()}
    .button {
      padding: 14px 32px;
      font-size: 15px;
    }
    @media only screen and (max-width: 600px) {
      .button {
        display: block;
        width: 100%;
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
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Redefinir senha</h1>
        
        <p class="greeting">Olá, <strong>${nome}</strong>!</p>
        
        <p class="content-text">
          Recebemos uma solicitação para redefinir a senha da sua conta no Prontivus. 
          Clique no botão abaixo para criar uma nova senha:
        </p>
        
        <div class="button-container">
          <a href="${resetUrl}" class="button" style="color: #ffffff;">Redefinir senha</a>
        </div>
        
        <div class="link-fallback">
          <strong>Ou copie e cole este link no seu navegador:</strong>
          ${resetUrl}
        </div>
        
        <div class="alert-box">
          <div class="alert-box-content">
            <span class="alert-icon">⚠️</span>
            <div class="alert-text">
              <strong>Importante</strong>
              Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. 
          Sua conta permanecerá segura.
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
 * Gera a versão texto do email de recuperação de senha
 */
export function gerarEmailRecuperacaoSenhaTexto(data: RecuperacaoSenhaEmailData): string {
  const { nome, resetUrl } = data;

  return `
REDEFINIR SENHA - PRONTIVUS
============================

Olá, ${nome}!

Recebemos uma solicitação para redefinir a senha da sua conta no Prontivus.

Para criar uma nova senha, acesse o link abaixo:
${resetUrl}

⚠️ IMPORTANTE: Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.

Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. Sua conta permanecerá segura.

---
Abraços,
Equipe Prontivus

Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou 
ligue 0800 123 4567 (capitais e regiões metropolitanas) ou 0800 123 4568 (demais localidades). 
Atendimento 24h.

Caso a solução fornecida nos canais de atendimento não tenha sido satisfatória, 
fale com a Ouvidoria em 0800 123 4569 ou pelos meios disponíveis em nossa página de Contato. 
Atendimento das 8h às 18h em dias úteis.

Por favor, pedimos que você não responda esse e-mail, pois se trata de uma mensagem automática 
e não é possível dar continuidade ao seu atendimento por aqui.

Prontivus Sistemas Médicos Ltda.
CNPJ: 00.000.000/0001-00
Rua Exemplo, 123 - 00000-000 - São Paulo, SP

© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
