import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface BoasVindasEmailData {
  nomeClinica: string;
  email: string;
  senha: string;
  plano: string;
  loginUrl: string;
  baseUrl?: string;
}

/**
 * Gera o HTML do email de boas-vindas para novos clientes
 */
export function gerarEmailBoasVindas(data: BoasVindasEmailData): string {
  const { nomeClinica, email, senha, plano, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bem-vindo ao Prontivus</title>
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
    .plan-badge {
      display: inline-block;
      background-color: oklch(0.25 0.08 250);
      color: #ffffff;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 16px;
    }
    .greeting {
      font-size: 20px;
      color: #1a1a1a;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .greeting strong {
      color: oklch(0.25 0.08 250);
      font-weight: 700;
    }
    .content-text {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .credentials-card {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
    }
    .credentials-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4a5568;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .credential-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .credential-item:last-child {
      margin-bottom: 0;
    }
    .credential-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #718096;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .credential-value {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      color: #1a1a1a;
      font-weight: 600;
      word-break: break-all;
    }
    .credential-value.password {
      color: #10b981;
      font-size: 20px;
      letter-spacing: 2px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, oklch(0.25 0.08 250) 0%, oklch(0.3 0.1 250) 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .warning-box-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .warning-icon {
      font-size: 24px;
      flex-shrink: 0;
      line-height: 1;
    }
    .warning-text {
      flex: 1;
      font-size: 14px;
      color: #92400e;
      line-height: 1.6;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 32px 0;
    }
    .feature-item {
      background-color: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .feature-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .feature-text {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
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
        padding: 40px 20px 30px;
      }
      .email-header h1 {
        font-size: 26px;
      }
      .email-body {
        padding: 30px 20px;
      }
      .features-grid {
        grid-template-columns: 1fr;
      }
      .button {
        padding: 14px 32px;
        font-size: 15px;
        display: block;
        width: 100%;
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
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">Bem-vindo ao Prontivus!</h1>
        <p style="font-size: 16px; color: #4a5568; margin-bottom: 24px;">Sua conta foi criada com sucesso</p>
        <span class="plan-badge">Plano ${plano}</span>
        
        <p class="greeting" style="margin-top: 24px;">Olá, <strong>${nomeClinica}</strong>!</p>
        
        <p class="content-text">
          É um prazer tê-lo conosco! Seu cadastro foi realizado com sucesso e você já pode começar a usar 
          todas as funcionalidades do Prontivus para gerenciar sua clínica de forma eficiente.
        </p>
        
        <div class="credentials-card">
          <div class="credentials-title">Suas credenciais de acesso</div>
          
          <div class="credential-item">
            <div class="credential-label">Email</div>
            <div class="credential-value">${email}</div>
          </div>
          
          <div class="credential-item">
            <div class="credential-label">Senha Temporária</div>
            <div class="credential-value password">${senha}</div>
          </div>
        </div>
        
        <div class="warning-box">
          <div class="warning-box-content">
            <span class="warning-icon">🔒</span>
            <div class="warning-text">
              <strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.
            </div>
          </div>
        </div>
        
        <div class="button-container">
          <a href="${loginUrl}" class="button" style="color: #ffffff;">Acessar Minha Conta</a>
        </div>
        
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon">👥</div>
            <div class="feature-text">Cadastrar pacientes</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📅</div>
            <div class="feature-text">Agendar consultas</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📋</div>
            <div class="feature-text">Prontuários eletrônicos</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">IA para diagnóstico</div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Precisa de ajuda? Nossa equipe de suporte está pronta para auxiliá-lo em qualquer momento.
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
 * Gera a versão texto do email de boas-vindas
 */
export function gerarEmailBoasVindasTexto(data: BoasVindasEmailData): string {
  const { nomeClinica, email, senha, plano, loginUrl } = data;

  return `
BEM-VINDO AO PRONTIVUS!
=======================

Olá, ${nomeClinica}!

É um prazer tê-lo conosco! Seu cadastro foi realizado com sucesso e você já pode começar a usar 
todas as funcionalidades do Prontivus para gerenciar sua clínica de forma eficiente.

═══════════════════════════════════════
SUAS CREDENCIAIS DE ACESSO
═══════════════════════════════════════
Email: ${email}
Senha Temporária: ${senha}

🔒 IMPORTANTE: Por segurança, recomendamos que você altere sua senha no primeiro acesso.

Acesse sua conta: ${loginUrl}

═══════════════════════════════════════
O QUE VOCÊ PODE FAZER AGORA
═══════════════════════════════════════
• Cadastrar seus pacientes
• Agendar consultas
• Criar prontuários eletrônicos
• Gerenciar sua equipe médica
• Utilizar IA para auxiliar no diagnóstico

Precisa de ajuda? Nossa equipe de suporte está pronta para auxiliá-lo em qualquer momento.

Suporte: suporte@prontivus.com

---
Este é um email automático. Por favor, não responda a esta mensagem.

© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
