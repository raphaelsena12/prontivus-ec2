# Sistema de Email - Prontivus

Este diretório contém a implementação do sistema de envio de emails do Prontivus.

## Estrutura

```
lib/email/
├── smtp-service.ts          # Serviço SMTP (fallback)
├── ses-service.ts           # Serviço AWS SES (recomendado)
├── templates/               # Templates de email
│   └── agendamento-confirmacao.ts
├── index.ts                 # Exportações centralizadas
└── README.md                # Esta documentação
```

## Configuração

O sistema suporta dois métodos de envio de email:

### AWS SES (Recomendado)

Para usar AWS SES, configure as seguintes variáveis de ambiente:

- `USE_AWS_SES=true` - Ativa o uso do AWS SES
- `AWS_REGION` - Região da AWS (padrão: sa-east-1)
- `AWS_ACCESS_KEY_ID` - Access Key ID do IAM user
- `AWS_SECRET_ACCESS_KEY` - Secret Access Key do IAM user
- `SES_FROM_EMAIL` - Email remetente verificado no SES (padrão: noreply@prontivus.com)
- `SES_CONFIGURATION_SET` (opcional) - Configuration Set do SES para métricas

**Vantagens do AWS SES:**
- ✅ Custo muito baixo (~$0.10 por 1.000 emails)
- ✅ Retry automático com backoff exponencial
- ✅ Melhor deliverability
- ✅ Escalável e confiável
- ✅ Métricas no CloudWatch

### SMTP (Fallback)

Para usar SMTP tradicional, configure:

- `USE_AWS_SES=false` ou não defina a variável
- `SMTP_HOST` - Host do servidor SMTP (padrão: smtpout.secureserver.net)
- `SMTP_PORT` - Porta do servidor SMTP (padrão: 465)
- `SMTP_USER` - Usuário/email para autenticação SMTP
- `SMTP_PASSWORD` - Senha para autenticação SMTP

## Uso

### Enviar Email Genérico

```typescript
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "paciente@example.com",
  subject: "Assunto do Email",
  html: "<h1>Conteúdo HTML</h1>",
  text: "Conteúdo em texto simples (opcional)",
});
```

### Enviar Email de Confirmação de Agendamento

```typescript
import {
  sendEmail,
  gerarEmailConfirmacaoAgendamento,
  gerarEmailConfirmacaoAgendamentoTexto,
} from "@/lib/email";

const html = gerarEmailConfirmacaoAgendamento({
  pacienteNome: "João Silva",
  medicoNome: "Dr. Maria Santos",
  dataHora: new Date("2024-01-15T14:30:00"),
  tipoConsulta: "Consulta Médica",
  codigoTuss: "20101012",
  descricaoTuss: "Consulta médica em consultório",
  observacoes: "Chegar 15 minutos antes",
  clinicaNome: "Clínica Exemplo",
});

const texto = gerarEmailConfirmacaoAgendamentoTexto({
  // ... mesmos dados
});

await sendEmail({
  to: "paciente@example.com",
  subject: "Confirmação de Agendamento - Prontivus",
  html,
  text: texto,
});
```

### Enviar Email de Alteração de Agendamento

```typescript
import {
  sendEmail,
  gerarEmailAlteracaoAgendamento,
  gerarEmailAlteracaoAgendamentoTexto,
} from "@/lib/email";

const html = gerarEmailAlteracaoAgendamento({
  pacienteNome: "João Silva",
  medicoNome: "Dr. Maria Santos",
  dataHoraAnterior: new Date("2024-01-15T14:30:00"),
  dataHoraNova: new Date("2024-01-16T10:00:00"),
  tipoConsulta: "Consulta Médica",
  codigoTuss: "20101012",
  descricaoTuss: "Consulta médica em consultório",
  observacoes: "Nova data confirmada",
  clinicaNome: "Clínica Exemplo",
  motivoAlteracao: "Reagendamento solicitado pelo paciente",
});

const texto = gerarEmailAlteracaoAgendamentoTexto({
  // ... mesmos dados
});

await sendEmail({
  to: "paciente@example.com",
  subject: "Alteração de Agendamento - Prontivus",
  html,
  text: texto,
});
```

### Enviar Email de Cancelamento de Agendamento

```typescript
import {
  sendEmail,
  gerarEmailCancelamentoAgendamento,
  gerarEmailCancelamentoAgendamentoTexto,
} from "@/lib/email";

const html = gerarEmailCancelamentoAgendamento({
  pacienteNome: "João Silva",
  medicoNome: "Dr. Maria Santos",
  dataHora: new Date("2024-01-15T14:30:00"),
  tipoConsulta: "Consulta Médica",
  codigoTuss: "20101012",
  descricaoTuss: "Consulta médica em consultório",
  observacoes: "Agendamento cancelado",
  clinicaNome: "Clínica Exemplo",
  motivoCancelamento: "Cancelamento solicitado pelo paciente",
});

const texto = gerarEmailCancelamentoAgendamentoTexto({
  // ... mesmos dados
});

await sendEmail({
  to: "paciente@example.com",
  subject: "Cancelamento de Agendamento - Prontivus",
  html,
  text: texto,
});
```

## Templates Disponíveis

### Agendamento - Confirmação

Template de confirmação enviado automaticamente quando um agendamento é criado.

**Dados necessários:**
- `pacienteNome`: Nome do paciente
- `medicoNome`: Nome do médico
- `dataHora`: Data e hora do agendamento
- `tipoConsulta` (opcional): Tipo da consulta
- `codigoTuss` (opcional): Código TUSS
- `descricaoTuss` (opcional): Descrição do procedimento TUSS
- `observacoes` (opcional): Observações do agendamento
- `clinicaNome` (opcional): Nome da clínica

### Agendamento - Alteração

Template de alteração enviado automaticamente quando um agendamento é atualizado e a data/hora é alterada.

**Dados necessários:**
- `pacienteNome`: Nome do paciente
- `medicoNome`: Nome do médico
- `dataHoraAnterior`: Data e hora anterior do agendamento
- `dataHoraNova`: Nova data e hora do agendamento
- `tipoConsulta` (opcional): Tipo da consulta
- `codigoTuss` (opcional): Código TUSS
- `descricaoTuss` (opcional): Descrição do procedimento TUSS
- `observacoes` (opcional): Observações do agendamento
- `clinicaNome` (opcional): Nome da clínica
- `motivoAlteracao` (opcional): Motivo da alteração

### Agendamento - Cancelamento

Template de cancelamento enviado automaticamente quando um agendamento é cancelado.

**Dados necessários:**
- `pacienteNome`: Nome do paciente
- `medicoNome`: Nome do médico
- `dataHora`: Data e hora do agendamento cancelado
- `tipoConsulta` (opcional): Tipo da consulta
- `codigoTuss` (opcional): Código TUSS
- `descricaoTuss` (opcional): Descrição do procedimento TUSS
- `observacoes` (opcional): Observações do agendamento
- `clinicaNome` (opcional): Nome da clínica
- `motivoCancelamento` (opcional): Motivo do cancelamento

## Adicionando Novos Templates

1. Crie um novo arquivo em `lib/email/templates/`
2. Exporte funções para gerar HTML e texto do template
3. Exporte as funções em `lib/email/index.ts`
4. Use o template onde necessário

Exemplo:

```typescript
// lib/email/templates/novo-template.ts
export function gerarNovoTemplate(data: NovoTemplateData): string {
  return `... HTML ...`;
}

export function gerarNovoTemplateTexto(data: NovoTemplateData): string {
  return `... texto ...`;
}
```

## Envio Assíncrono (Não Bloqueante)

Para emails não críticos, você pode usar `sendEmailAsync` para não bloquear a resposta da API:

```typescript
import { sendEmailAsync } from "@/lib/email";

// Não bloqueia a execução
sendEmailAsync({
  to: "paciente@example.com",
  subject: "Notificação",
  html: "<p>Conteúdo</p>",
});

// A resposta da API é retornada imediatamente
return NextResponse.json({ success: true });
```

**Nota:** Use `sendEmailAsync` apenas para emails não críticos. Para emails críticos (como recuperação de senha), use `sendEmail` para garantir que foi enviado.

## Verificação de Conexão

Para verificar se a conexão está funcionando:

```typescript
import { verifySMTPConnection } from "@/lib/email";

const isConnected = await verifySMTPConnection();
if (isConnected) {
  console.log("Conexão de email configurada com sucesso!");
} else {
  console.error("Falha na configuração de email");
}
```

## Configuração AWS SES

### 1. Verificar Email/Domínio no SES

1. Acesse o Console AWS → SES → Verified identities
2. Clique em "Create identity"
3. Escolha "Email address" ou "Domain"
4. Siga as instruções para verificação

### 2. Criar IAM User

1. Acesse IAM → Users → Create user
2. Anexe a política `AmazonSESFullAccess` (ou política mais restritiva)
3. Crie Access Key e Secret Key
4. Adicione as credenciais no `.env`

### 3. Solicitar Saída do Sandbox (Produção)

- No SES, vá em "Account dashboard"
- Clique em "Request production access"
- Preencha o formulário e aguarde aprovação (24-48h)

### 4. (Opcional) Configuration Set

Para métricas e tracking avançado:
1. SES → Configuration sets → Create set
2. Configure event destinations (CloudWatch, SNS, etc.)
3. Adicione `SES_CONFIGURATION_SET` no `.env`
