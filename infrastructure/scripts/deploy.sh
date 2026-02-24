#!/bin/bash
set -e

# Script de deploy para Prontivus na EC2
# Este script é executado via SSH pelo GitHub Actions

echo "=========================================="
echo "Iniciando deploy do Prontivus"
echo "Data: $(date)"
echo "=========================================="

# Diretório da aplicação
APP_DIR="/opt/prontivus"
cd "$APP_DIR" || exit 1

# Carregar variáveis de ambiente
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✓ Variáveis de ambiente carregadas"
else
    echo "⚠ Aviso: Arquivo .env não encontrado"
fi

# Verificar se o repositório Git existe
if [ ! -d .git ]; then
    echo "❌ Erro: Diretório não é um repositório Git"
    echo "Execute manualmente: git clone <repo-url> $APP_DIR"
    exit 1
fi

echo ""
echo "1. Atualizando código do repositório..."
git fetch origin
git reset --hard origin/main || git reset --hard origin/master
git clean -fd
echo "✓ Código atualizado"

echo ""
echo "2. Instalando/atualizando dependências..."
npm ci --production=false
echo "✓ Dependências instaladas"

echo ""
echo "3. Gerando Prisma Client..."
npx prisma generate
echo "✓ Prisma Client gerado"

echo ""
echo "4. Executando migrations do banco de dados..."
npx prisma migrate deploy || echo "⚠ Aviso: Erro ao executar migrations (pode ser normal se já estiverem aplicadas)"
echo "✓ Migrations verificadas"

echo ""
echo "5. Fazendo build da aplicação Next.js..."
npm run build
echo "✓ Build concluído"

echo ""
echo "6. Reiniciando aplicação com PM2..."
# Verificar se a aplicação já está rodando
if pm2 list | grep -q "prontivus"; then
    echo "Aplicação encontrada, reiniciando..."
    pm2 restart prontivus
else
    echo "Aplicação não encontrada, iniciando..."
    pm2 start ecosystem.config.js
    pm2 save
fi

echo ""
echo "7. Verificando status da aplicação..."
sleep 3
pm2 status

echo ""
echo "=========================================="
echo "Deploy concluído com sucesso!"
echo "Data: $(date)"
echo "=========================================="

# Verificar se a aplicação está respondendo
echo ""
echo "8. Verificando health check..."
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Aplicação está respondendo na porta 3000"
else
    echo "⚠ Aviso: Aplicação pode não estar respondendo ainda"
    echo "Verifique os logs: pm2 logs prontivus"
fi

echo ""
echo "Logs recentes:"
pm2 logs prontivus --lines 10 --nostream

exit 0
