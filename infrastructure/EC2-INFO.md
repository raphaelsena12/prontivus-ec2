# Informações da EC2 - Prontivus

## ✅ Stack Criada com Sucesso!

### Informações da Infraestrutura

- **Stack Name**: `prontivus-stack`
- **Region**: `sa-east-1`
- **Status**: `CREATE_COMPLETE` ✅

### Informações da EC2

- **IP Público**: `56.125.239.99`
- **DNS Público**: `ec2-56-125-239-99.sa-east-1.compute.amazonaws.com`
- **Instance ID**: `i-0a30a703eaae6874b`
- **Instance Type**: `t3.small`
- **Sistema Operacional**: Ubuntu 22.04 LTS

### URLs

- **URL da Aplicação**: http://56.125.239.99:3000
- **NextAuthURL**: http://56.125.239.99:3000 (atualizado)

### Recursos Criados

- **VPC ID**: `vpc-01a4620e2649fdd5b`
- **Security Group ID**: `sg-085e991c3d539e5bf`
- **Elastic IP**: `56.125.239.99` (IP estático)

---

## 📋 Próximos Passos

### Passo 1: Conectar na EC2 via SSH

**No Windows (Git Bash ou WSL):**
```bash
ssh -i prontivus-keypair.pem ubuntu@56.125.239.99
```

**No Windows (PowerShell com OpenSSH):**
```powershell
ssh -i prontivus-keypair.pem ubuntu@56.125.239.99
```

**Nota**: Se você estiver usando PuTTY, converta o arquivo .pem para .ppk primeiro.

### Passo 2: Verificar Instalações

Após conectar, verifique se tudo foi instalado corretamente:

```bash
# Verificar Node.js
node --version  # Deve mostrar v20.x.x

# Verificar npm
npm --version

# Verificar PM2
pm2 --version

# Verificar Git
git --version

# Verificar Nginx
nginx -v
```

### Passo 3: Configurar Variáveis de Ambiente

Edite o arquivo `.env` na EC2:

```bash
sudo nano /opt/prontivus/.env
```

Copie todas as variáveis do seu `.env` local. O arquivo já foi criado pelo User Data, mas você precisa adicionar todas as variáveis necessárias:

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://postgres:AmGRLans3P2RLFv8pyky@db-prontivus-new.crka8siog2ay.sa-east-1.rds.amazonaws.com:5432/db-prontivus-new
NEXTAUTH_URL=http://56.125.239.99:3000
NEXTAUTH_SECRET=d0sULqJedg07lq0gsU+cbmMsiLrZqz0P9Z4pb2fEsck=

# AWS
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=prontivus-documentos

# OpenAI (se usar)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-3.5-turbo

# Stripe (se usar)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY

# SMTP (se usar)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_USER=suporte@prontivus.com
SMTP_PASSWORD=ef&!.UHq=7D9k!m

# Next.js
NEXT_DISABLE_TURBO=1
TURBOPACK=0
NEXT_WEBPACK=1
```

Salve o arquivo (Ctrl+O, Enter, Ctrl+X no nano).

### Passo 4: Clonar Repositório na EC2

```bash
cd /opt/prontivus

# Se o diretório não estiver vazio, limpe primeiro
sudo rm -rf * .[^.]* 2>/dev/null || true

# Clone o repositório
sudo git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git .

# Ajustar permissões
sudo chown -R ubuntu:ubuntu /opt/prontivus
```

**Importante**: Substitua `SEU-USUARIO/SEU-REPOSITORIO` pelo caminho real do seu repositório GitHub.

### Passo 5: Primeiro Deploy Manual

```bash
cd /opt/prontivus

# Garantir que o script de deploy é executável
chmod +x infrastructure/scripts/deploy.sh

# Instalar dependências
npm ci

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate deploy

# Build da aplicação
npm run build

# Copiar ecosystem.config.js para o diretório raiz (se necessário)
cp infrastructure/ecosystem.config.js ecosystem.config.js

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando que aparecer (algo como: sudo env PATH=...)
```

### Passo 6: Verificar se a Aplicação Está Rodando

```bash
# Ver status do PM2
pm2 status

# Ver logs
pm2 logs prontivus

# Testar localmente na EC2
curl http://localhost:3000
```

### Passo 7: Configurar GitHub Secrets

No repositório GitHub:

1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

   - **EC2_SSH_KEY**: 
     - Abra o arquivo `prontivus-keypair.pem`
     - Copie TODO o conteúdo (incluindo `-----BEGIN RSA PRIVATE KEY-----` e `-----END RSA PRIVATE KEY-----`)
     - Cole no secret

   - **EC2_HOST**: `56.125.239.99`
   
   - **EC2_USER**: `ubuntu`

### Passo 8: Testar Pipeline GitHub Actions

1. Faça um commit e push para a branch `main` ou `master`
2. Vá em **Actions** no GitHub
3. O workflow deve iniciar automaticamente
4. Verifique os logs para garantir que o deploy foi bem-sucedido

---

## 🔧 Comandos Úteis

### Gerenciar Aplicação

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs prontivus

# Reiniciar
pm2 restart prontivus

# Parar
pm2 stop prontivus

# Monitorar
pm2 monit
```

### Verificar Logs

```bash
# Logs do PM2
pm2 logs prontivus --lines 50

# Logs do sistema
journalctl -u nginx -f

# Logs de instalação
cat /var/log/prontivus-setup.log
```

### Atualizar Aplicação Manualmente

```bash
cd /opt/prontivus
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart prontivus
```

---

## 🔒 Segurança

- O Security Group está configurado para permitir SSH (porta 22) e HTTP (porta 3000) de qualquer IP
- Considere restringir o SSH para seu IP específico no Security Group
- Mantenha a chave SSH segura - ela não pode ser recuperada se perdida

---

## 📞 Troubleshooting

### Não consigo conectar via SSH

1. Verifique se o Security Group permite SSH do seu IP
2. Verifique se a chave SSH está correta
3. Verifique se a EC2 está rodando

### Aplicação não inicia

1. Verifique os logs: `pm2 logs prontivus`
2. Verifique as variáveis de ambiente: `cat /opt/prontivus/.env`
3. Verifique se o banco está acessível: `psql $DATABASE_URL`

### Erro no build

1. Limpe o cache: `rm -rf .next node_modules`
2. Reinstale: `npm ci`
3. Tente novamente: `npm run build`

---

## ✅ Checklist Final

- [ ] Stack CloudFormation criada
- [ ] Conectado na EC2 via SSH
- [ ] Variáveis de ambiente configuradas
- [ ] Repositório clonado na EC2
- [ ] Primeiro deploy manual executado
- [ ] Aplicação rodando e acessível
- [ ] GitHub Secrets configurados
- [ ] Pipeline GitHub Actions testado

---

**Última atualização**: 2026-02-24
**IP Público**: 56.125.239.99
