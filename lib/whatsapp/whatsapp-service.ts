/**
 * Serviço de integração com WhatsApp Business API da Meta
 *
 * Suporta multi-tenant: cada clínica tem suas próprias credenciais no banco.
 * Fallback para variáveis de ambiente globais se não houver credenciais no banco.
 */

import { prisma } from "@/lib/prisma";

interface SendWhatsAppMessageOptions {
  to: string; // Número do destinatário no formato: 5511999999999
  message: string;
  templateId?: string;
  templateParams?: string[];
}

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        context?: { from: string; id: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  async sendTextMessage({ to, message }: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error("WhatsApp não configurado para esta clínica");
    }

    const formattedNumber = to.replace(/\D/g, "");
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "text",
      text: { preview_url: false, body: message },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao enviar mensagem WhatsApp: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data: WhatsAppMessageResponse = await response.json();
    console.log("✅ Mensagem WhatsApp enviada:", data.messages[0]?.id);
    return data;
  }

  async sendTemplateMessage({ to, templateId, templateParams = [] }: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error("WhatsApp não configurado para esta clínica");
    }

    if (!templateId) throw new Error("templateId é obrigatório para mensagens template");

    const formattedNumber = to.replace(/\D/g, "");
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "template",
      template: {
        name: templateId,
        language: { code: "pt_BR" },
      },
    };

    if (templateParams.length > 0) {
      payload.template.components = [
        {
          type: "body",
          parameters: templateParams.map((param) => ({ type: "text", text: param })),
        },
      ];
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao enviar template WhatsApp: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data: WhatsAppMessageResponse = await response.json();
    console.log("✅ Template WhatsApp enviado:", data.messages[0]?.id);
    return data;
  }

  async verifyConfiguration(): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  formatPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

// ─── Factory por credenciais diretas ─────────────────────────────────────────

export function createWhatsAppService(phoneNumberId: string, accessToken: string): WhatsAppService {
  return new WhatsAppService(phoneNumberId, accessToken);
}

// ─── Singleton com variáveis de ambiente (compatibilidade) ───────────────────

let envServiceInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!envServiceInstance) {
    envServiceInstance = new WhatsAppService(
      process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      process.env.WHATSAPP_ACCESS_TOKEN || ""
    );
  }
  return envServiceInstance;
}

// ─── Helper multi-tenant: busca credenciais da clínica no banco ───────────────

export async function getClinicaWhatsAppService(clinicaId: string): Promise<WhatsAppService | null> {
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { whatsappPhoneNumberId: true, whatsappAccessToken: true },
  });

  if (!clinica?.whatsappPhoneNumberId || !clinica?.whatsappAccessToken) {
    return null;
  }

  return new WhatsAppService(clinica.whatsappPhoneNumberId, clinica.whatsappAccessToken);
}

// ─── Envio multi-tenant ───────────────────────────────────────────────────────

/**
 * Envia mensagem de texto usando as credenciais da clínica no banco.
 * Silencioso: não lança erro se a clínica não tiver WhatsApp configurado.
 * Retorna null se não enviado.
 */
export async function sendWhatsAppForClinica(
  clinicaId: string,
  options: SendWhatsAppMessageOptions
): Promise<WhatsAppMessageResponse | null> {
  try {
    const service = await getClinicaWhatsAppService(clinicaId);
    if (!service) {
      console.log(`ℹ️ WhatsApp não configurado para clínica ${clinicaId} — mensagem não enviada`);
      return null;
    }
    return await service.sendTextMessage(options);
  } catch (error: any) {
    console.error("❌ Erro ao enviar WhatsApp para clínica:", error.message);
    
    // Se o erro for de número não autorizado, relançar com mensagem mais clara
    if (error.message?.includes("not in allowed list") || error.message?.includes("131030") || error.message?.includes("Recipient phone number not in allowed list")) {
      throw new Error("Número de telefone não autorizado. No modo sandbox, você precisa adicionar o número na lista de permissões do Meta e fazer opt-in.");
    }
    
    return null;
  }
}

// ─── Compatibilidade com variáveis de ambiente ────────────────────────────────

export async function sendWhatsAppMessage(options: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
  return getWhatsAppService().sendTextMessage(options);
}

export async function sendWhatsAppTemplate(options: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
  return getWhatsAppService().sendTemplateMessage(options);
}

export async function verifyWhatsAppConnection(): Promise<boolean> {
  return getWhatsAppService().verifyConfiguration();
}

export type { SendWhatsAppMessageOptions, WhatsAppWebhookEntry, WhatsAppMessageResponse };
