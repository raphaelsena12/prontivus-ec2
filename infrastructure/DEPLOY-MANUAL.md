# Deploy Manual Seguro - Prontivus

## 🚀 Deploy Rápido (Recomendado)

Execute na EC2 sempre que houver novo commit:

```bash
cd /opt/prontivus
bash infrastructure/scripts/deploy-seguro.sh
```

Ou se o script não estiver no repositório:

```bash
# Copiar e colar este comando completo:
cd /opt/prontivus && \
git pull origin main && \
npm ci --legacy-peer-deps && \
npx prisma generate && \
npx prisma migrate deploy && \
npm run build && \
pm2 restart prontivus --update-env && \
sleep 5 && \
pm2 status && \
pm2 logs prontivus --lines 10 --nostream
```

## 🛡️ Deploy Seguro (Com Rollback Automático)

O script `deploy-seguro.sh` faz:

1. ✅ **Backup automático** da versão atual
2. ✅ **Atualiza código** sem parar aplicação
3. ✅ **Testa build** antes de reiniciar
4. ✅ **Health check** após reiniciar
5. ✅ **Rollback automático** se algo falhar
6. ✅ **Mantém versão atual funcionando** durante todo o processo

### Como usar:

```bash
# 1. Conectar na EC2
ssh -i prontivus-keypair.pem ubuntu@54.233.203.231

# 2. Executar deploy seguro
cd /opt/prontivus
bash infrastructure/scripts/deploy-seguro.sh
```

## 📋 Passo a Passo Manual

Se preferir fazer manualmente:

```bash
# 1. Conectar na EC2
cd /opt/prontivus

# 2. Fazer backup (opcional mas recomendado)
cd /opt
sudo cp -r prontivus prontivus-backup-$(date +%Y%m%d-%H%M%S)

# 3. Atualizar código
cd /opt/prontivus
git pull origin main

# 4. Instalar dependências
npm ci --legacy-peer-deps

# 5. Gerar Prisma Client
npx prisma generate

# 6. Executar migrations
npx prisma migrate deploy

# 7. Build
npm run build

# 8. Reiniciar aplicação
pm2 restart prontivus --update-env

# 9. Verificar status
pm2 status
pm2 logs prontivus --lines 20
```

## 🔄 Rollback Manual (Se necessário)

Se algo der errado e precisar voltar:

```bash
# 1. Ver backups disponíveis
ls -la /opt/prontivus-backup-*

# 2. Parar aplicação atual
pm2 stop prontivus

# 3. Restaurar backup
cd /opt
sudo rm -rf prontivus
sudo mv prontivus-backup-YYYYMMDD-HHMMSS prontivus
sudo chown -R ubuntu:ubuntu prontivus

# 4. Reiniciar
cd prontivus
pm2 restart prontivus --update-env
```

## 📊 Comandos Úteis

### Ver status
```bash
pm2 status
pm2 logs prontivus
pm2 monit
```

### Verificar se está respondendo
```bash
curl -I https://prontivus.com
curl -I http://localhost:3000
```

### Ver últimas mudanças
```bash
cd /opt/prontivus
git log --oneline -5
git show HEAD
```

### Verificar commit atual vs remoto
```bash
cd /opt/prontivus
git fetch origin
git log HEAD..origin/main --oneline
```

## ⚠️ Importante

- ✅ **Sempre faça backup** antes de atualizar
- ✅ **Teste localmente** antes de fazer deploy em produção
- ✅ **Monitore logs** após cada deploy
- ✅ **Verifique health check** após reiniciar
- ✅ **Mantenha backups** dos últimos 3 deploys

## 🔍 Troubleshooting

### Aplicação não inicia após deploy
```bash
# Ver logs de erro
pm2 logs prontivus --err

# Verificar se build foi feito
ls -la .next

# Verificar variáveis de ambiente
cat .env | grep -v "SECRET\|KEY\|PASSWORD"
```

### Erro no build
```bash
# Limpar cache e tentar novamente
rm -rf .next node_modules/.cache
npm run build
```

### Erro no Prisma
```bash
# Regenerar Prisma Client
npx prisma generate
npx prisma migrate deploy
```

## 📝 Checklist de Deploy

- [ ] Backup feito
- [ ] Código atualizado (`git pull`)
- [ ] Dependências instaladas
- [ ] Prisma Client gerado
- [ ] Migrations executadas
- [ ] Build concluído
- [ ] Aplicação reiniciada
- [ ] Health check passou
- [ ] Logs verificados
- [ ] Site acessível
