#!/bin/bash
set -e

export PATH="/usr/local/bin:/usr/bin:/bin:/home/ubuntu/.nvm/versions/node/$(ls /home/ubuntu/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "[CodeDeploy] ValidateService - Verificando se a aplicação está saudável..."

# Aguardar o servidor iniciar (Next.js precisa de alguns segundos)
sleep 10

# Verificar se o PM2 está rodando
if ! pm2 describe prontivus | grep -q "online"; then
  echo "[CodeDeploy] ERRO: PM2 não está online!"
  pm2 logs prontivus --lines 20 --nostream
  exit 1
fi

# Health check via HTTP
RETRY=0
MAX_RETRIES=6

while [ $RETRY -lt $MAX_RETRIES ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "307" ]; then
    echo "[CodeDeploy] Health check OK (HTTP $HTTP_CODE)"
    echo "[CodeDeploy] Deploy concluído com sucesso!"
    exit 0
  fi

  RETRY=$((RETRY + 1))
  echo "[CodeDeploy] Tentativa $RETRY/$MAX_RETRIES - HTTP $HTTP_CODE, aguardando 5s..."
  sleep 5
done

echo "[CodeDeploy] ERRO: Health check falhou após $MAX_RETRIES tentativas"
pm2 logs prontivus --lines 30 --nostream
exit 1
