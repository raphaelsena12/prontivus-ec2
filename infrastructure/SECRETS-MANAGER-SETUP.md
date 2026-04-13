# Migração para AWS Secrets Manager

## Visão geral

Os secrets de produção do Prontivus são armazenados no **AWS Secrets Manager** em vez de um arquivo `.env` no servidor. Isso elimina credenciais em texto plano no EC2 e no repositório.

### Como funciona

1. O `server.ts` chama `loadSecrets()` **antes** de inicializar o Next.js
2. A função conecta ao Secrets Manager usando a **IAM Role do EC2** (sem credenciais hardcoded)
3. As variáveis são injetadas no `process.env`
4. Se falhar, a aplicação usa o `.env` local como fallback

---

## Passo 1: Criar a IAM Policy

No console AWS (IAM > Policies > Create Policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:sa-east-1:*:secret:prontivus/production-*"
    }
  ]
}
```

Nome sugerido: `ProntivusSecretsReadOnly`

## Passo 2: Criar/Atualizar a IAM Role do EC2

1. Vá em **IAM > Roles**
2. Se o EC2 já tem uma role, adicione a policy `ProntivusSecretsReadOnly`
3. Se não tem, crie uma nova role:
   - Trusted entity: **EC2**
   - Attach policy: `ProntivusSecretsReadOnly`
   - Nome: `ProntivusEC2Role`

## Passo 3: Associar a Role ao EC2

1. Vá em **EC2 > Instances > Sua instância**
2. Actions > Security > **Modify IAM Role**
3. Selecione `ProntivusEC2Role`
4. Save

## Passo 4: Criar o secret

No EC2 (ou na sua máquina com AWS CLI configurado):

```bash
# Edite o script com os valores reais ANTES de executar
nano infrastructure/scripts/create-secret.sh

# Executar
bash infrastructure/scripts/create-secret.sh
```

Ou diretamente no console AWS:
1. Vá em **Secrets Manager > Store a new secret**
2. Secret type: **Other type of secret**
3. Key/value: adicione cada variável
4. Secret name: `prontivus/production`
5. Region: `sa-east-1`

## Passo 5: Configurar o EC2

No servidor EC2, o `.env` fica mínimo:

```bash
# Copiar o template
cp .env.production.example .env

# Editar apenas o NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
nano .env
```

## Passo 6: Deploy e teste

```bash
# Instalar nova dependência
npm ci --legacy-peer-deps

# Rebuild
npm run build

# Reiniciar
pm2 restart prontivus

# Verificar logs (deve mostrar "[Secrets] X variáveis carregadas")
pm2 logs prontivus --lines 20 --nostream
```

---

## Rollback

Se precisar voltar ao `.env` completo:

1. Restaure o `.env` com todas as variáveis no EC2
2. Adicione `SKIP_SECRETS_MANAGER=true` no `.env`
3. `pm2 restart prontivus`

---

## Variáveis no Secrets Manager

| Variável | Descrição |
|----------|-----------|
| DATABASE_URL | URL de conexão do PostgreSQL (RDS) |
| NEXTAUTH_SECRET | Secret para JWT do NextAuth |
| NEXTAUTH_URL | URL pública da aplicação |
| AWS_ACCESS_KEY_ID | Credencial AWS (para S3, SES, Polly, etc.) |
| AWS_SECRET_ACCESS_KEY | Secret da credencial AWS |
| AWS_CHIME_REGION | Região do Chime SDK |
| AWS_CHIME_MEDIA_REGION | Região de mídia do Chime |
| USE_AWS_SES | Flag para usar SES |
| SMTP_HOST | Host do servidor SMTP |
| SMTP_PORT | Porta SMTP |
| SMTP_USER | Usuário SMTP |
| SMTP_PASSWORD | Senha SMTP |
| OPENAI_API_KEY | Chave da API OpenAI |
| OPENAI_MODEL | Modelo OpenAI |
| STRIPE_PUBLISHABLE_KEY | Chave publicável do Stripe |
| STRIPE_SECRET_KEY | Chave secreta do Stripe |
| STRIPE_WEBHOOK_SECRET | Secret do webhook Stripe |
| STRIPE_PRICE_ID_BASICO | ID do preço plano Básico |
| STRIPE_PRICE_ID_INTERMEDIARIO | ID do preço plano Intermediário |
| STRIPE_PRICE_ID_PROFISSIONAL | ID do preço plano Profissional |
| CRON_SECRET | Secret para autenticação dos cron jobs |
| PFX_PASSWORD_ENC_KEY | Chave de encriptação de certificados |
| FIELD_ENCRYPTION_KEY | Chave de encriptação de campos sensíveis |
| WHATSAPP_VERIFY_TOKEN | Token de verificação do webhook WhatsApp |

## Variáveis que NÃO vão no Secrets Manager

| Variável | Motivo | Onde fica |
|----------|--------|----------|
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Injetada no build (client-side) | `.env` no EC2 |
| AWS_REGION | Necessária para conectar ao Secrets Manager | `ecosystem.config.js` |
| AWS_SECRET_NAME | Nome do secret a carregar | `ecosystem.config.js` |
| NODE_ENV | Config de runtime | `ecosystem.config.js` |
