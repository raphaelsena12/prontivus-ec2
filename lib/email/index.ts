// Importar ambos os serviços
import * as sesService from "./ses-service";
import * as smtpService from "./smtp-service";

// Tipo para as opções de email
type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
};

// Usar SES se configurado, senão usar SMTP como fallback
const useSES = process.env.USE_AWS_SES === "true";

// Exportar as funções baseadas na configuração
export const sendEmail = useSES ? sesService.sendEmail : smtpService.sendEmail;
export const verifySMTPConnection = useSES 
  ? sesService.verifySMTPConnection 
  : smtpService.verifySMTPConnection;

// Exportar sendEmailAsync (wrapper para SMTP se necessário)
export const sendEmailAsync = useSES 
  ? sesService.sendEmailAsync 
  : async (options: SendEmailOptions): Promise<void> => {
      // Para SMTP, executar em background sem bloquear
      smtpService.sendEmail(options).catch((error) => {
        console.error("Erro ao enviar email em background:", error);
      });
    };

// Templates continuam os mesmos
export {
  gerarEmailConfirmacaoAgendamento,
  gerarEmailConfirmacaoAgendamentoTexto,
} from "./templates/agendamento-confirmacao";
export {
  gerarEmailAlteracaoAgendamento,
  gerarEmailAlteracaoAgendamentoTexto,
} from "./templates/agendamento-alteracao";
export {
  gerarEmailCancelamentoAgendamento,
  gerarEmailCancelamentoAgendamentoTexto,
} from "./templates/agendamento-cancelamento";
export {
  gerarEmailBoasVindas,
  gerarEmailBoasVindasTexto,
} from "./templates/boas-vindas";
export {
  gerarEmailPagamentoFalha,
  gerarEmailPagamentoFalhaTexto,
} from "./templates/pagamento-falha";
export {
  gerarEmailPagamentoSucesso,
  gerarEmailPagamentoSucessoTexto,
} from "./templates/pagamento-sucesso";
export {
  gerarEmailRecuperacaoSenha,
  gerarEmailRecuperacaoSenhaTexto,
} from "./templates/recuperacao-senha";
export {
  gerarEmailTelemedicinalink,
  gerarEmailTelemedicinalinkTexto,
} from "./templates/telemedicina-link";

