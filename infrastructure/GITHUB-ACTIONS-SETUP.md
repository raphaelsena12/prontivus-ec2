# Configuração GitHub Actions para Deploy Automático

## 📋 Pré-requisitos

1. Repositório no GitHub
2. EC2 com acesso SSH configurado
3. Chave SSH para acesso à EC2

## 🔐 Passo 1: Configurar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione os seguintes secrets:

### Secret 1: `EC2_SSH_KEY`
- **Name**: `EC2_SSH_KEY`
- **Value**: Conteúdo completo da chave SSH privada (`.pem` ou `.ppk` convertido)
- **Como obter**:
  ```bash
  # No Windows (PowerShell)
  Get-Content C:\caminho\para\prontivus-keypair.pem | Out-String
  
  # Copie TODO o conteúdo, incluindo:
  # -----BEGIN RSA PRIVATE KEY-----
  # ... (todo o conteúdo) ...
  # -----END RSA PRIVATE KEY-----
  ```

### Secret 2: `EC2_HOST`
- **Name**: `EC2_HOST`
- **Value**: IP público da EC2 ou domínio
- **Exemplo**: `54.233.203.231` ou `prontivus.com`

### Secret 3: `EC2_USER`
- **Name**: `EC2_USER`
- **Value**: Usuário SSH da EC2
- **Exemplo**: `ubuntu` (para Ubuntu)

## 📝 Passo 2: Verificar Workflow

O arquivo `.github/workflows/deploy.yml` já está configurado e irá:

1. ✅ Executar automaticamente em commits na branch `main` ou `master`
2. ✅ Permitir execução manual via **Actions** → **Deploy para EC2** → **Run workflow**
3. ✅ Fazer checkout do código
4. ✅ Conectar na EC2 via SSH
5. ✅ Executar o script de deploy (`infrastructure/scripts/deploy.sh`)
6. ✅ Verificar status da aplicação
7. ✅ Fazer health check

## 🚀 Passo 3: Testar o Deploy

### Opção 1: Commit e Push (Automático)

```bash
# Fazer uma mudança qualquer
echo "# Teste deploy" >> README.md

# Commit e push
git add .
git commit -m "test: deploy automático"
git push origin main
```

O GitHub Actions irá executar automaticamente!

### Opção 2: Execução Manual

1. Acesse **Actions** no GitHub
2. Selecione **Deploy para EC2**
3. Clique em **Run workflow**
4. Selecione a branch (`main` ou `master`)
5. Clique em **Run workflow**

## 📊 Passo 4: Monitorar Deploy

1. Acesse **Actions** no GitHub
2. Clique no workflow em execução
3. Veja os logs em tempo real
4. Verifique se todos os steps passaram (✅)

## 🔍 Troubleshooting

### Erro: "Permission denied (publickey)"

**Solução**: Verifique se o secret `EC2_SSH_KEY` está correto:
- Deve incluir as linhas `-----BEGIN` e `-----END`
- Não deve ter espaços extras
- Deve ser a chave privada completa

### Erro: "Host key verification failed"

**Solução**: O workflow já adiciona o host automaticamente. Se persistir, verifique o `EC2_HOST`.

### Erro: "Directory not a git repository"

**Solução**: Na EC2, execute:
```bash
cd /opt/prontivus
sudo git clone <URL_DO_REPOSITORIO> .
sudo chown -R ubuntu:ubuntu /opt/prontivus
```

### Erro: "npm ci failed"

**Solução**: O script usa `--legacy-peer-deps`. Se ainda falhar, verifique os logs.

## 📋 O que o Deploy faz

1. ✅ Atualiza código do repositório (`git pull`)
2. ✅ Instala/atualiza dependências (`npm ci`)
3. ✅ Gera Prisma Client (`npx prisma generate`)
4. ✅ Executa migrations (`npx prisma migrate deploy`)
5. ✅ Faz build da aplicação (`npm run build`)
6. ✅ Reinicia aplicação com PM2 (`pm2 restart`)
7. ✅ Verifica status e health check

## 🔄 Fluxo Completo

```
Commit no GitHub
    ↓
GitHub Actions detecta push
    ↓
Workflow inicia
    ↓
Conecta na EC2 via SSH
    ↓
Executa script de deploy
    ↓
Aplicação atualizada e reiniciada
    ↓
Health check verifica se está funcionando
    ↓
✅ Deploy concluído!
```

## 🎯 Próximos Passos

Após configurar os secrets:

1. Faça um commit de teste
2. Verifique se o deploy executou automaticamente
3. Acesse `https://prontivus.com` para verificar se está atualizado
4. Configure notificações (opcional) para receber avisos de deploy

## 📝 Notas Importantes

- ⚠️ O script de deploy usa `git reset --hard`, então mudanças locais na EC2 serão perdidas
- ⚠️ Certifique-se de que o `.env` na EC2 está configurado corretamente
- ⚠️ O deploy reinicia a aplicação, causando um breve downtime (geralmente < 30 segundos)
- ✅ O PM2 reinicia automaticamente em caso de erro
- ✅ Logs estão disponíveis em `/opt/prontivus/logs/`
