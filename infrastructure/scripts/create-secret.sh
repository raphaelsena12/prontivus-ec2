#!/bin/bash
# ============================================
# Cria o secret "prontivus/production" no AWS Secrets Manager
# Uso: bash create-secret.sh
# ============================================

set -euo pipefail

SECRET_NAME="prontivus/production"
REGION="${AWS_REGION:-sa-east-1}"

echo "=== Criando secret '$SECRET_NAME' na região '$REGION' ==="
echo ""
echo "ATENÇÃO: Edite os valores abaixo antes de executar!"
echo ""

# Montar o JSON com todas as variáveis sensíveis
# IMPORTANTE: Substitua os valores pelos reais antes de executar
SECRET_JSON=$(cat <<'ENDJSON'
{
  "DATABASE_URL": "postgresql://postgres:SUA_SENHA@seu-host-rds.sa-east-1.rds.amazonaws.com:5432/db-prontivus-new",
  "NEXTAUTH_URL": "https://prontivus.com",
  "NEXTAUTH_SECRET": "SEU_NEXTAUTH_SECRET",
  "AWS_ACCESS_KEY_ID": "SUA_ACCESS_KEY",
  "AWS_SECRET_ACCESS_KEY": "SUA_SECRET_KEY",
  "AWS_CHIME_REGION": "us-east-1",
  "AWS_CHIME_MEDIA_REGION": "sa-east-1",
  "USE_AWS_SES": "true",
  "SMTP_HOST": "smtpout.secureserver.net",
  "SMTP_PORT": "465",
  "SMTP_USER": "suporte@prontivus.com",
  "SMTP_PASSWORD": "SUA_SENHA_SMTP",
  "OPENAI_API_KEY": "SUA_OPENAI_KEY",
  "OPENAI_MODEL": "gpt-4o",
  "STRIPE_PUBLISHABLE_KEY": "SUA_STRIPE_PK",
  "STRIPE_SECRET_KEY": "SUA_STRIPE_SK",
  "STRIPE_WEBHOOK_SECRET": "SEU_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_BASICO": "price_xxx",
  "STRIPE_PRICE_ID_INTERMEDIARIO": "price_xxx",
  "STRIPE_PRICE_ID_PROFISSIONAL": "price_xxx",
  "CRON_SECRET": "SEU_CRON_SECRET",
  "PFX_PASSWORD_ENC_KEY": "SUA_PFX_KEY",
  "FIELD_ENCRYPTION_KEY": "SUA_FIELD_KEY",
  "WHATSAPP_VERIFY_TOKEN": "SEU_WHATSAPP_TOKEN"
}
ENDJSON
)

# Verificar se o secret já existe
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" 2>/dev/null; then
  echo ""
  echo "Secret já existe. Atualizando..."
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION"
  echo "Secret atualizado com sucesso!"
else
  echo ""
  echo "Criando novo secret..."
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Variáveis de ambiente de produção do Prontivus" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION"
  echo "Secret criado com sucesso!"
fi

echo ""
echo "=== Próximos passos ==="
echo "1. Verifique o secret no console AWS: https://sa-east-1.console.aws.amazon.com/secretsmanager/"
echo "2. A EC2 precisa de uma IAM Role com permissão para ler este secret"
echo "3. Crie a policy com:"
echo ""
cat <<'EOF'
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
EOF
echo ""
echo "4. Associe essa policy a uma IAM Role e atribua ao EC2 (Instance Profile)"
