#!/bin/bash
set -e

echo "[CodeDeploy] BeforeInstall - Parando aplicação..."

# Parar PM2 se estiver rodando
if pm2 describe prontivus > /dev/null 2>&1; then
  pm2 stop prontivus
  echo "[CodeDeploy] PM2 parado"
else
  echo "[CodeDeploy] PM2 não estava rodando"
fi

# Limpar cache do Next.js
rm -rf /opt/prontivus/.next/cache 2>/dev/null || true

echo "[CodeDeploy] BeforeInstall concluído"
