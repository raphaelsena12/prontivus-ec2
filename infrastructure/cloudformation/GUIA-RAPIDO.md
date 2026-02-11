# 🚀 Guia Rápido - Deploy Completo

Este guia mostra como criar a infraestrutura e fazer deploy do projeto Prontivus na AWS.

## Pré-requisitos

1. **AWS CLI instalado e configurado**
   ```bash
   aws configure
   ```

2. **Key Pair criado na AWS**
   ```bash
   # Criar novo key pair
   aws ec2 create-key-pair --key-name prontivus-key --query 'KeyMaterial' --output text > ~/.ssh/prontivus-key.pem
   chmod 400 ~/.ssh/prontivus-key.pem
   ```

3. **Banco de dados PostgreSQL** (RDS ou externo)

4. **NextAuth Secret gerado**
   ```bash
   openssl rand -base64 32
   ```

## Opção 1: Deploy Automatizado Completo (Recomendado)

O script `deploy-complete.sh` faz tudo automaticamente: cria a infraestrutura e envia o código.

```bash
cd infrastructure/cloudformation
./deploy-complete.sh
```

O script irá solicitar:
- Environment (production/staging/development)
- Stack Name
- AWS Region
- Key Pair Name
- Database URL
- NextAuth Secret
- NextAuth URL
- Stripe Secret Key (opcional)
- AWS Credentials (opcional)
- VPC/Subnet IDs (opcional)
- Git Repository URL (opcional - se não fornecer, faz upload via SCP)

## Opção 2: Deploy Manual em Etapas

### Passo 1: Criar Infraestrutura

```bash
cd infrastructure/cloudformation
./deploy-ec2-standard.sh production prontivus-ec2-prod my-key-pair
```

### Passo 2: Obter IP Público

```bash
PUBLIC_IP=$(aws cloudformation describe-stacks \
  --stack-name prontivus-ec2-prod \
  --region sa-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text)

echo $PUBLIC_IP
```

### Passo 3: Aguardar Instância Estar Pronta

Aguarde 2-3 minutos para a instância inicializar.

### Passo 4: Upload do Código

```bash
# Via SCP
scp -r -i ~/.ssh/my-key-pair.pem \
  ../../../* \
  ec2-user@$PUBLIC_IP:/opt/prontivus/

# Ou via SSH e Git
ssh -i ~/.ssh/my-key-pair.pem ec2-user@$PUBLIC_IP
cd /opt/prontivus
git clone <seu-repositorio> .
```

### Passo 5: Configurar e Iniciar

```bash
ssh -i ~/.ssh/my-key-pair.pem ec2-user@$PUBLIC_IP

cd /opt/prontivus
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## Verificar Status

```bash
# Ver status da aplicação
ssh -i ~/.ssh/my-key-pair.pem ec2-user@$PUBLIC_IP 'pm2 status'

# Ver logs
ssh -i ~/.ssh/my-key-pair.pem ec2-user@$PUBLIC_IP 'pm2 logs prontivus'

# Testar health check
curl http://$PUBLIC_IP:3000/api/health
```

## Troubleshooting

### Instância não responde

1. Verificar se Security Group permite SSH (porta 22)
2. Verificar se instância está rodando
3. Verificar logs do User Data: `ssh ... 'sudo cat /var/log/user-data.log'`

### Aplicação não inicia

1. Verificar logs do PM2: `pm2 logs prontivus`
2. Verificar variáveis de ambiente: `cat /opt/prontivus/.env`
3. Verificar se Node.js está instalado: `node --version`
4. Verificar se build foi feito: `ls -la /opt/prontivus/.next`

### Erro de conexão com banco

1. Verificar DATABASE_URL no .env
2. Verificar Security Group do RDS permite conexão da EC2
3. Testar conexão: `psql $DATABASE_URL`

## Próximos Passos

1. Configurar domínio e DNS
2. Configurar SSL/TLS (certificado ACM)
3. Configurar Application Load Balancer
4. Configurar CloudWatch Alarms
5. Configurar backup automático
