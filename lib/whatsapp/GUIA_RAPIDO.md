# 🚀 Guia Rápido - Configuração WhatsApp Business API

Este guia fornece os passos essenciais para configurar o WhatsApp Business API no Prontivus.

## ⚡ Passos Rápidos

### 1. Criar App no Meta for Developers

1. Acesse: https://developers.facebook.com/
2. Login com conta Facebook
3. **Meus Apps** → **Criar App** → Tipo: **Business**
4. Nome: "Prontivus WhatsApp"

### 2. Adicionar WhatsApp ao App

1. No painel do app, procure **"WhatsApp"**
2. Clique em **"Configurar"** ou **"Set Up"**

### 3. Obter Credenciais

No painel do WhatsApp, vá em **"API Setup"** e anote:

- ✅ **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
- ✅ **Temporary access token** → `WHATSAPP_ACCESS_TOKEN` (válido por 24h)

### 4. Configurar Webhook

1. No painel, vá em **"Configuration"** → **"Webhook"**
2. Clique em **"Configurar webhook"**
3. Preencha:
   - **URL**: `https://seu-dominio.com/api/whatsapp/webhook`
   - **Token**: Crie um token seguro (ex: `meu_token_secreto_123`)
   - Anote este token → `WHATSAPP_VERIFY_TOKEN`
4. Em **"Campos de assinatura"**, selecione:
   - ✅ `messages`
   - ✅ `message_status`
5. Clique em **"Verificar e salvar"**

### 5. Configurar Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_access_token
WHATSAPP_VERIFY_TOKEN=seu_verify_token
WHATSAPP_API_VERSION=v21.0
```

### 6. Testar Envio

```typescript
import { sendWhatsAppMessage } from "@/lib/whatsapp";

await sendWhatsAppMessage({
  to: "5511999999999", // Código país + DDD + número
  message: "Teste de mensagem WhatsApp!",
});
```

## 📝 Formato do Número

- ✅ Correto: `5511999999999` (55 = Brasil, 11 = DDD, 999999999 = número)
- ❌ Errado: `(11) 99999-9999` ou `+55 11 99999-9999`

**Dica**: Sempre remova espaços, parênteses e hífens.

## 🔑 Token Permanente (Produção)

O token temporário expira em 24h. Para produção:

1. Crie conta no **Meta Business Manager**
2. Adicione seu app ao Business Manager
3. Crie um **System User** com permissões WhatsApp
4. Gere token do sistema (não expira)

**Documentação completa**: Veja `README.md` para detalhes.

## ⚠️ Importante

- **Janela de 24h**: Mensagens gratuitas apenas dentro de 24h após última mensagem do usuário
- **Templates**: Fora da janela, use templates aprovados pelo Meta
- **Rate Limits**: Números de teste têm limite de ~250 mensagens/dia

## 🆘 Problemas Comuns

### "Invalid OAuth access token"
→ Token expirou. Gere novo token ou use token permanente.

### "Phone number not found"
→ Verifique se `WHATSAPP_PHONE_NUMBER_ID` está correto.

### Webhook não funciona
→ Verifique se a URL está acessível publicamente e o token está correto.

## 📚 Próximos Passos

1. Leia o `README.md` completo para detalhes
2. Configure templates para mensagens fora da janela de 24h
3. Integre com o sistema de agendamentos
4. Configure token permanente para produção










1. Criar conta no Meta for Developers
Acesse developers.facebook.com
Faça login com sua conta Facebook (pode ser pessoal)
Clique em "Meus Apps" → "Criar App"
Tipo: Business
Associe a um Meta Business Manager (criar em business.facebook.com se não tiver)
2. Adicionar WhatsApp ao App
No painel do app, vá em "Adicionar produto" → WhatsApp → Configurar
Isso cria automaticamente um número de teste (sandbox)
3. Obter as credenciais (modo sandbox)
Em WhatsApp → Configuração da API:

Phone Number ID → copiar e colar na página de Configurações do Prontivus
Access Token temporário → válido por 24h (bom para testes)
Para token permanente:

Vá em Configurações → Usuários do Sistema → Criar usuário do sistema (Admin)
Gere um token com permissão whatsapp_business_messaging
Esse token não expira
4. Configurar o Webhook
No painel do app, WhatsApp → Configuração → Webhooks:

URL do callback: https://seudominio.com/api/whatsapp/webhook
Token de verificação: qualquer string — adicione no .env como WHATSAPP_VERIFY_TOKEN=essa_string
Assinar os campos: messages
5. Adicionar número de teste (sandbox)
Em WhatsApp → Configuração da API, há um botão "Adicionar número de telefone"
No sandbox, você precisa registrar os números que vão receber as mensagens de teste (até 5 números)
Envie a mensagem de opt-in para cada número pelo próprio painel
6. Para produção (sair do sandbox)
Requisito	Como fazer
Business Verification	Submeter CNPJ/documentos em business.facebook.com/settings
Aprovação do app	No painel do app → Revisão do app → solicitar whatsapp_business_messaging
Número de produção	Adicionar número real da clínica (recebe OTP por SMS/ligação)
Resumo do que configurar no .env

WHATSAPP_VERIFY_TOKEN=qualquer_string_que_voce_escolher
# As outras credenciais ficam no banco por clínica (não precisam de .env)
Tempo estimado:

Sandbox funcionando: ~30 minutos
Business verification + produção: 3-7 dias úteis (Meta faz revisão manual)
Quer ajuda para configurar o webhook URL ou o .env?