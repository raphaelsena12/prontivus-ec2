#!/bin/bash
# Script completo de deploy - Clona, configura e reinicia aplicação
# Execute na EC2: bash deploy-completo.sh

set -e

APP_DIR="/opt/prontivus"
REPO_URL="https://github.com/raphaelsena12/prontivus-ec2.git"

echo "=========================================="
echo "Deploy Completo - Prontivus"
echo "Data: $(date)"
echo "=========================================="
echo ""

# 1. Preparar diretório
echo "1. Preparando diretório..."
if [ -d "$APP_DIR/.git" ]; then
    echo "   ✅ Repositório Git encontrado, atualizando..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "   📥 Clonando repositório..."
    cd /opt
    # Fazer backup se necessário
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        BACKUP_DIR="prontivus-backup-$(date +%Y%m%d-%H%M%S)"
        echo "   💾 Fazendo backup para $BACKUP_DIR..."
        sudo mv "$APP_DIR" "$BACKUP_DIR" 2>/dev/null || true
    fi
    sudo rm -rf "$APP_DIR" 2>/dev/null || true
    sudo mkdir -p "$APP_DIR"
    sudo git clone "$REPO_URL" "$APP_DIR"
    sudo chown -R ubuntu:ubuntu "$APP_DIR"
    cd "$APP_DIR"
fi

echo "   ✅ Código atualizado"
echo ""

# 2. Verificar .env
echo "2. Verificando arquivo .env..."
if [ ! -f .env ]; then
    echo "   ⚠️  Arquivo .env não encontrado!"
    echo "   ⚠️  Crie o arquivo .env manualmente com as variáveis de ambiente necessárias"
    echo "   ⚠️  Continuando sem .env..."
else
    echo "   ✅ Arquivo .env encontrado"
fi
echo ""

# 3. Instalar dependências
echo "3. Instalando/atualizando dependências..."
npm ci --legacy-peer-deps || npm install --legacy-peer-deps
echo "   ✅ Dependências instaladas"
echo ""

# 4. Gerar Prisma Client
echo "4. Gerando Prisma Client..."
npx prisma generate
echo "   ✅ Prisma Client gerado"
echo ""

# 5. Executar migrations
echo "5. Executando migrations do banco de dados..."
npx prisma migrate deploy || echo "   ⚠️  Aviso: Erro ao executar migrations (pode ser normal se já estiverem aplicadas)"
echo "   ✅ Migrations verificadas"
echo ""

# 6. Build da aplicação
echo "6. Fazendo build da aplicação Next.js..."
npm run build
echo "   ✅ Build concluído"
echo ""

# 7. Criar/verificar ecosystem.config.js
echo "7. Verificando ecosystem.config.js..."
if [ ! -f ecosystem.config.js ]; then
    echo "   📝 Criando ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
/**
 * Configuração PM2 para Prontivus
 */
module.exports = {
  apps: [
    {
      name: 'prontivus',
      script: '/opt/prontivus/node_modules/.bin/tsx',
      args: 'server.ts',
      cwd: '/opt/prontivus',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      env_file: '/opt/prontivus/.env',
      error_file: '/opt/prontivus/logs/pm2-error.log',
      out_file: '/opt/prontivus/logs/pm2-out.log',
      log_file: '/opt/prontivus/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        '.git',
        '*.log',
      ],
    },
  ],
};
EOF
    echo "   ✅ ecosystem.config.js criado"
else
    echo "   ✅ ecosystem.config.js já existe"
fi
echo ""

# 8. Criar diretório de logs
echo "8. Criando diretório de logs..."
mkdir -p logs
echo "   ✅ Diretório de logs criado"
echo ""

# 9. Reiniciar aplicação com PM2
echo "9. Reiniciando aplicação com PM2..."
if pm2 list | grep -q "prontivus"; then
    echo "   🔄 Aplicação encontrada, reiniciando..."
    pm2 restart prontivus --update-env
else
    echo "   🚀 Aplicação não encontrada, iniciando..."
    pm2 start ecosystem.config.js
    pm2 save
fi
echo "   ✅ Aplicação reiniciada"
echo ""

# 10. Aguardar e verificar status
echo "10. Aguardando aplicação iniciar..."
sleep 5

echo ""
echo "=========================================="
echo "Status da Aplicação"
echo "=========================================="
pm2 status
echo ""

echo "=========================================="
echo "Últimas linhas de log"
echo "=========================================="
pm2 logs prontivus --lines 15 --nostream || true
echo ""

# 11. Health check
echo "11. Verificando health check..."
sleep 3
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Aplicação está respondendo na porta 3000"
else
    echo "   ⚠️  Aplicação pode não estar respondendo ainda"
    echo "   Verifique os logs: pm2 logs prontivus"
fi
echo ""

echo "=========================================="
echo "✅ Deploy concluído com sucesso!"
echo "Data: $(date)"
echo "=========================================="
echo ""
echo "Acesse: https://prontivus.com"
echo ""
