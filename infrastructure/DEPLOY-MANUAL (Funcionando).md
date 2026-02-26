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

### 4. Fazer Backup da Versão Atual

```bash
# Voltar para /opt
cd /opt

# Criar backup com timestamp
sudo cp -r prontivus prontivus-backup-$(date +%Y%m%d-%H%M%S)

# Verificar se o backup foi criado
ls -la /opt/prontivus-backup-*

# Verificar tamanho do backup
du -sh /opt/prontivus-backup-*
```

### 5. Parar a Aplicação Temporariamente

```bash
# Parar o PM2
pm2 stop prontivus

# Verificar que parou
pm2 status
```

### 6. Renomear a Pasta Atual (Backup Adicional)

```bash
cd /opt
sudo mv prontivus prontivus-old-$(date +%Y%m%d-%H%M%S)

# Verificar
ls -la /opt/prontivus-old-*
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

### 8. Copiar Arquivos Importantes do Backup

```bash
cd /opt/prontivus

# Copiar o arquivo .env do backup (IMPORTANTE!)
sudo cp /opt/prontivus-old-*/.env /opt/prontivus/.env

# Verificar se o .env foi copiado
ls -la .env

# Ajustar permissões do .env
sudo chown ubuntu:ubuntu .env
chmod 600 .env

# Verificar se o ecosystem.config.js está na raiz ou na pasta infrastructure
ls -la ecosystem.config.js
ls -la infrastructure/ecosystem.config.js
```

### 9. Instalar Dependências

```bash
cd /opt/prontivus
npm ci --legacy-peer-deps

# Se der erro, tente:
# npm install --legacy-peer-deps
```

### 10. ⚠️ PROBLEMA COMUM: Gerar Prisma Client

**IMPORTANTE**: Este é um problema que já aconteceu antes. O Prisma Client precisa ser gerado ANTES do build E o arquivo `index.ts` precisa ser criado.

```bash
cd /opt/prontivus

# Gerar Prisma Client (isso criará os arquivos em lib/generated/prisma)
npx prisma generate

# Verificar se os arquivos foram criados
ls -la lib/generated/prisma/
ls -la lib/generated/prisma/enums.ts

# ⚠️ IMPORTANTE: Criar arquivo index.ts (Prisma não cria automaticamente)
# Este arquivo é necessário para que os imports funcionem
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF

# Verificar se o index.ts foi criado
ls -la lib/generated/prisma/index.ts

# Se os arquivos não existirem, verificar o schema
cat prisma/schema.prisma | head -10

# Validar o schema do Prisma
npx prisma validate

# Se ainda não funcionar, tentar com caminho explícito
npx prisma generate --schema=./prisma/schema.prisma
```

**Sintomas do problema**:
- Erro: `Module not found: Can't resolve '@/lib/generated/prisma'`
- Build falha com múltiplos erros de importação de tipos Prisma
- Erro: `the chunking context does not support external modules` (quando index.ts exporta client/models)

**Solução**: Sempre execute `npx prisma generate` e crie o `index.ts` (exportando apenas enums) antes de `npm run build`

**Nota**: O `index.ts` deve exportar APENAS `enums`, não `client` ou `models`, pois estes contêm código do servidor.

### 11. ⚠️ PROBLEMA COMUM: Instalar Pacote AWS SDK Polly

**IMPORTANTE**: Este é outro problema que já aconteceu antes. O pacote `@aws-sdk/client-polly` pode não estar no `package.json` ou não ser instalado corretamente.

```bash
cd /opt/prontivus

# Instalar o pacote AWS SDK Polly
npm install @aws-sdk/client-polly --legacy-peer-deps

# Verificar se foi instalado
npm list @aws-sdk/client-polly

# OU se preferir instalar todas as dependências novamente:
# npm ci --legacy-peer-deps
```

**Sintomas do problema**:
- Erro: `Module not found: Can't resolve '@aws-sdk/client-polly'`
- Build falha no arquivo `app/api/secretaria/text-to-speech/route.ts`

**Solução**: Sempre instale o pacote `@aws-sdk/client-polly` antes do build

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
# 1. Backup
cd /opt
sudo cp -r prontivus prontivus-backup-$(date +%Y%m%d-%H%M%S)

# 2. Parar aplicação
pm2 stop prontivus

# 3. Atualizar código
cd /opt/prontivus
git fetch origin
git reset --hard origin/main

# 4. Instalar dependências
npm ci --legacy-peer-deps

# 5. ⚠️ IMPORTANTE: Gerar Prisma Client (problema comum)
npx prisma generate

# 6. ⚠️ IMPORTANTE: Instalar AWS Polly (problema comum)
npm install @aws-sdk/client-polly --legacy-peer-deps

# 7. Prisma migrations
npx prisma migrate deploy

# 8. Build
rm -rf .next node_modules/.cache
npm run build

# 9. Reiniciar
pm2 restart prontivus --update-env

# 10. Verificar
pm2 status
pm2 logs prontivus --lines 20 --nostream
curl -I http://localhost:3000
```

---

## 🛡️ Rollback (Se Algo Der Errado)

```bash
# 1. Parar aplicação atual
pm2 stop prontivus

# 2. Remover versão com problema
cd /opt
sudo rm -rf prontivus

# 3. Restaurar backup
sudo mv prontivus-backup-YYYYMMDD-HHMMSS prontivus
# OU
sudo cp -r prontivus-backup-YYYYMMDD-HHMMSS prontivus

# 4. Ajustar permissões
sudo chown -R ubuntu:ubuntu prontivus

# 5. Reiniciar
cd prontivus
pm2 restart prontivus --update-env
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

### Limpeza de Backups

```bash
# Remover backups antigos (manter apenas os últimos 3)
cd /opt
ls -lt prontivus-backup-* | tail -n +4 | awk '{print $NF}' | xargs sudo rm -rf
ls -lt prontivus-old-* | tail -n +4 | awk '{print $NF}' | xargs sudo rm -rf
```

---

## ⚠️ Problemas Comuns e Soluções

### 🔴 Problema 1: Erro no Build - Prisma Client não encontrado

**Sintomas**:
```
Module not found: Can't resolve '@/lib/generated/prisma'
```

**Causa**: O Prisma Client não foi gerado antes do build OU o arquivo `index.ts` não existe.

**Solução**:
```bash
cd /opt/prontivus

# 1. Gerar Prisma Client
npx prisma generate

# 2. Verificar se foi criado
ls -la lib/generated/prisma/
ls -la lib/generated/prisma/enums.ts

# 3. Se não existir, validar schema
npx prisma validate

# 4. Tentar novamente
npx prisma generate --schema=./prisma/schema.prisma

# 5. ⚠️ IMPORTANTE: Criar arquivo index.ts se não existir
# O Prisma não cria automaticamente o index.ts, precisamos criar manualmente
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF

# 6. Verificar se o index.ts foi criado
ls -la lib/generated/prisma/index.ts

# 7. Limpar cache e fazer build novamente
rm -rf .next node_modules/.cache
rm -f tsconfig.tsbuildinfo
npm run build
```

**Nota Importante**: O arquivo `index.ts` deve exportar APENAS `enums`, não `client` ou `models`, pois estes contêm código do servidor que não pode ser usado no cliente.

**Prevenção**: Sempre execute `npx prisma generate` e crie o `index.ts` antes de `npm run build`

---

### 🔴 Problema 2: Erro no Build - AWS SDK Polly não encontrado

**Sintomas**:
```
Module not found: Can't resolve '@aws-sdk/client-polly'
```

**Causa**: O pacote `@aws-sdk/client-polly` não está instalado.

**Solução**:
```bash
cd /opt/prontivus

# 1. Instalar o pacote
npm install @aws-sdk/client-polly --legacy-peer-deps

# 2. Verificar se foi instalado
npm list @aws-sdk/client-polly

# 3. Limpar cache e fazer build novamente
rm -rf .next
npm run build
```

**Prevenção**: Sempre instale o pacote `@aws-sdk/client-polly` antes do build

---

### 🔴 Problema 3: Aplicação não inicia após deploy

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

### 🔴 Problema 4: Erro no build geral

**Sintomas**: Build falha com erros diversos

**Solução**:
```bash
cd /opt/prontivus

# 1. Limpar cache completamente
rm -rf .next node_modules/.cache

# 2. Reinstalar dependências
rm -rf node_modules
npm ci --legacy-peer-deps

# 3. Gerar Prisma Client
npx prisma generate

# 4. Instalar AWS Polly (se necessário)
npm install @aws-sdk/client-polly --legacy-peer-deps

# 5. Tentar build novamente
npm run build
```

---

### 🔴 Problema 5: Erro no Prisma Migrations

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

- [ ] Backup criado com sucesso
- [ ] Aplicação parada antes do deploy
- [ ] Pasta antiga renomeada/removida
- [ ] Repositório clonado corretamente
- [ ] Permissões ajustadas (ubuntu:ubuntu)
- [ ] Arquivo .env copiado e com permissões corretas
- [ ] Dependências instaladas sem erros
- [ ] **Prisma Client gerado** (⚠️ problema comum)
- [ ] **AWS SDK Polly instalado** (⚠️ problema comum)
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
# 1. Backup
cd /opt
sudo cp -r prontivus prontivus-backup-$(date +%Y%m%d-%H%M%S)

# 2. Parar aplicação
pm2 stop prontivus

# 3. Clonar/Atualizar
cd /opt
sudo mv prontivus prontivus-old-$(date +%Y%m%d-%H%M%S)
sudo git clone https://github.com/raphaelsena12/prontivus-ec2.git prontivus
sudo chown -R ubuntu:ubuntu /opt/prontivus

# 4. Copiar .env
cd /opt/prontivus
sudo cp /opt/prontivus-old-*/.env /opt/prontivus/.env
sudo chown ubuntu:ubuntu .env
chmod 600 .env

# 5. Instalar dependências
npm ci --legacy-peer-deps

# 6. ⚠️ GERAR PRISMA CLIENT (OBRIGATÓRIO)
npx prisma generate
ls -la lib/generated/prisma/

# 6.1. ⚠️ CRIAR INDEX.TS DO PRISMA (OBRIGATÓRIO)
cat > lib/generated/prisma/index.ts << 'EOF'
// Exportar apenas enums (tipos que podem ser usados no cliente e servidor)
export * from './enums';
EOF
ls -la lib/generated/prisma/index.ts

# 7. ⚠️ INSTALAR AWS POLLY (OBRIGATÓRIO)
npm install @aws-sdk/client-polly --legacy-peer-deps

# 8. Migrations
npx prisma migrate deploy

# 9. Build
rm -rf .next node_modules/.cache
npm run build

# 10. Reiniciar PM2
pm2 delete prontivus
pm2 start infrastructure/ecosystem.config.js
pm2 save

# 11. Verificar
pm2 status
pm2 logs prontivus --lines 20 --nostream
curl -I http://localhost:3000
```

---

## ⚠️ Importante

- ✅ **Sempre faça backup** antes de atualizar
- ✅ **Teste localmente** antes de fazer deploy em produção
- ✅ **Monitore logs** após cada deploy
- ✅ **Verifique health check** após reiniciar
- ✅ **Mantenha backups** dos últimos 3 deploys
- ✅ **Verifique o .env** antes de reiniciar
- ✅ **Confirme o caminho do ecosystem.config.js** (infrastructure/ecosystem.config.js)
- ⚠️ **SEMPRE gere o Prisma Client** antes do build
- ⚠️ **SEMPRE instale o AWS SDK Polly** antes do build

---

## 📝 Notas

- O arquivo `ecosystem.config.js` está localizado em `infrastructure/ecosystem.config.js`
- O arquivo `.env` deve ser copiado do backup e ter permissões 600
- O PM2 deve ser iniciado com o caminho completo: `infrastructure/ecosystem.config.js`
- Sempre use `npm ci --legacy-peer-deps` para instalar dependências em produção
- O build do Next.js cria a pasta `.next` que é necessária para produção
- **Problemas comuns**: Prisma Client (gerar + criar index.ts) e AWS SDK Polly - sempre verifique antes do build
- **Importante**: O arquivo `lib/generated/prisma/index.ts` deve exportar APENAS `enums`, não `client` ou `models`

---

**Última atualização**: 26 de Fevereiro de 2025  
**Repositório**: https://github.com/raphaelsena12/prontivus-ec2.git  
**Versão**: 1.1 - Inclui correção do Prisma Client (criação do index.ts)
