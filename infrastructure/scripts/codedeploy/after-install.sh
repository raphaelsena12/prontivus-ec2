#!/bin/bash
set -e

echo "[CodeDeploy] AfterInstall - Instalando dependências..."

cd /opt/prontivus

# Carregar secrets do Secrets Manager para ter DATABASE_URL disponível
echo "[CodeDeploy] Carregando secrets do Secrets Manager..."
export AWS_REGION="sa-east-1"
SECRETS=$(aws secretsmanager get-secret-value --secret-id "prontivus/production" --region sa-east-1 --query "SecretString" --output text)
export DATABASE_URL=$(echo "$SECRETS" | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d).DATABASE_URL))")
echo "[CodeDeploy] DATABASE_URL carregado"

# Instalar dependências
npm ci --legacy-peer-deps

# Gerar Prisma Client
npx prisma generate
mkdir -p lib/generated/prisma
echo "export * from './enums';" > lib/generated/prisma/index.ts

# Rodar migrations pendentes
npx prisma migrate deploy

# Criar pasta de logs se não existir
mkdir -p /opt/prontivus/logs

echo "[CodeDeploy] AfterInstall concluído"
