#!/bin/bash
set -e

echo "[CodeDeploy] ApplicationStart - Iniciando servidor..."

cd /opt/prontivus

# Deletar processo antigo se existir
pm2 delete prontivus 2>/dev/null || true

# Iniciar com ecosystem.config.js
pm2 start infrastructure/ecosystem.config.js

# Salvar para auto-restart no reboot
pm2 save

echo "[CodeDeploy] Servidor iniciado"
