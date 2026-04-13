#!/bin/bash
set -e

echo "[CodeDeploy] AfterInstall - Instalando dependências..."

cd /opt/prontivus

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
