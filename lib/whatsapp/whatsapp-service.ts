/**
 * Serviço de integração com WhatsApp Business API da Meta
 * 
 * Este serviço permite enviar mensagens via WhatsApp Business API
 * e receber webhooks de mensagens recebidas.
 */

interface SendWhatsAppMessageOptions {
  to: string; // Número do destinatário no formato: 5511999999999 (código do país + DDD + número)
  message: string; // Texto da mensagem
  templateId?: string; // ID do template (para mensagens template)
  templateParams?: string[]; // Parâmetros do template
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
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: {
          body: string;
        };
        context?: {
          from: string;
          id: string;
        };
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

/**
 * Cliente para WhatsApp Business API
 */
class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn(
        "⚠️ WhatsApp não configurado: WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN são necessários"
      );
    }
  }

  /**
   * Envia uma mensagem de texto via WhatsApp
   */
  async sendTextMessage({
    to,
    message,
  }: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        "WhatsApp não configurado. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN"
      );
    }

    // Formatar número (remover caracteres não numéricos)
    const formattedNumber = to.replace(/\D/g, "");

    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    try {
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
        throw new Error(
          `Erro ao enviar mensagem WhatsApp: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: WhatsAppMessageResponse = await response.json();
      console.log("✅ Mensagem WhatsApp enviada:", data.messages[0]?.id);
      return data;
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem WhatsApp:", error);
      throw new Error(`Falha ao enviar mensagem WhatsApp: ${error.message}`);
    }
  }

  /**
   * Envia uma mensagem usando template (para mensagens fora da janela de 24h)
   */
  async sendTemplateMessage({
    to,
    templateId,
    templateParams = [],
  }: SendWhatsAppMessageOptions): Promise<WhatsAppMessageResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        "WhatsApp não configurado. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN"
      );
    }

    if (!templateId) {
      throw new Error("templateId é obrigatório para mensagens template");
    }

    const formattedNumber = to.replace(/\D/g, "");

    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "template",
      template: {
        name: templateId,
        language: {
          code: "pt_BR",
        },
      },
    };

    // Adicionar parâmetros se fornecidos
    if (templateParams.length > 0) {
      payload.template.components = [
        {
          type: "body",
          parameters: templateParams.map((param) => ({
            type: "text",
            text: param,
          })),
        },
      ];
    }

    try {
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
        throw new Error(
          `Erro ao enviar template WhatsApp: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: WhatsAppMessageResponse = await response.json();
      console.log("✅ Template WhatsApp enviado:", data.messages[0]?.id);
      return data;
    } catch (error: any) {
      console.error("❌ Erro ao enviar template WhatsApp:", error);
      throw new Error(`Falha ao enviar template WhatsApp: ${error.message}`);
    }
  }

  /**
   * Verifica a configuração do WhatsApp
   */
  async verifyConfiguration(): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Erro ao verificar configuração WhatsApp:", error);
      return false;
    }
  }

  /**
   * Valida o formato do número de telefone
   */
  validatePhoneNumber(phone: string): boolean {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "");
    // Deve ter entre 10 e 15 dígitos (incluindo código do país)
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Formata o número de telefone para o formato WhatsApp
   */
  formatPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, "");
  }
}

// Instância singleton
let whatsappServiceInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappServiceInstance) {
    whatsappServiceInstance = new WhatsAppService();
  }
  return whatsappServiceInstance;
}

// Exportar funções principais
export async function sendWhatsAppMessage(
  options: SendWhatsAppMessageOptions
): Promise<WhatsAppMessageResponse> {
  const service = getWhatsAppService();
  return service.sendTextMessage(options);
}

export async function sendWhatsAppTemplate(
  options: SendWhatsAppMessageOptions
): Promise<WhatsAppMessageResponse> {
  const service = getWhatsAppService();
  return service.sendTemplateMessage(options);
}

export async function verifyWhatsAppConnection(): Promise<boolean> {
  const service = getWhatsAppService();
  return service.verifyConfiguration();
}

export type { SendWhatsAppMessageOptions, WhatsAppWebhookEntry, WhatsAppMessageResponse };
