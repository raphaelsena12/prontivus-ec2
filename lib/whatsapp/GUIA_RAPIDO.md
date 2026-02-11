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
