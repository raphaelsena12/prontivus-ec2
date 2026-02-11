/**
 * Módulo de integração com WhatsApp Business API
 * 
 * Este módulo fornece funções para enviar mensagens via WhatsApp
 * e processar webhooks da Meta.
 */

export {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  verifyWhatsAppConnection,
  getWhatsAppService,
  type SendWhatsAppMessageOptions,
  type WhatsAppWebhookEntry,
  type WhatsAppMessageResponse,
} from "./whatsapp-service";

// Templates de mensagens
export {
  gerarMensagemConfirmacaoAgendamento,
  gerarMensagemAlteracaoAgendamento,
  gerarMensagemCancelamentoAgendamento,
  gerarMensagemLembreteConsulta,
} from "./templates/agendamento-confirmacao";
