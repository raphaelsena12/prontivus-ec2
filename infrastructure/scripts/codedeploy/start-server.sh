#!/bin/bash
set -e

export PATH="/usr/local/bin:/usr/bin:/bin:/home/ubuntu/.nvm/versions/node/$(ls /home/ubuntu/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "[CodeDeploy] ApplicationStart - Iniciando servidor..."

cd /opt/prontivus

# Deletar processo antigo se existir
pm2 delete prontivus 2>/dev/null || true

# Iniciar com ecosystem.config.js
pm2 start infrastructure/ecosystem.config.js

# Salvar para auto-restart no reboot
pm2 save

echo "[CodeDeploy] Servidor iniciado"
