# Deploy Manual - Prontivus EC2 Ubuntu

Guia completo passo a passo para fazer deploy manual da aplicação Prontivus na EC2 Ubuntu usando PM2.

## 📋 Pré-requisitos

- Acesso SSH à EC2 Ubuntu
- PM2 instalado e configurado
- Node.js e npm instalados
- Git configurado
- Banco de dados PostgreSQL configurado

## 🔗 Informações do Repositório

- **URL do Repositório**: `https://github.com/raphaelsena12/prontivus-ec2.git`
- **Branch**: `main`
- **Pasta de Deploy**: `/opt/prontivus`

---

## 🚀 Passo a Passo Completo

### 1. Conectar na EC2

```bash
ssh -i prontivus-keypair.pem ubuntu@54.233.203.231
```

### 2. Localizar e Verificar a Pasta Atual

```bash
# Verificar se a pasta existe e onde está
ls -la /opt/prontivus

# Verificar o status atual do PM2
pm2 status

# Verificar o commit atual
cd /opt/prontivus
git log --oneline -1
pwd
```

### 3. Verificar Atualizações no Repositório Remoto

```bash
cd /opt/prontivus
git fetch origin
git log HEAD..origin/main --oneline
```

Este comando mostra os commits que estão no repositório remoto e não estão na versão local.

### 4. Parar a Aplicação Temporariamente

```bash
# Parar o PM2
pm2 stop prontivus

# Verificar que parou
pm2 status
```

### 5. Preservar Arquivo .env (IMPORTANTE!)

```bash
cd /opt/prontivus

# Copiar o arquivo .env para um local temporário (IMPORTANTE!)
sudo cp .env /tmp/prontivus.env

# Verificar se foi copiado
ls -la /tmp/prontivus.env
```

### 6. Remover a Pasta Atual

```bash
cd /opt

# Remover a pasta atual completamente
sudo rm -rf prontivus

# Verificar se foi removida
ls -la /opt/prontivus
```

### 7. Clonar a Nova Versão

```bash
# Voltar para /opt
cd /opt

# Clonar o repositório (a pasta será criada como prontivus)
sudo git clone https://github.com/raphaelsena12/prontivus-ec2.git prontivus

# Ajustar permissões
sudo chown -R ubuntu:ubuntu /opt/prontivus

# Verificar se foi clonado corretamente
ls -la /opt/prontivus
cd /opt/prontivus
git log --oneline -1
```

### 8. Restaurar Arquivo .env

```bash
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
```

### 9. Instalar Dependências

```bash
cd /opt/prontivus
npm ci --legacy-peer-deps

# Se der erro, tente:
# npm install --legacy-peer-deps
```

### 10. Gerar Prisma Client

**OBRIGATÓRIO**: O Prisma Client precisa ser gerado ANTES do build e o arquivo `index.ts` precisa ser criado.

```bash
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

```

**Nota Importante**: O `index.ts` deve exportar APENAS `enums`, não `client` ou `models`, pois estes contêm código do servidor que não pode ser usado no cliente.

### 11. Instalar Pacote AWS SDK Polly

**OBRIGATÓRIO**: O pacote `@aws-sdk/client-polly` é necessário para a funcionalidade de text-to-speech.

```bash
cd /opt/prontivus

# Instalar o pacote AWS SDK Polly
npm install @aws-sdk/client-polly --legacy-peer-deps

# Verificar se foi instalado
npm list @aws-sdk/client-polly
```

### 12. Executar Migrations do Banco

```bash
# Executar migrations do banco
npx prisma migrate deploy

# Verificar status das migrations
npx prisma migrate status
```

### 13. Build da Aplicação

```bash
# Limpar cache do Next.js (recomendado antes do build)
rm -rf .next node_modules/.cache

# Fazer build do Next.js
npm run build

# Verificar se o build foi criado
ls -la .next
```

### 14. Reiniciar a Aplicação no PM2

```bash
# Deletar processo antigo (se existir)
pm2 delete prontivus

# Iniciar com o arquivo de configuração (está em infrastructure/)
pm2 start infrastructure/ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Verificar status
pm2 status

# Ver logs recentes
pm2 logs prontivus --lines 30 --nostream
```

### 15. Verificar se Está Funcionando

```bash
# Verificar se está respondendo
curl -I http://localhost:3000

# Ver logs em tempo real (Ctrl+C para sair)
pm2 logs prontivus
```

### 16. Verificar as Mudanças Aplicadas

```bash
# Ver o que mudou
cd /opt/prontivus
git log --oneline -5

# Ver detalhes do último commit
git show HEAD --stat
```

---

## 🔄 Método Alternativo: Atualização com Git Pull

Se preferir atualizar sem clonar do zero (mais rápido):

```bash
# 1. Parar aplicação
pm2 stop prontivus

# 2. Atualizar código
cd /opt/prontivus
git fetch origin
git reset --hard origin/main

# 3. Instalar dependências
npm ci --legacy-peer-deps

# 4. Gerar Prisma Client (passo obrigatório)
npx prisma generate

# 4.1. Criar index.ts do Prisma (passo obrigatório)
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF

# 5. Instalar AWS SDK Polly (passo obrigatório)
npm install @aws-sdk/client-polly --legacy-peer-deps

# 6. Prisma migrations
npx prisma migrate deploy

# 7. Build
rm -rf .next node_modules/.cache
npm run build

# 8. Reiniciar
pm2 restart prontivus --update-env

# 9. Verificar
pm2 status
pm2 logs prontivus --lines 20 --nostream
curl -I http://localhost:3000
```

---

## 🛡️ Rollback (Se Algo Der Errado)

**Nota**: Como não fazemos backup, o rollback deve ser feito via Git:

```bash
# 1. Parar aplicação atual
pm2 stop prontivus

# 2. Voltar para commit anterior
cd /opt/prontivus
git log --oneline -5  # Ver commits disponíveis
git reset --hard <commit-hash-anterior>  # Substituir pelo hash do commit anterior

# 3. Reinstalar dependências (se necessário)
npm ci --legacy-peer-deps

# 4. Regenerar Prisma Client
npx prisma generate
cat > lib/generated/prisma/index.ts << 'EOF'
export * from './enums';
EOF

# 5. Rebuild
rm -rf .next node_modules/.cache
npm run build

# 6. Reiniciar
pm2 restart prontivus --update-env

# OU se preferir clonar novamente uma versão específica:
# cd /opt
# sudo rm -rf prontivus
# sudo git clone https://github.com/raphaelsena12/prontivus-ec2.git prontivus
# cd prontivus
# git checkout <commit-hash>
# sudo cp /tmp/prontivus.env .env  # Se tiver preservado o .env
```

---

## 📊 Comandos Úteis para Troubleshooting

### Ver Status e Logs

```bash
# Ver status do PM2
pm2 status

# Ver logs em tempo real
pm2 logs prontivus

# Ver últimas 20 linhas de log
pm2 logs prontivus --lines 20 --nostream

# Ver logs de erro
pm2 logs prontivus --err

# Monitorar recursos
pm2 monit

# Ver informações detalhadas
pm2 describe prontivus
```

### Verificar Processos e Portas

```bash
# Verificar processos Node
ps aux | grep node

# Verificar porta 3000
sudo netstat -tlnp | grep 3000

# Verificar se está respondendo
curl -I http://localhost:3000
curl -I https://prontivus.com
```

### Verificar Git e Commits

```bash
# Ver últimas mudanças
cd /opt/prontivus
git log --oneline -5

# Ver commit atual vs remoto
git fetch origin
git log HEAD..origin/main --oneline

# Ver detalhes do último commit
git show HEAD
```

### Limpeza de Espaço em Disco

```bash
# Limpar cache do npm
npm cache clean --force

# Limpar logs do PM2
pm2 flush

# Limpar pacotes não utilizados do sistema
sudo apt autoremove -y
sudo apt autoclean

# Limpar logs do sistema (últimos 7 dias)
sudo journalctl --vacuum-time=7d

# Verificar espaço disponível
df -h
```

---

## ⚠️ Problemas Comuns e Soluções

### 🔴 Problema 1: Aplicação não inicia após deploy

**Sintomas**: PM2 mostra status `errored` ou `stopped`

**Solução**:
```bash
# Ver logs de erro
pm2 logs prontivus --err

# Verificar se build foi feito
ls -la .next

# Verificar variáveis de ambiente
cat .env | grep -v "SECRET\|KEY\|PASSWORD"

# Verificar se o arquivo de configuração está correto
cat infrastructure/ecosystem.config.js

# Verificar permissões
ls -la /opt/prontivus
```

---

### 🔴 Problema 2: Erro no build geral

**Sintomas**: Build falha com erros diversos

**Solução**:
```bash
cd /opt/prontivus

# 1. Limpar cache completamente
rm -rf .next node_modules/.cache

# 2. Reinstalar dependências
rm -rf node_modules
npm ci --legacy-peer-deps

# 3. Gerar Prisma Client e criar index.ts
npx prisma generate
cat > lib/generated/prisma/index.ts << 'EOF'
export * from './enums';
EOF

# 4. Instalar AWS Polly
npm install @aws-sdk/client-polly --legacy-peer-deps

# 5. Tentar build novamente
npm run build
```

---

### 🔴 Problema 3: Erro no Prisma Migrations

**Sintomas**: `npx prisma migrate deploy` falha

**Solução**:
```bash
cd /opt/prontivus

# 1. Verificar conexão com banco
npx prisma db pull

# 2. Verificar status das migrations
npx prisma migrate status

# 3. Regenerar Prisma Client
npx prisma generate

# 4. Tentar migrations novamente
npx prisma migrate deploy

# 5. Se ainda falhar, verificar DATABASE_URL no .env
cat .env | grep DATABASE_URL
```

---

## ✅ Checklist de Deploy

Antes de finalizar, verifique:

- [ ] Arquivo .env preservado em /tmp antes de remover pasta
- [ ] Aplicação parada antes do deploy
- [ ] Pasta antiga removida completamente
- [ ] Repositório clonado corretamente
- [ ] Permissões ajustadas (ubuntu:ubuntu)
- [ ] Arquivo .env restaurado e com permissões corretas
- [ ] Dependências instaladas sem erros
- [ ] **Prisma Client gerado** (passo obrigatório)
- [ ] **Index.ts do Prisma criado** (passo obrigatório)
- [ ] **AWS SDK Polly instalado** (passo obrigatório)
- [ ] Migrations executadas
- [ ] Build concluído com sucesso
- [ ] PM2 iniciado/reiniciado
- [ ] Status do PM2 verificado (online)
- [ ] Logs verificados (sem erros críticos)
- [ ] Aplicação respondendo na porta 3000
- [ ] Site acessível externamente

---

## 📝 Sequência de Comandos Recomendada

Para evitar problemas, siga esta sequência EXATA:

```bash
# 1. Preservar .env
cd /opt/prontivus
sudo cp .env /tmp/prontivus.env

# 2. Parar aplicação
pm2 stop prontivus

# 3. Remover pasta atual
cd /opt
sudo rm -rf prontivus

# 4. Clonar nova versão
sudo git clone https://github.com/raphaelsena12/prontivus-ec2.git prontivus
sudo chown -R ubuntu:ubuntu /opt/prontivus

# 5. Restaurar .env
cd /opt/prontivus
sudo cp /tmp/prontivus.env /opt/prontivus/.env
sudo chown ubuntu:ubuntu .env
chmod 600 .env
# Verificar permissões (deve mostrar: -rw------- 1 ubuntu ubuntu)
ls -la .env
# Remover arquivo temporário (pode estar protegido, usar sudo)
sudo rm /tmp/prontivus.env

# 6. Instalar dependências
npm ci --legacy-peer-deps

# 7. Gerar Prisma Client
npx prisma generate
ls -la lib/generated/prisma/

# 7.1. Criar index.ts do Prisma
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF
ls -la lib/generated/prisma/index.ts

# 8. Instalar AWS SDK Polly
npm install @aws-sdk/client-polly --legacy-peer-deps

# 9. Migrations
npx prisma migrate deploy

# 10. Build
rm -rf .next node_modules/.cache
npm run build

# 11. Reiniciar PM2
pm2 delete prontivus
pm2 start infrastructure/ecosystem.config.js
pm2 save

# 12. Verificar
pm2 status
pm2 logs prontivus --lines 20 --nostream
curl -I http://localhost:3000
```

---

## ⚠️ Importante

- ✅ **SEMPRE preserve o .env** antes de remover a pasta (copiar para /tmp)
- ✅ **Teste localmente** antes de fazer deploy em produção
- ✅ **Monitore logs** após cada deploy
- ✅ **Verifique health check** após reiniciar
- ✅ **Verifique o .env** antes de reiniciar
- ✅ **Confirme o caminho do ecosystem.config.js** (infrastructure/ecosystem.config.js)
- ✅ **SEMPRE gere o Prisma Client** antes do build (passo obrigatório)
- ✅ **SEMPRE crie o index.ts do Prisma** antes do build (passo obrigatório - exportar apenas enums)
- ✅ **SEMPRE instale o AWS SDK Polly** antes do build (passo obrigatório)

---

## 📝 Notas

- O arquivo `ecosystem.config.js` está localizado em `infrastructure/ecosystem.config.js`
- O arquivo `.env` deve ser preservado antes de remover a pasta (copiar para /tmp) e restaurado após clonar, com permissões 600
- O PM2 deve ser iniciado com o caminho completo: `infrastructure/ecosystem.config.js`
- Sempre use `npm ci --legacy-peer-deps` para instalar dependências em produção
- O build do Next.js cria a pasta `.next` que é necessária para produção
- **Passos obrigatórios**: Sempre gere o Prisma Client, crie o index.ts (exportando apenas enums) e instale o AWS SDK Polly antes do build
- **Importante**: O arquivo `lib/generated/prisma/index.ts` deve exportar APENAS `enums`, não `client` ou `models`

---

**Última atualização**: 26 de Fevereiro de 2025  
**Repositório**: https://github.com/raphaelsena12/prontivus-ec2.git  
**Versão**: 1.3 - Prisma Client e AWS SDK Polly transformados em passos obrigatórios do processo (não mais como problemas/erros)
