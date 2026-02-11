import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Configuração SMTP
const smtpConfig: EmailConfig = {
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // true para porta 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER || "suporte@prontivus.com",
    pass: process.env.SMTP_PASSWORD || "ef&!.UHq=7D9k!m",
  },
};

// Criar transporter reutilizável
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
}

/**
 * Envia um email usando a configuração SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  fromName,
}: SendEmailOptions): Promise<void> {
  try {
    // Verificar se as credenciais estão configuradas
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      throw new Error("Credenciais SMTP não configuradas. Configure SMTP_USER e SMTP_PASSWORD.");
    }

    const mailTransporter = getTransporter();

    // Formatar remetente com nome se fornecido
    const emailFrom = from || smtpConfig.auth.user;
    const fromAddress = fromName
      ? `${fromName} <${emailFrom}>`
      : emailFrom;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text: text || undefined,
      html,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log("Email enviado com sucesso:", info.messageId);
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    
    // Mensagens de erro mais específicas
    if (error.code === "EAUTH" || error.code === "EENVELOPE") {
      throw new Error(`Erro de autenticação SMTP: ${error.message || "Credenciais inválidas"}`);
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      throw new Error(`Erro de conexão SMTP: ${error.message || "Não foi possível conectar ao servidor SMTP"}`);
    } else if (error.message?.includes("Credenciais SMTP não configuradas")) {
      throw error; // Re-lançar erro de configuração
    } else {
      throw new Error(`Falha ao enviar email: ${error.message || "Erro desconhecido"}`);
    }
  }
}

/**
 * Verifica a conexão SMTP
 */
export async function verifySMTPConnection(): Promise<boolean> {
  try {
    const mailTransporter = getTransporter();
    await mailTransporter.verify();
    console.log("Conexão SMTP verificada com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao verificar conexão SMTP:", error);
    return false;
  }
}

