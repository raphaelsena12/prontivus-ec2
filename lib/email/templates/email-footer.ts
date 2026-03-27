const ANO_ATUAL = new Date().getFullYear();

/**
 * Gera o layout completo de um email transacional do Prontivus.
 */
export function gerarLayoutEmail(options: {
  logoUrl: string;
  headerBgColor: string;
  headerTitle: string;
  headerSubtitle: string;
  corpo: string;
  baseUrl?: string;
}): string {
  const { logoUrl, headerBgColor, headerTitle, headerSubtitle, corpo } = options;
  const baseUrl = options.baseUrl || 'https://prontivus.com';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${headerTitle} — Prontivus</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
  <style type="text/css">body, table, td, p, a { font-family: Arial, Helvetica, sans-serif !important; }</style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f1f5f9; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; display: block; height: auto; line-height: 100%; max-width: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .em-container { width: 100% !important; }
      .em-body { padding: 28px 24px !important; }
      .em-header { padding: 24px 20px !important; }
      .em-logo-cell { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f5f9">
  <tr>
    <td align="center" style="padding: 40px 16px;">
      <table class="em-container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

        <!-- Logo -->
        <tr>
          <td class="em-logo-cell" align="center" bgcolor="#ffffff" style="background-color: #ffffff; padding: 28px 40px 24px; border-bottom: 2px solid #e2e8f0;">
            <a href="${baseUrl}" style="text-decoration: none; display: block;">
              <img src="${logoUrl}" alt="Prontivus" width="148" style="max-width: 148px; height: auto;">
            </a>
          </td>
        </tr>

        <!-- Header colorido -->
        <tr>
          <td class="em-header" align="center" bgcolor="${headerBgColor}" style="background-color: ${headerBgColor}; padding: 32px 40px;">
            <h1 style="color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; letter-spacing: -0.2px;">${headerTitle}</h1>
            <p style="color: rgba(255,255,255,0.88); font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 400; margin: 0; line-height: 1.5;">${headerSubtitle}</p>
          </td>
        </tr>

        <!-- Conteúdo -->
        <tr>
          <td class="em-body" bgcolor="#ffffff" style="background-color: #ffffff; padding: 40px;">
            ${corpo}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#111827" style="background-color: #111827; padding: 32px 40px;">
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #ffffff; font-weight: 600; margin: 0 0 12px; line-height: 1.5;">Equipe Prontivus</p>
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #9ca3af; margin: 0 0 4px; line-height: 1.6;">
              Suporte: <a href="mailto:suporte@prontivus.com" style="color: #6b9fd4; text-decoration: none;">suporte@prontivus.com</a>
            </p>
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #9ca3af; margin: 0 0 24px; line-height: 1.6;">
              <a href="${baseUrl}" style="color: #6b9fd4; text-decoration: none;">prontivus.com</a>
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="border-top: 1px solid #374151; padding-top: 20px;">
                  <p style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6b7280; margin: 0; line-height: 1.7;">
                    Este é um e-mail automático. Por favor, não responda a esta mensagem.<br>
                    © ${ANO_ATUAL} Prontivus. Todos os direitos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Gera um card de informações (tabela de label/valor).
 */
export function gerarInfoCard(rows: Array<{ label: string; valor: string }>): string {
  const linhas = rows.map((row, i) => `
        <tr>
          <td style="padding: 14px 20px; ${i < rows.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">${row.label}</p>
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #111827; margin: 0;">${row.valor}</p>
          </td>
        </tr>`).join('');

  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 24px 0;">
        ${linhas}
      </table>`;
}

/**
 * Gera um botão CTA compatível com clientes de e-mail (incluindo Outlook).
 */
export function gerarBotao(texto: string, url: string, bgColor = '#1B3566'): string {
  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0 28px;">
        <tr>
          <td align="center">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="12%" stroke="f" fillcolor="${bgColor}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${texto}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${url}" style="background-color: ${bgColor}; border-radius: 6px; color: #ffffff; display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; padding: 14px 40px; text-decoration: none; line-height: 1.2; mso-hide: all;">${texto}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>`;
}

/**
 * Gera um box de alerta colorido.
 */
export function gerarAlerta(
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info',
  conteudo: string
): string {
  const cores: Record<string, { bg: string; border: string; texto: string }> = {
    sucesso: { bg: '#f0fdf4', border: '#16a34a', texto: '#14532d' },
    erro:    { bg: '#fef2f2', border: '#dc2626', texto: '#7f1d1d' },
    aviso:   { bg: '#fffbeb', border: '#f59e0b', texto: '#92400e' },
    info:    { bg: '#eff6ff', border: '#1B3566', texto: '#1e3a5f' },
  };
  const c = cores[tipo];

  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
        <tr>
          <td width="4" bgcolor="${c.border}" style="background-color: ${c.border}; border-radius: 4px 0 0 4px;">&nbsp;</td>
          <td bgcolor="${c.bg}" style="background-color: ${c.bg}; padding: 14px 18px; border-radius: 0 4px 4px 0;">
            <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: ${c.texto}; margin: 0; line-height: 1.6;">${conteudo}</p>
          </td>
        </tr>
      </table>`;
}

// ─── Exports de compatibilidade com templates legados ───────────────────────

export function gerarEmailFooter(baseUrl = 'https://prontivus.com'): string {
  return `
    <div style="background-color: #111827; padding: 32px 40px;">
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #ffffff; font-weight: 600; margin: 0 0 12px;">Equipe Prontivus</p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0 0 4px;">
        Suporte: <a href="mailto:suporte@prontivus.com" style="color: #6b9fd4; text-decoration: none;">suporte@prontivus.com</a>
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0 0 20px;">
        <a href="${baseUrl}" style="color: #6b9fd4; text-decoration: none;">prontivus.com</a>
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; margin: 0; border-top: 1px solid #374151; padding-top: 20px; line-height: 1.7;">
        Este é um e-mail automático. Por favor, não responda a esta mensagem.<br>
        © ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
      </p>
    </div>`;
}

export function gerarEstilosBase(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; background-color: #f1f5f9; }
    .email-wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .email-header { background-color: #ffffff; padding: 28px 40px 24px; text-align: center; border-bottom: 2px solid #e2e8f0; }
    .logo { max-width: 148px; height: auto; margin: 0 auto; display: block; }
    .email-body { padding: 40px; background-color: #ffffff; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 10px; }
      .email-header { padding: 24px 20px; }
      .email-body { padding: 28px 20px; }
    }`;
}

export function gerarEstilosFooter(): string {
  return `
    .email-footer { background-color: #111827; padding: 32px 40px; }
    @media only screen and (max-width: 600px) {
      .email-footer { padding: 28px 20px; }
    }`;
}
