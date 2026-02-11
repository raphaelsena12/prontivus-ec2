# Integração WhatsApp Business API - Prontivus

Este módulo fornece integração completa com a WhatsApp Business API da Meta para envio e recebimento de mensagens.

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Criando Conta e Configurando WhatsApp](#criando-conta-e-configurando-whatsapp)
3. [Variáveis de Ambiente](#variáveis-de-ambiente)
4. [Uso da API](#uso-da-api)
5. [Webhook](#webhook)
6. [Exemplos](#exemplos)

## 🚀 Configuração Inicial

### Pré-requisitos

- Conta no Meta for Developers (Facebook Developers)
- Número de telefone para WhatsApp Business
- Acesso ao Meta Business Manager

## 📱 Criando Conta e Configurando WhatsApp

### Passo 1: Criar Conta no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Faça login com sua conta do Facebook
3. Clique em **"Meus Apps"** no canto superior direito
4. Clique em **"Criar App"**
5. Selecione o tipo de app: **"Business"**
6. Preencha:
   - **Nome do App**: Ex: "Prontivus WhatsApp"
   - **Email de contato**: Seu email
   - **Finalidade do app**: Selecione conforme sua necessidade
7. Clique em **"Criar App"**

### Passo 2: Adicionar Produto WhatsApp

1. No painel do seu app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Configurar"** ou **"Set Up"**
3. Você será redirecionado para o WhatsApp Business API

### Passo 3: Configurar WhatsApp Business API

1. **Criar Número de Telefone de Teste** (para desenvolvimento):
   - No painel do WhatsApp, você verá uma seção "Número de telefone de teste"
   - Clique em **"Adicionar número de telefone"**
   - Um número de teste será gerado automaticamente
   - Anote este número (você precisará dele)

2. **Obter Token de Acesso Temporário**:
   - No painel, vá em **"API Setup"** ou **"Configuração da API"**
   - Você verá um **"Temporary access token"**
   - Este token expira em 24 horas (para produção, você precisará criar um token permanente)

3. **Obter Phone Number ID**:
   - No painel, vá em **"API Setup"**
   - Procure por **"Phone number ID"** ou **"ID do número de telefone"**
   - Anote este ID

### Passo 4: Configurar Webhook

1. No painel do WhatsApp, vá em **"Configuration"** ou **"Configuração"**
2. Role até a seção **"Webhook"**
3. Clique em **"Configurar webhook"** ou **"Edit"**
4. Preencha:
   - **URL do Callback**: `https://seu-dominio.com/api/whatsapp/webhook`
   - **Token de verificação**: Crie um token seguro (ex: use um gerador de senha)
   - Anote este token (será a variável `WHATSAPP_VERIFY_TOKEN`)
5. Clique em **"Verificar e salvar"**
6. Em **"Campos de assinatura"**, selecione:
   - ✅ `messages`
   - ✅ `message_status`

### Passo 5: Obter Token Permanente (Produção)

Para produção, você precisa criar um token de acesso permanente:

1. **Criar App no Meta Business Manager**:
   - Acesse [Meta Business Manager](https://business.facebook.com/)
   - Crie uma conta comercial ou use uma existente
   - Vá em **"Configurações"** > **"Integrações"** > **"Aplicativos"**
   - Adicione seu app criado anteriormente

2. **Criar Sistema de Usuário**:
   - No Meta Business Manager, vá em **"Configurações"** > **"Usuários"**
   - Adicione um usuário do sistema (System User)
   - Dê permissões de **"WhatsApp Business Management API"**

3. **Gerar Token do Sistema**:
   - No painel do app, vá em **"Tools"** > **"Graph API Explorer"**
   - Selecione seu app
   - Selecione o usuário do sistema criado
   - Gere um token com as permissões:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Este token pode ser configurado para não expirar

### Passo 6: Verificar Número de Telefone (Produção)

Para usar um número real (não de teste):

1. No painel do WhatsApp, vá em **"Números de telefone"**
2. Clique em **"Adicionar número de telefone"**
3. Siga o processo de verificação:
   - Você receberá um código via SMS ou chamada
   - Digite o código para verificar
4. Após verificação, o número estará disponível para uso

## 🔐 Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
WHATSAPP_VERIFY_TOKEN=seu_verify_token_aqui
WHATSAPP_API_VERSION=v21.0
```

### Onde encontrar cada valor:

- **WHATSAPP_PHONE_NUMBER_ID**: No painel do WhatsApp, em "API Setup" > "Phone number ID"
- **WHATSAPP_ACCESS_TOKEN**: No painel do WhatsApp, em "API Setup" > "Temporary access token" (dev) ou token do sistema (produção)
- **WHATSAPP_VERIFY_TOKEN**: O token que você criou ao configurar o webhook
- **WHATSAPP_API_VERSION**: Versão da API (padrão: v21.0, verifique a versão mais recente)

## 💻 Uso da API

### Enviar Mensagem de Texto

```typescript
import { sendWhatsAppMessage } from "@/lib/whatsapp";

await sendWhatsAppMessage({
  to: "5511999999999", // Código do país + DDD + número (sem espaços ou caracteres especiais)
  message: "Olá! Sua consulta foi confirmada para amanhã às 14h.",
});
```

### Enviar Mensagem com Template

Templates são necessários para enviar mensagens fora da janela de 24 horas após a última interação do usuário.

```typescript
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

await sendWhatsAppTemplate({
  to: "5511999999999",
  templateId: "confirmacao_agendamento", // Nome do template aprovado no Meta
  templateParams: ["João Silva", "15/01/2024", "14:00"], // Parâmetros do template
});
```

### Via API REST

```bash
POST /api/whatsapp/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "5511999999999",
  "message": "Sua mensagem aqui",
  "pacienteId": "uuid-do-paciente", // Opcional: para salvar no banco
  "clinicaId": "uuid-da-clinica"    // Opcional: para salvar no banco
}
```

## 🔔 Webhook

O webhook está configurado em `/api/whatsapp/webhook` e processa automaticamente:

- **Mensagens recebidas**: Salva no banco de dados e associa ao paciente
- **Status de mensagens**: Atualiza status de entrega/leitura

### Configuração do Webhook no Meta

1. URL: `https://seu-dominio.com/api/whatsapp/webhook`
2. Token de verificação: O mesmo configurado em `WHATSAPP_VERIFY_TOKEN`
3. Campos de assinatura:
   - `messages`
   - `message_status`

## 📝 Exemplos

### Exemplo 1: Enviar Confirmação de Agendamento

```typescript
import { sendWhatsAppMessage } from "@/lib/whatsapp";

async function enviarConfirmacaoAgendamento(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHora: Date
) {
  const mensagem = `Olá ${pacienteNome}!\n\n` +
    `Sua consulta foi confirmada para ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.\n\n` +
    `Por favor, chegue com 15 minutos de antecedência.\n\n` +
    `Qualquer dúvida, estamos à disposição!`;

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}
```

### Exemplo 2: Enviar Lembrete de Consulta

```typescript
import { sendWhatsAppMessage } from "@/lib/whatsapp";

async function enviarLembreteConsulta(
  pacienteTelefone: string,
  pacienteNome: string,
  dataHora: Date
) {
  const mensagem = `Olá ${pacienteNome}!\n\n` +
    `Este é um lembrete: você tem uma consulta agendada para amanhã (${dataHora.toLocaleDateString('pt-BR')}) às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.\n\n` +
    `Nos vemos em breve!`;

  await sendWhatsAppMessage({
    to: pacienteTelefone,
    message: mensagem,
  });
}
```

### Exemplo 3: Integração com Agendamento

```typescript
// Em uma rota de API de agendamento
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const { pacienteId, dataHora } = await request.json();
  
  // Buscar paciente
  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
  });

  if (paciente?.telefone) {
    // Enviar WhatsApp
    await sendWhatsAppMessage({
      to: paciente.telefone,
      message: `Sua consulta foi agendada para ${dataHora.toLocaleDateString('pt-BR')}`,
    });
  }

  // ... resto do código
}
```

## ⚠️ Limitações e Boas Práticas

### Janela de 24 Horas

- Você pode enviar mensagens gratuitas dentro de 24 horas após a última mensagem do usuário
- Fora dessa janela, você DEVE usar templates aprovados pelo Meta
- Templates precisam ser criados e aprovados no painel do WhatsApp Business

### Formato de Número

- Sempre use o formato internacional: `5511999999999`
- Remova espaços, parênteses, hífens
- Inclua código do país (55 para Brasil) + DDD + número

### Rate Limits

- A API tem limites de taxa (rate limits)
- Para números de teste: ~250 mensagens/dia
- Para números verificados: limites maiores (verifique no painel)

### Custos

- **Janela de 24h**: Gratuito
- **Templates**: Verifique os preços atuais no [site da Meta](https://developers.facebook.com/docs/whatsapp/pricing)
- Geralmente cobrado por conversa (conversation)

## 🔍 Troubleshooting

### Erro: "Invalid OAuth access token"

- Verifique se o token não expirou
- Para produção, use token do sistema (não expira)

### Erro: "Phone number not found"

- Verifique se o `WHATSAPP_PHONE_NUMBER_ID` está correto
- Confirme que o número está verificado no painel

### Webhook não recebe mensagens

- Verifique se a URL está acessível publicamente
- Confirme que o `WHATSAPP_VERIFY_TOKEN` está correto
- Verifique os logs do servidor

### Mensagem não é entregue

- Verifique se o número do destinatário está no formato correto
- Confirme que o número está registrado no WhatsApp
- Verifique se não está bloqueado

## 📚 Recursos Adicionais

- [Documentação Oficial WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Guia de Início Rápido](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Referência da API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- [Criar Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

## 🆘 Suporte

Para problemas específicos:
1. Verifique os logs do servidor
2. Consulte a documentação oficial da Meta
3. Verifique o status da API no [status do Facebook](https://developers.facebook.com/status/)
