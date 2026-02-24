# Status do Deploy - Prontivus

## ✅ Passos Concluídos

### 1. ✅ Chave SSH Criada
- Nome: `prontivus-keypair`
- Status: Criada na AWS

### 2. ✅ Parâmetros Preparados
- Arquivo: `infrastructure/cloudformation/parameters.json`
- Valores extraídos do `.env`:
  - DatabaseURL: Configurado
  - NextAuthSecret: Configurado
  - AWS Credentials: Configurados
  - S3BucketName: `prontivus-documentos`

### 3. ✅ Stack CloudFormation Criada
- Stack Name: `prontivus-stack`
- Region: `sa-east-1`
- Status: `CREATE_IN_PROGRESS` ⏳
- Stack ID: `arn:aws:cloudformation:sa-east-1:983740383268:stack/prontivus-stack/dcaafac0-11bd-11f1-a8f3-064275e8650f`
- **Correção aplicada**: AMI atualizado para `ami-03a79217ca48f4d1e` (Ubuntu 22.04 LTS)

**Recursos sendo criados:**
- ✅ VPC
- ✅ Internet Gateway
- ✅ Subnets Públicas
- ✅ Security Groups
- ✅ IAM Role
- ⏳ Elastic IP
- ⏳ EC2 Instance (t3.small Ubuntu)

## ✅ Stack Criada com Sucesso!

**Status**: `CREATE_COMPLETE` ✅

**IP Público da EC2**: `56.125.239.99`
**URL da Aplicação**: http://56.125.239.99:3000

Veja o arquivo `infrastructure/EC2-INFO.md` para informações completas e próximos passos.

## ⏳ Próximos Passos (Aguardando Configuração)

A stack está sendo criada. Isso pode levar **5-10 minutos**.

### Como Verificar o Status

Execute o script de verificação:

```powershell
.\infrastructure\cloudformation\check-stack-status.ps1
```

Ou via AWS CLI:

```bash
aws cloudformation describe-stacks --stack-name prontivus-stack --region sa-east-1 --query "Stacks[0].StackStatus" --output text
```

### Quando a Stack Estiver Pronta

O script `check-stack-status.ps1` irá mostrar:
- IP Público da EC2
- DNS Público
- URL da Aplicação
- Próximos passos

## 📋 Próximos Passos (Após Stack Criada)

### Passo 4: Obter IP Público da EC2

Execute:
```powershell
.\infrastructure\cloudformation\check-stack-status.ps1
```

Anote o **IP Público** exibido.

### Passo 5: Conectar na EC2 via SSH

```bash
ssh -i prontivus-keypair.pem ubuntu@<IP_PUBLICO>
```

**Nota**: Se estiver no Windows, você pode usar:
- Git Bash
- WSL (Windows Subsystem for Linux)
- PuTTY (convertendo o .pem para .ppk)

### Passo 6: Configurar Variáveis de Ambiente na EC2

Após conectar na EC2:

```bash
# Editar arquivo .env
sudo nano /opt/prontivus/.env
```

Copie todas as variáveis do seu `.env` local para o arquivo na EC2.

### Passo 7: Clonar Repositório na EC2

```bash
cd /opt/prontivus
sudo git clone https://github.com/seu-usuario/seu-repositorio.git .
sudo chown -R ubuntu:ubuntu /opt/prontivus
```

### Passo 8: Primeiro Deploy Manual

```bash
cd /opt/prontivus

# Garantir permissões
chmod +x infrastructure/scripts/deploy.sh

# Instalar dependências
npm ci

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate deploy

# Build da aplicação
npm run build

# Iniciar com PM2
pm2 start infrastructure/ecosystem.config.js
pm2 save
pm2 startup
```

### Passo 9: Configurar GitHub Secrets

No repositório GitHub:
1. Settings > Secrets and variables > Actions
2. Adicione:
   - `EC2_SSH_KEY`: Conteúdo do arquivo `prontivus-keypair.pem`
   - `EC2_HOST`: IP público da EC2
   - `EC2_USER`: `ubuntu`

### Passo 10: Testar Pipeline

Faça um commit e push para testar o deploy automático!

## 🔗 Links Úteis

- **Console CloudFormation**: https://console.aws.amazon.com/cloudformation/home?region=sa-east-1#/stacks
- **Console EC2**: https://console.aws.amazon.com/ec2/v2/home?region=sa-east-1#Instances:

## 📝 Notas

- A stack pode levar 5-10 minutos para ser criada completamente
- Após criar, você terá um IP público estático (Elastic IP)
- O NextAuthURL precisa ser atualizado após obter o IP público
- Mantenha a chave SSH segura - ela não pode ser recuperada se perdida
