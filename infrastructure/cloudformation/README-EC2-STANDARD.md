# Infraestrutura EC2 para Prontivus 3.0 (Sem Containers)

Este template CloudFormation cria uma infraestrutura completa para rodar o Prontivus em uma instância EC2 com Node.js instalado diretamente (sem Docker/containers).

## 📋 Componentes

- **VPC** (opcional, cria nova se não fornecida)
- **Subnet Pública** (opcional, cria nova se não fornecida)
- **Security Group** com regras para SSH, HTTP, HTTPS e porta 3000
- **EC2 Instance** com Node.js, PM2 e PostgreSQL client instalados
- **Elastic IP** para IP público fixo
- **IAM Role** com permissões para S3, Transcribe, Comprehend Medical, SES e CloudWatch Logs

## 🚀 Quick Start

### Pré-requisitos

1. AWS CLI instalado e configurado
2. Key Pair criado na AWS
3. Permissões adequadas na AWS (EC2, VPC, IAM, CloudFormation)
4. Banco de dados RDS já criado
5. NextAuth Secret gerado

### Gerar NextAuth Secret

```bash
openssl rand -base64 32
```

### Deploy usando Script

```bash
cd infrastructure/cloudformation
chmod +x deploy-ec2-standard.sh
./deploy-ec2-standard.sh production prontivus-ec2-prod my-key-pair
```

O script irá solicitar:
- Database URL
- NextAuth Secret
- NextAuth URL
- Stripe Secret Key (opcional)
- AWS Credentials (opcional)
- Instance Type
- VPC/Subnet IDs (opcional)
- Git Repository URL (opcional)
- Git Branch
- Node.js Version

### Deploy Manual

```bash
aws cloudformation create-stack \
  --stack-name prontivus-ec2-production \
  --template-body file://ec2-standard-infra.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=InstanceType,ParameterValue=t2.micro \
    ParameterKey=KeyPairName,ParameterValue=my-key-pair \
    ParameterKey=DatabaseUrl,ParameterValue=postgresql://user:pass@host:5432/db \
    ParameterKey=NextAuthSecret,ParameterValue=your-secret \
    ParameterKey=NextAuthUrl,ParameterValue=https://prontivus.com.br \
    ParameterKey=GitRepositoryUrl,ParameterValue=https://github.com/user/repo.git \
    ParameterKey=GitBranch,ParameterValue=main \
    ParameterKey=NodeVersion,ParameterValue=20 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region sa-east-1
```

## 📝 Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| Environment | String | Não | Ambiente (development/staging/production) |
| InstanceType | String | Não | Tipo de instância EC2 (padrão: t2.micro) |
| KeyPairName | String | Sim | Nome do Key Pair para SSH |
| VpcId | String | Não | ID da VPC existente (deixe vazio para criar) |
| SubnetId | String | Não | ID da Subnet existente (deixe vazio para criar) |
| DatabaseUrl | String | Sim | URL de conexão do PostgreSQL |
| NextAuthSecret | String | Sim | Secret do NextAuth |
| NextAuthUrl | String | Não | URL base da aplicação |
| StripeSecretKey | String | Não | Chave secreta do Stripe |
| AwsRegion | String | Não | Região AWS (padrão: sa-east-1) |
| AwsAccessKeyId | String | Não | AWS Access Key ID |
| AwsSecretAccessKey | String | Não | AWS Secret Access Key |
| GitRepositoryUrl | String | Não | URL do repositório Git (deixe vazio para upload manual) |
| GitBranch | String | Não | Branch do repositório (padrão: main) |
| NodeVersion | String | Não | Versão do Node.js (18, 20, 22 - padrão: 20) |

## 🔧 Configuração do Código

O template suporta duas formas de deploy do código:

### 1. Usando Repositório Git (Recomendado)

Forneça o parâmetro `GitRepositoryUrl`:

```bash
GitRepositoryUrl=https://github.com/seu-usuario/prontivus.git
GitBranch=main
```

O User Data script irá:
1. Clonar o repositório
2. Instalar dependências (`npm ci`)
3. Gerar Prisma Client (`npx prisma generate`)
4. Executar migrations (`npx prisma migrate deploy`)
5. Fazer build (`npm run build`)
6. Iniciar com PM2

### 2. Upload Manual via SSH/SCP

Deixe `GitRepositoryUrl` vazio. Depois do deploy:

```bash
# Obter IP público
PUBLIC_IP=$(aws cloudformation describe-stacks \
  --stack-name prontivus-ec2-production \
  --region sa-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text)

# Upload via SCP
scp -r -i ~/.ssh/my-key-pair.pem \
  ./Prontivus\ 3.0/* \
  ec2-user@$PUBLIC_IP:/opt/prontivus/

# Ou via SSH e Git
ssh -i ~/.ssh/my-key-pair.pem ec2-user@$PUBLIC_IP
cd /opt/prontivus
git clone https://github.com/seu-usuario/prontivus.git .
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## 🔒 Security Groups

O Security Group criado permite:
- **SSH (22)**: 0.0.0.0/0 (considere restringir em produção)
- **HTTP (80)**: 0.0.0.0/0
- **HTTPS (443)**: 0.0.0.0/0
- **Aplicação (3000)**: 0.0.0.0/0

**Recomendação**: Em produção, restrinja o acesso SSH apenas ao seu IP.

## 📊 Gerenciamento da Aplicação

### PM2

A aplicação é gerenciada pelo PM2. Comandos úteis:

```bash
# SSH na instância
ssh -i ~/.ssh/my-key-pair.pem ec2-user@<ip>

# Ver status
pm2 status

# Ver logs
pm2 logs prontivus

# Reiniciar
pm2 restart prontivus

# Parar
pm2 stop prontivus

# Iniciar
pm2 start prontivus

# Monitoramento em tempo real
pm2 monit
```

### Logs

Os logs estão disponíveis em:
- PM2: `pm2 logs prontivus`
- User Data: `/var/log/user-data.log`
- PM2 out: `/var/log/prontivus-out.log`
- PM2 error: `/var/log/prontivus-error.log`

## 🔄 Atualização da Aplicação

### Se usando Git Repository:

```bash
# SSH na instância
ssh -i ~/.ssh/my-key-pair.pem ec2-user@<ip>

# Atualizar código
cd /opt/prontivus
git pull origin main

# Reinstalar dependências (se necessário)
npm ci

# Atualizar Prisma
npx prisma generate
npx prisma migrate deploy

# Rebuild
npm run build

# Reiniciar aplicação
pm2 restart prontivus
```

### Se usando Upload Manual:

1. Fazer upload do novo código
2. Seguir os mesmos passos acima (sem git pull)

## 🛠️ Troubleshooting

### Aplicação não inicia

1. SSH na instância: `ssh -i ~/.ssh/key.pem ec2-user@<ip>`
2. Verificar logs: `pm2 logs prontivus` ou `tail -f /var/log/user-data.log`
3. Verificar variáveis de ambiente: `cat /opt/prontivus/.env`
4. Verificar se Node.js está instalado: `node --version`
5. Verificar se PM2 está rodando: `pm2 status`

### Health Check falha

1. Verificar se aplicação está rodando: `pm2 status`
2. Testar manualmente: `curl http://localhost:3000/api/health`
3. Verificar logs do PM2: `pm2 logs prontivus`
4. Verificar se a porta 3000 está aberta: `netstat -tlnp | grep 3000`

### Problemas de conectividade

1. Verificar Security Group: portas 3000, 80, 443 devem estar abertas
2. Verificar se instância está em subnet pública
3. Verificar Route Table
4. Verificar Elastic IP está associado

### Problemas de permissão

1. Verificar IAM Role da instância
2. Verificar se tem permissão para S3, Transcribe, etc.
3. Verificar CloudWatch Logs permissions

### Problemas com Prisma

1. Verificar DATABASE_URL no .env
2. Verificar se banco de dados está acessível
3. Executar migrations manualmente: `npx prisma migrate deploy`
4. Verificar Prisma Client: `npx prisma generate`

## 📈 Próximos Passos

1. **Application Load Balancer**: Adicione um ALB na frente da EC2 para melhor disponibilidade
2. **Auto Scaling Group**: Configure auto scaling para múltiplas instâncias
3. **SSL/TLS**: Configure certificado no ACM e use HTTPS
4. **CloudWatch Alarms**: Configure alertas para CPU, memória, etc.
5. **Backup**: Configure backup automático dos volumes EBS
6. **Domain**: Configure domínio personalizado apontando para o IP/ALB
7. **Nginx/Apache**: Configure reverse proxy na frente da aplicação
8. **Systemd Service**: Configure service systemd para garantir que PM2 inicie automaticamente

## 🔗 Links Úteis

- [Documentação CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Documentação EC2](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Node.js Documentation](https://nodejs.org/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 📌 Notas Importantes

1. **AMIs**: Os AMI IDs no template podem estar desatualizados. Para obter o AMI mais recente do Amazon Linux 2023:
   ```bash
   aws ec2 describe-images \
     --owners amazon \
     --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" \
     --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
     --region sa-east-1
   ```

2. **Variáveis de Ambiente**: Todas as variáveis de ambiente são configuradas no arquivo `.env` em `/opt/prontivus/.env`

3. **PM2 Startup**: O PM2 está configurado para iniciar automaticamente via systemd. Se necessário, reexecute:
   ```bash
   pm2 startup systemd -u ec2-user --hp /home/ec2-user
   ```

4. **Porta 3000**: A aplicação roda na porta 3000. Para usar porta 80, configure um reverse proxy (Nginx) ou use um Application Load Balancer.
