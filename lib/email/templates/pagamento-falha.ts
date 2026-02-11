import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface PagamentoFalhaEmailData {
  nomeClinica: string;
  plano: string;
  dataVencimento: string;
  loginUrl: string;
  baseUrl?: string;
}

/**
 * Gera o HTML do email de falha no pagamento
 */
export function gerarEmailPagamentoFalha(data: PagamentoFalhaEmailData): string {
  const { nomeClinica, plano, dataVencimento, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Problema com seu pagamento - Prontivus</title>
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
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f7fa;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f5f7fa;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .email-header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      padding: 40px 40px 30px;
      text-align: center;
    }
    .header-icon {
      width: 80px;
      height: 80px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }
    .email-header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      margin: 0;
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
    .alert-card {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
    }
    .alert-title {
      font-size: 18px;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 8px;
    }
    .alert-text {
      font-size: 14px;
      color: #7f1d1d;
      line-height: 1.6;
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
      min-width: 160px;
      font-size: 14px;
    }
    .info-value {
      color: #1a1a1a;
      flex: 1;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .steps-card {
      background-color: #f7fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    }
    .steps-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .step-item:last-child {
      border-bottom: none;
    }
    .step-number {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, oklch(0.25 0.08 250) 0%, oklch(0.3 0.1 250) 100%);
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    .step-text {
      flex: 1;
      color: #4a5568;
      font-size: 14px;
      line-height: 1.6;
      padding-top: 2px;
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
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Problema com seu pagamento</h1>
        
        <p class="greeting">Olá, <strong>${nomeClinica}</strong>!</p>
        
        <p class="content-text">
          Identificamos um problema ao processar o pagamento da sua assinatura do Prontivus. 
          Isso pode ter ocorrido por diversos motivos, como cartão expirado, limite insuficiente 
          ou dados desatualizados.
        </p>
        
        <div class="alert-card">
          <div class="alert-title">⚠️ Sua conta está temporariamente suspensa</div>
          <div class="alert-text">
            Para continuar utilizando o sistema, regularize seu pagamento o quanto antes.
          </div>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Plano:</span>
            <span class="info-value">${plano}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data de vencimento:</span>
            <span class="info-value">${dataVencimento}</span>
          </div>
        </div>
        
        <div class="button-container">
          <a href="${loginUrl}" class="button" style="color: #ffffff;">Atualizar Pagamento</a>
        </div>
        
        <div class="steps-card">
          <div class="steps-title">Como regularizar:</div>
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-text">Acesse sua conta no Prontivus</div>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-text">Vá em Configurações > Assinatura</div>
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-text">Atualize os dados do cartão ou escolha outro método de pagamento</div>
          </div>
          <div class="step-item">
            <div class="step-number">4</div>
            <div class="step-text">Confirme o pagamento pendente</div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Se você acredita que isso é um erro ou precisa de ajuda, entre em contato com nosso suporte. 
          Estamos aqui para ajudá-lo.
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
 * Gera a versão texto do email de falha no pagamento
 */
export function gerarEmailPagamentoFalhaTexto(
  data: PagamentoFalhaEmailData
): string {
  const { nomeClinica, plano, dataVencimento, loginUrl } = data;

  return `
PROBLEMA COM SEU PAGAMENTO - PRONTIVUS
=======================================

Olá, ${nomeClinica},

Identificamos um problema ao processar o pagamento da sua assinatura do Prontivus. 
Isso pode ter ocorrido por diversos motivos, como cartão expirado, limite insuficiente 
ou dados desatualizados.

═══════════════════════════════════════
⚠️ SUA CONTA ESTÁ TEMPORARIAMENTE SUSPENSA
═══════════════════════════════════════
Para continuar utilizando o sistema, regularize seu pagamento o quanto antes.

═══════════════════════════════════════
DETALHES
═══════════════════════════════════════
Plano: ${plano}
Data de vencimento: ${dataVencimento}

═══════════════════════════════════════
COMO REGULARIZAR
═══════════════════════════════════════
1. Acesse sua conta no Prontivus
2. Vá em Configurações > Assinatura
3. Atualize os dados do cartão ou escolha outro método de pagamento
4. Confirme o pagamento pendente

Acesse: ${loginUrl}

Se você acredita que isso é um erro ou precisa de ajuda, entre em contato com nosso suporte. 
Estamos aqui para ajudá-lo.

Suporte: suporte@prontivus.com

---
Este é um email automático. Por favor, não responda a esta mensagem.

© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
