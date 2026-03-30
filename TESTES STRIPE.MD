Pré-requisito: instalar Stripe CLI

# Windows (scoop)
scoop install stripe

# Ou baixar direto: https://stripe.com/docs/stripe-cli
Autenticar:


stripe login
Escutar webhooks localmente (rode em segundo plano):


stripe listen --forward-to localhost:3000/api/stripe/webhook
Cartões de teste
Cartão	Comportamento
4242 4242 4242 4242	Pagamento aprovado
4000 0000 0000 0341	Falha sempre
4000 0025 0000 3155	Requer autenticação 3D Secure
CVV: qualquer 3 dígitos — Data: qualquer futura

TESTE 1 — Novo cliente (checkout completo)
Como testar: Acesse a página de planos e faça um checkout com cartão 4242 4242 4242 4242

Verificar:

 Clínica criada no banco (status = ATIVA)
 Usuário ADMIN_CLINICA criado
 stripeCustomerId e stripeSubscriptionId preenchidos
 Email de boas-vindas recebido com login e senha
 Login funciona com as credenciais recebidas
 dataExpiracao ~1 ano à frente
TESTE 2 — Renovação mensal (pagamento recorrente)
Como testar via Stripe CLI:


stripe trigger invoice.payment_succeeded
Verificar:

 dataExpiracao atualizada para +30 dias
 tokensConsumidos zerado
 tokensMensaisDisponiveis resetado para o valor do plano
 Email "Pagamento confirmado" recebido
 Status continua ATIVA
TESTE 3 — Falha de pagamento (Stripe ainda vai retentar)
Como testar via Stripe CLI:


stripe trigger invoice.payment_failed
Verificar:

 Pagamento registrado como PENDENTE no banco
 Status da clínica continua ATIVA (ainda tem retries)
 Email "Atenção: problema com seu pagamento" recebido
 Login ainda funciona normalmente
TESTE 4 — Suspensão (Stripe esgotou todas as tentativas)
Como testar: Simular invoice sem próximo retry:


stripe trigger invoice.payment_failed \
  --override invoice:next_payment_attempt=null
Verificar:

 Status da clínica → SUSPENSA
 Email "Sua conta foi suspensa" recebido
 Login bloqueado — ao tentar acessar qualquer API recebe erro 403
 Mensagem: "Conta suspensa por inadimplência. Regularize seu pagamento para continuar."
TESTE 5 — Reativação após suspensão
Como testar: Após TESTE 4, disparar pagamento bem-sucedido:


stripe trigger invoice.payment_succeeded
Verificar:

 Status da clínica → ATIVA
 dataExpiracao renovada
 Tokens resetados
 Email "Conta reativada" recebido (diferente do email de renovação normal)
 Login voltou a funcionar
TESTE 6 — Cancelamento de assinatura
Como testar via Stripe CLI:


stripe trigger customer.subscription.deleted
Ou pelo Billing Portal: cliente acessa e cancela manualmente.

Verificar:

 Status da clínica → INATIVA
 stripeSubscriptionId removido do banco
 Email "Assinatura cancelada" recebido com data de fim de acesso
 Login bloqueado — erro 403
 Mensagem: "Conta inativa. Entre em contato com o suporte."
TESTE 7 — Upgrade de plano (ex: Básico → Profissional)
Como testar: Login como ADMIN_CLINICA → Configurações → Assinatura → Upgrade

Verificar:

 planoId atualizado no banco
 tokensMensaisDisponiveis atualizado para o novo plano
 telemedicineHabilitada ativado (se for para Profissional)
 Email "Upgrade realizado" recebido
 Funcionalidades do novo plano disponíveis imediatamente
TESTE 8 — Downgrade de plano (ex: Profissional → Básico)
Como testar: Mesmo fluxo do upgrade, escolhendo plano menor

Verificar:

 planoId atualizado no banco
 tokensMensaisDisponiveis reduzido
 telemedicineHabilitada desativado
 Email "Plano alterado" recebido (não usa a palavra "Upgrade")
 Funcionalidades do plano removido bloqueadas
TESTE 9 — Billing Portal
Como testar: Login como ADMIN_CLINICA → Configurações → "Gerenciar Assinatura"

Verificar:

 Redireciona para página do Stripe (não dá erro 500)
 Mostra assinatura atual, próxima cobrança e forma de pagamento
 Permite trocar cartão
 Permite cancelar assinatura