# Infraestrutura AWS - Prontivus

Este diretório contém os arquivos de infraestrutura para deploy do Prontivus na AWS usando CloudFormation e GitHub Actions.

## 📋 Visão Geral

A infraestrutura consiste em:

- **VPC** com subnets públicas
- **Security Groups** configurados para SSH (22) e Next.js (3000)
- **EC2 t3.small** com Ubuntu 22.04 LTS
- **Elastic IP** para IP público estático
- **IAM Role** com permissões para S3, SES, Transcribe e Comprehend Medical
- **Pipeline CI/CD** via GitHub Actions para deploy automático

## 🚀 Pré-requisitos

1. **Conta AWS** com permissões para criar recursos
2. **AWS CLI** instalado e configurado
3. **Chave SSH** criada na AWS (EC2 Key Pair)
4. **Repositório GitHub** configurado
5. **Banco de dados PostgreSQL** (RDS ou externo) já criado

## 📝 Passo a Passo de Setup

### 1. Criar Chave SSH na AWS

```bash
# Via Console AWS:
# EC2 > Key Pairs > Create key pair
# Nome: prontivus-keypair
# Tipo: RSA
# Formato: .pem (para Linux/Mac) ou .ppk (para Windows/PuTTY)

# Ou via AWS CLI:
aws ec2 create-key-pair --key-name prontivus-keypair --query 'KeyMaterial' --output text > prontivus-keypair.pem
chmod 400 prontivus-keypair.pem
```

### 2. Preparar Parâmetros para CloudFormation

Antes de fazer o deploy, você precisa ter os seguintes valores:

- **KeyPairName**: Nome da chave SSH criada (ex: `prontivus-keypair`)
- **DatabaseURL**: URL completa do PostgreSQL (ex: `postgresql://user:pass@host:5432/dbname`)
- **NextAuthURL**: URL pública da aplicação (será atualizada após criar a EC2)
- **NextAuthSecret**: Secret para NextAuth (gere um valor seguro)
- **AllowedSSHIP**: IP permitido para SSH (use `0.0.0.0/0` para permitir de qualquer lugar, ou seu IP específico)
- **AWSRegion**: Região AWS (padrão: `sa-east-1`)
- **AWSAccessKeyId** (opcional): Se não usar IAM Role
- **AWSSecretAccessKey** (opcional): Se não usar IAM Role
- **S3BucketName** (opcional): Nome do bucket S3

### 3. Deploy da Stack CloudFormation

#### Opção A: Via Console AWS

1. Acesse o Console AWS > CloudFormation
2. Clique em "Create stack" > "With new resources (standard)"
3. Em "Template source", selecione "Upload a template file"
4. Faça upload do arquivo `infrastructure/cloudformation/prontivus-stack.yaml`
5. Preencha os parâmetros necessários
6. Revise e crie a stack

#### Opção B: Via AWS CLI

```bash
aws cloudformation create-stack \
  --stack-name prontivus-stack \
  --template-body file://infrastructure/cloudformation/prontivus-stack.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=prontivus-keypair \
    ParameterKey=DatabaseURL,ParameterValue=postgresql://user:pass@host:5432/dbname \
    ParameterKey=NextAuthURL,ParameterValue=http://localhost:3000 \
    ParameterKey=NextAuthSecret,ParameterValue=seu-secret-aqui \
    ParameterKey=AllowedSSHIP,ParameterValue=0.0.0.0/0 \
    ParameterKey=AWSRegion,ParameterValue=sa-east-1 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region sa-east-1
```

Aguarde a criação da stack (pode levar 5-10 minutos).

### 4. Obter IP Público da EC2

Após a stack ser criada:

1. No Console CloudFormation, vá em "Outputs"
2. Anote o valor de `EC2PublicIP` ou `EC2PublicDNS`
3. Atualize o parâmetro `NextAuthURL` na stack se necessário

### 5. Configurar Variáveis de Ambiente na EC2

Conecte-se na EC2 via SSH:

```bash
ssh -i prontivus-keypair.pem ubuntu@<EC2_PUBLIC_IP>
```

Edite o arquivo `.env`:

```bash
sudo nano /opt/prontivus/.env
```

Configure todas as variáveis necessárias:

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXTAUTH_URL=http://<EC2_PUBLIC_IP>:3000
NEXTAUTH_SECRET=seu-secret-aqui

# AWS (se não usar IAM Role)
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=prontivus-documentos

# Opcionais
OPENAI_API_KEY=your-key
STRIPE_SECRET_KEY=your-key
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=user@example.com
SMTP_PASSWORD=password
```

### 6. Clonar Repositório na EC2

```bash
cd /opt/prontivus
sudo git clone https://github.com/seu-usuario/seu-repositorio.git .
sudo chown -R ubuntu:ubuntu /opt/prontivus
```

### 7. Primeiro Deploy Manual

```bash
cd /opt/prontivus

# Garantir que o script de deploy é executável (se copiado manualmente)
chmod +x infrastructure/scripts/deploy.sh

# Criar diretório de logs
mkdir -p logs

# Instalar dependências
npm ci

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate deploy

# Build da aplicação
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Configurar para iniciar no boot
```

### 8. Configurar GitHub Secrets

No repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

- **EC2_SSH_KEY**: Conteúdo da chave privada SSH (prontivus-keypair.pem)
- **EC2_HOST**: IP público da EC2 (ou DNS)
- **EC2_USER**: `ubuntu`

**Importante**: Para obter a chave privada no formato correto:

```bash
# No Windows (PowerShell):
Get-Content prontivus-keypair.pem | Out-String

# No Linux/Mac:
cat prontivus-keypair.pem
```

Copie todo o conteúdo incluindo `-----BEGIN RSA PRIVATE KEY-----` e `-----END RSA PRIVATE KEY-----`.

### 9. Testar Pipeline GitHub Actions

1. Faça um commit e push para a branch `main` ou `master`
2. Vá em **Actions** no GitHub
3. O workflow deve iniciar automaticamente
4. Verifique os logs para garantir que o deploy foi bem-sucedido

## 🔄 Fluxo de Deploy Automático

1. **Desenvolvedor** faz commit/push no GitHub
2. **GitHub Actions** detecta o push
3. **SSH Connection** conecta na EC2 usando a chave privada
4. **Deploy Script** executa:
   - `git pull` para atualizar código
   - `npm ci` para instalar dependências
   - `prisma generate` para gerar client
   - `prisma migrate deploy` para aplicar migrations
   - `npm run build` para build da aplicação
   - `pm2 restart` para reiniciar aplicação
5. **Health Check** verifica se aplicação está respondendo

## 🛠️ Comandos Úteis

### Gerenciar Aplicação na EC2

```bash
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

# Monitorar
pm2 monit
```

### Verificar Aplicação

```bash
# Verificar se está rodando
curl http://localhost:3000

# Ver logs do sistema
journalctl -u nginx -f
```

### Atualizar Stack CloudFormation

```bash
aws cloudformation update-stack \
  --stack-name prontivus-stack \
  --template-body file://infrastructure/cloudformation/prontivus-stack.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=prontivus-keypair \
    # ... outros parâmetros
  --capabilities CAPABILITY_NAMED_IAM \
  --region sa-east-1
```

### Deletar Stack

```bash
aws cloudformation delete-stack --stack-name prontivus-stack --region sa-east-1
```

## 🔒 Segurança

### Recomendações

1. **SSH**: Restrinja o acesso SSH ao seu IP específico no Security Group
2. **NextAuth Secret**: Use um valor forte e aleatório
3. **Database URL**: Não commite credenciais no código
4. **IAM Role**: Prefira usar IAM Role ao invés de Access Keys quando possível
5. **HTTPS**: Configure um Load Balancer com certificado SSL para produção
6. **Firewall**: Considere usar AWS WAF para proteção adicional

### Restringir SSH por IP

No CloudFormation, altere o parâmetro `AllowedSSHIP` para seu IP específico:

```
AllowedSSHIP: 123.456.789.0/32
```

## 📊 Monitoramento

### CloudWatch

A EC2 já está configurada com CloudWatch Agent. Você pode:

1. Ver métricas no Console AWS > CloudWatch
2. Configurar alarmes para CPU, memória, etc.
3. Ver logs da aplicação no CloudWatch Logs

### PM2 Monitoring

```bash
# Dashboard web do PM2
pm2 web

# Ou use PM2 Plus (serviço pago)
pm2 link <secret> <public>
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Verificar logs do PM2
pm2 logs prontivus --lines 50

# Verificar variáveis de ambiente
cat /opt/prontivus/.env

# Verificar se porta está em uso
sudo netstat -tulpn | grep 3000
```

### Erro de conexão com banco

```bash
# Testar conexão
psql $DATABASE_URL

# Verificar migrations
npx prisma migrate status
```

### GitHub Actions falha no SSH

1. Verificar se a chave SSH está correta no GitHub Secrets
2. Verificar se o IP da EC2 está correto
3. Verificar Security Group permite SSH do IP do GitHub Actions
4. Testar conexão manualmente: `ssh -i key.pem ubuntu@<IP>`

### Build falha

```bash
# Limpar cache e node_modules
cd /opt/prontivus
rm -rf .next node_modules
npm ci
npm run build
```

## ⚠️ Nota Importante sobre AMI

O template CloudFormation usa o AMI `ami-0e66e54902b0e5a92` que é o Ubuntu 22.04 LTS em `sa-east-1`. 

**Se você estiver usando outra região ou o AMI mudar**, você precisa atualizar o `ImageId` no template. Para encontrar o AMI correto:**

```bash
# Via AWS CLI
aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region sa-east-1
```

Ou acesse: https://cloud-images.ubuntu.com/locator/ec2/

## 📚 Arquivos da Infraestrutura

- `infrastructure/cloudformation/prontivus-stack.yaml` - Template CloudFormation
- `infrastructure/scripts/deploy.sh` - Script de deploy executado na EC2
- `infrastructure/ecosystem.config.js` - Configuração PM2
- `.github/workflows/deploy.yml` - Workflow GitHub Actions

## 🔗 Links Úteis

- [Documentação CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Documentação PM2](https://pm2.keymetrics.io/docs/)
- [Documentação GitHub Actions](https://docs.github.com/en/actions)
- [Documentação Next.js Deployment](https://nextjs.org/docs/deployment)

## 📞 Suporte

Em caso de problemas, verifique:

1. Logs do PM2: `pm2 logs prontivus`
2. Logs do CloudFormation no Console AWS
3. Logs do GitHub Actions na aba Actions do repositório
4. Status da EC2 no Console AWS > EC2
