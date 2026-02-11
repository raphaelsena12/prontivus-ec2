/**
 * Gera o rodapé padrão dos emails do Prontivus
 */
export function gerarEmailFooter(baseUrl: string = 'https://prontivus.com'): string {
  return `
    <!-- Footer -->
    <div class="email-footer">
      <p class="footer-greeting">Abraços,<br>Equipe Prontivus</p>
      
      <div class="footer-section">
        <p class="footer-section-text">
          Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou 
          ligue <a href="tel:08001234567" class="footer-link">0800 123 4567</a> (capitais e regiões metropolitanas) 
          ou <a href="tel:08001234568" class="footer-link">0800 123 4568</a> (demais localidades). 
          Atendimento 24h.
        </p>
      </div>
      
      <div class="footer-section">
        <p class="footer-section-text">
          Caso a solução fornecida nos canais de atendimento não tenha sido satisfatória, 
          fale com a Ouvidoria em <a href="tel:08001234569" class="footer-link">0800 123 4569</a> 
          ou pelos meios disponíveis em nossa página de <a href="${baseUrl}/contato" class="footer-link">Contato</a>. 
          Atendimento das 8h às 18h em dias úteis.
        </p>
      </div>
      
      <div class="social-links">
        <a href="https://facebook.com/prontivus" class="social-link">f</a>
        <a href="https://instagram.com/prontivus" class="social-link">📷</a>
        <a href="https://linkedin.com/company/prontivus" class="social-link">in</a>
        <a href="https://youtube.com/@prontivus" class="social-link">▶</a>
      </div>
      
      <div class="footer-disclaimer">
        Por favor, pedimos que você não responda esse e-mail, pois se trata de uma mensagem automática 
        e não é possível dar continuidade ao seu atendimento por aqui.
      </div>
      
      <div class="footer-legal">
        Prontivus Sistemas Médicos Ltda.<br>
        CNPJ: 00.000.000/0001-00<br>
        Rua Exemplo, 123 - 00000-000 - São Paulo, SP
      </div>
    </div>
  `;
}

/**
 * Gera os estilos CSS do rodapé
 */
export function gerarEstilosFooter(): string {
  return `
    .email-footer {
      background-color: #000000;
      padding: 40px;
      color: #ffffff;
    }
    .footer-greeting {
      font-size: 16px;
      margin-bottom: 24px;
      color: #ffffff;
    }
    .footer-section {
      margin-bottom: 24px;
    }
    .footer-section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .footer-section-text {
      font-size: 13px;
      color: #a0aec0;
      line-height: 1.7;
      margin-bottom: 8px;
    }
    .footer-link {
      color: oklch(0.25 0.08 250);
      text-decoration: none;
    }
    .footer-link:hover {
      text-decoration: underline;
    }
    .social-links {
      display: flex;
      gap: 16px;
      margin: 24px 0;
      justify-content: center;
    }
    .social-link {
      width: 40px;
      height: 40px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      color: #ffffff;
      font-size: 18px;
    }
    .footer-disclaimer {
      font-size: 12px;
      color: #718096;
      line-height: 1.6;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #2d3748;
    }
    .footer-legal {
      font-size: 12px;
      color: #718096;
      line-height: 1.6;
      margin-top: 16px;
    }
    @media only screen and (max-width: 600px) {
      .email-footer {
        padding: 30px 20px;
      }
    }
  `;
}

/**
 * Gera os estilos CSS base com fonte Inter
 */
export function gerarEstilosBase(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
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
      border-radius: 0;
      overflow: hidden;
    }
    .email-header {
      background-color: #ffffff;
      padding: 40px 40px 30px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .logo {
      max-width: 180px;
      height: auto;
      margin: 0 auto 30px;
      display: block;
    }
    .email-body {
      padding: 40px;
      background-color: #ffffff;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      .email-header {
        padding: 30px 20px 20px;
      }
      .email-body {
        padding: 30px 20px;
      }
      .email-footer {
        padding: 30px 20px;
      }
    }
  `;
}
