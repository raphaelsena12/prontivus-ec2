ls -la /opt/prontivus

# Verificar o status atual do PM2
pm2 status

# Verificar o commit atual
cd /opt/prontivus
git log --oneline -1
pwd


cd /opt/prontivus
git fetch origin
git log HEAD..origin/main --oneline

pm2 stop prontivus

# Verificar que parou
pm2 status

cd /opt/prontivus

# Copiar o arquivo .env para um local temporário (IMPORTANTE!)
sudo cp .env /tmp/prontivus.env

# Verificar se foi copiado
ls -la /tmp/prontivus.env


cd /opt

# Remover a pasta atual completamente
sudo rm -rf prontivus

# Verificar se foi removida
ls -la /opt/prontivus


cd /opt

# Clonar o repositório (a pasta será criada como prontivus)
sudo git clone https://github.com/raphaelsena12/prontivus-ec2.git prontivus

# Ajustar permissões
sudo chown -R ubuntu:ubuntu /opt/prontivus

# Verificar se foi clonado corretamente
ls -la /opt/prontivus
cd /opt/prontivus
git log --oneline -1

cd /opt/prontivus

# Copiar o arquivo .env do local temporário (IMPORTANTE!)
sudo cp /tmp/prontivus.env /opt/prontivus/.env

# Verificar se o .env foi copiado
ls -la .env

# Ajustar permissões do .env (pode estar como root após copiar com sudo)
sudo chown ubuntu:ubuntu .env
chmod 600 .env

# Verificar se as permissões estão corretas (deve mostrar: -rw------- 1 ubuntu ubuntu)
ls -la .env

# Remover o arquivo temporário (pode estar protegido, usar sudo)
sudo rm /tmp/prontivus.env

# Verificar se o arquivo temporário foi removido
ls -la /tmp/prontivus.env 2>&1 || echo "Arquivo temporário removido com sucesso"

# Verificar se o ecosystem.config.js está na raiz ou na pasta infrastructure
ls -la ecosystem.config.js 2>&1 || echo "ecosystem.config.js não está na raiz"
ls -la infrastructure/ecosystem.config.js

cd /opt/prontivus
npm ci --legacy-peer-deps

cd /opt/prontivus

# 1. Verificar se o Prisma Client foi gerado
ls -la lib/generated/prisma/
ls -la lib/generated/prisma/enums.ts

# 2. Se não existir, gerar o Prisma Client
npx prisma generate

# 3. Verificar se foi criado
ls -la lib/generated/prisma/enums.ts

# 4. Criar o arquivo index.ts (OBRIGATÓRIO)
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF

# 5. Verificar se o index.ts foi criado
ls -la lib/generated/prisma/index.ts
cat lib/generated/prisma/index.ts

# 6. Limpar cache do Next.js
rm -rf .next node_modules/.cache
rm -f tsconfig.tsbuildinfo

cd /opt/prontivus

# Instalar o pacote AWS SDK Polly
npm install @aws-sdk/client-polly --legacy-peer-deps

# Verificar se foi instalado
npm list @aws-sdk/client-polly


npx prisma migrate deploy

# Verificar status das migrations
npx prisma migrate status

rm -rf .next node_modules/.cache

# Fazer build do Next.js
npm run build

# Verificar se o build foi criado
ls -la .next

pm2 delete prontivus

# Iniciar com o arquivo de configuração (está em infrastructure/)
pm2 start infrastructure/ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Verificar status
pm2 status

# Ver logs recentes
pm2 logs prontivus --lines 30 --nostream