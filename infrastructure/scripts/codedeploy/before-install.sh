#!/bin/bash
set -e

export PATH="/usr/local/bin:/usr/bin:/bin:/home/ubuntu/.nvm/versions/node/$(ls /home/ubuntu/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "[CodeDeploy] BeforeInstall - Preparando deploy..."

# NÃO parar o PM2 aqui — servidor antigo continua rodando
# Se o deploy falhar antes do start-server.sh, o site não cai

# Limpar cache do Next.js
rm -rf /opt/prontivus/.next/cache 2>/dev/null || true

echo "[CodeDeploy] BeforeInstall concluído"
