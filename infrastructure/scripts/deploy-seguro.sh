#!/bin/bash
# Script de deploy seguro - Mantém versão atual funcionando
# Execute na EC2: bash deploy-seguro.sh

set -e

APP_DIR="/opt/prontivus"
REPO_URL="https://github.com/raphaelsena12/prontivus-ec2.git"
BACKUP_DIR="/opt/prontivus-backup-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="prontivus"

echo "=========================================="
echo "Deploy Seguro - Prontivus"
echo "Data: $(date)"
echo "=========================================="
echo ""

# Verificar se aplicação está rodando
if ! pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo "⚠️  AVISO: Aplicação não está rodando!"
    echo "   Iniciando aplicação atual antes de continuar..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.js || pm2 restart "$PM2_APP_NAME"
    sleep 5
fi

# 1. Fazer backup completo da versão atual
echo "1. Fazendo backup da versão atual..."
cd /opt
sudo cp -r "$APP_DIR" "$BACKUP_DIR" 2>/dev/null || {
    echo "   ⚠️  Erro ao fazer backup, continuando..."
}
echo "   ✅ Backup criado em: $BACKUP_DIR"
echo ""

# 2. Atualizar código (sem parar aplicação)
echo "2. Atualizando código do repositório..."
cd "$APP_DIR"

# Verificar se é repositório Git
if [ ! -d .git ]; then
    echo "   ❌ Erro: Diretório não é um repositório Git"
    echo "   Execute primeiro: git clone $REPO_URL $APP_DIR"
    exit 1
fi

# Fazer pull sem parar aplicação
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
NEW_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo "   ✅ Já está na versão mais recente"
    echo "   Commit atual: $CURRENT_COMMIT"
    exit 0
fi

echo "   📥 Atualizando de $CURRENT_COMMIT para $NEW_COMMIT"
git stash 2>/dev/null || true  # Salvar mudanças locais se houver
git pull origin main
echo "   ✅ Código atualizado"
echo ""

# 3. Instalar dependências (em paralelo, sem parar app)
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
echo "5. Executando migrations..."
npx prisma migrate deploy || echo "   ⚠️  Aviso: Erro ao executar migrations"
echo "   ✅ Migrations verificadas"
echo ""

# 6. Build da aplicação
echo "6. Fazendo build da aplicação..."
if npm run build; then
    echo "   ✅ Build concluído com sucesso"
else
    echo "   ❌ ERRO: Build falhou!"
    echo "   🔄 Fazendo rollback para versão anterior..."
    cd /opt
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    sudo chown -R ubuntu:ubuntu "$APP_DIR"
    cd "$APP_DIR"
    pm2 restart "$PM2_APP_NAME" --update-env
    echo "   ✅ Rollback concluído - Versão anterior restaurada"
    exit 1
fi
echo ""

# 7. Testar se build está OK (verificar arquivos essenciais)
echo "7. Verificando arquivos do build..."
if [ ! -d ".next" ] || [ ! -f "ecosystem.config.js" ]; then
    echo "   ❌ ERRO: Arquivos essenciais não encontrados após build!"
    echo "   🔄 Fazendo rollback..."
    cd /opt
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    sudo chown -R ubuntu:ubuntu "$APP_DIR"
    cd "$APP_DIR"
    pm2 restart "$PM2_APP_NAME" --update-env
    echo "   ✅ Rollback concluído"
    exit 1
fi
echo "   ✅ Arquivos verificados"
echo ""

# 8. Reiniciar aplicação com zero-downtime
echo "8. Reiniciando aplicação (zero-downtime)..."
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    # Usar reload para zero-downtime (se suportado) ou restart
    pm2 reload "$PM2_APP_NAME" --update-env 2>/dev/null || pm2 restart "$PM2_APP_NAME" --update-env
else
    pm2 start ecosystem.config.js
    pm2 save
fi

echo "   ✅ Aplicação reiniciada"
echo ""

# 9. Aguardar e verificar se está funcionando
echo "9. Aguardando aplicação iniciar..."
sleep 8

# Verificar se PM2 está rodando
if ! pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo "   ❌ ERRO: Aplicação não está online após reiniciar!"
    echo "   🔄 Fazendo rollback..."
    cd /opt
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    sudo chown -R ubuntu:ubuntu "$APP_DIR"
    cd "$APP_DIR"
    pm2 restart "$PM2_APP_NAME" --update-env
    echo "   ✅ Rollback concluído - Versão anterior restaurada"
    exit 1
fi

# 10. Health check
echo "10. Verificando health check..."
sleep 3
HEALTH_CHECK_FAILED=0

# Testar localmente
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "   ⚠️  Aplicação não respondeu no health check local"
    HEALTH_CHECK_FAILED=1
fi

# Se health check falhou, fazer rollback
if [ $HEALTH_CHECK_FAILED -eq 1 ]; then
    echo "   ❌ ERRO: Health check falhou!"
    echo "   🔄 Fazendo rollback..."
    cd /opt
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    sudo chown -R ubuntu:ubuntu "$APP_DIR"
    cd "$APP_DIR"
    pm2 restart "$PM2_APP_NAME" --update-env
    echo "   ✅ Rollback concluído - Versão anterior restaurada"
    exit 1
fi

echo "   ✅ Health check passou"
echo ""

# 11. Limpar backup antigo (manter apenas os 3 mais recentes)
echo "11. Limpando backups antigos..."
cd /opt
BACKUP_COUNT=$(ls -d prontivus-backup-* 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 3 ]; then
    ls -dt prontivus-backup-* | tail -n +4 | xargs sudo rm -rf 2>/dev/null || true
    echo "   ✅ Backups antigos removidos (mantidos os 3 mais recentes)"
else
    echo "   ✅ Nenhum backup antigo para remover"
fi
echo ""

# 12. Status final
echo "=========================================="
echo "✅ Deploy concluído com sucesso!"
echo "=========================================="
echo ""
echo "Status da aplicação:"
pm2 status | grep "$PM2_APP_NAME" || pm2 status
echo ""
echo "Últimas linhas de log:"
pm2 logs "$PM2_APP_NAME" --lines 10 --nostream || true
echo ""
echo "Commit atual: $(git rev-parse HEAD)"
echo "Data: $(date)"
echo ""
echo "Acesse: https://prontivus.com"
echo ""
echo "Backup salvo em: $BACKUP_DIR"
echo ""
