#!/bin/bash

# Script completo de deploy: cria infraestrutura e envia o projeto
# Uso: ./deploy-complete.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo -e "${GREEN}=== Deploy Completo - Prontivus 3.0 ===${NC}"
echo ""

# Verificar se AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Erro: AWS CLI não está instalado${NC}"
    echo "Instale em: https://aws.amazon.com/cli/"
    exit 1
fi

# Verificar se está configurado
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Erro: AWS CLI não está configurado${NC}"
    echo "Execute: aws configure"
    exit 1
fi

# Solicitar informações básicas
read -p "Environment (development/staging/production) [production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

read -p "Stack Name [prontivus-ec2-${ENVIRONMENT}]: " STACK_NAME
STACK_NAME=${STACK_NAME:-prontivus-ec2-${ENVIRONMENT}}

read -p "AWS Region [sa-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-sa-east-1}

read -p "Key Pair Name (obrigatório): " KEY_PAIR_NAME
if [ -z "$KEY_PAIR_NAME" ]; then
    echo -e "${RED}Erro: Key Pair Name é obrigatório${NC}"
    exit 1
fi

# Verificar se key pair existe
if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Aviso: Key Pair '$KEY_PAIR_NAME' não encontrado na região $AWS_REGION${NC}"
    read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Solicitar parâmetros sensíveis
echo ""
echo -e "${BLUE}=== Configurações da Aplicação ===${NC}"
read -sp "Database URL: " DATABASE_URL
echo ""
read -sp "NextAuth Secret: " NEXTAUTH_SECRET
echo ""
read -p "NextAuth URL [http://localhost:3000]: " NEXTAUTH_URL
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

read -sp "Stripe Secret Key (opcional, Enter para pular): " STRIPE_SECRET_KEY
echo ""

read -sp "AWS Access Key ID (opcional): " AWS_ACCESS_KEY_ID
echo ""
read -sp "AWS Secret Access Key (opcional): " AWS_SECRET_ACCESS_KEY
echo ""

# Configurações de infraestrutura
echo ""
echo -e "${BLUE}=== Configurações de Infraestrutura ===${NC}"
read -p "VPC ID (vazio para criar nova): " VPC_ID
read -p "Subnet ID (vazio para criar nova): " SUBNET_ID

# Configurações do código
echo ""
echo -e "${BLUE}=== Configurações do Código ===${NC}"
read -p "Git Repository URL (vazio para upload manual): " GIT_REPOSITORY_URL
read -p "Git Branch [main]: " GIT_BRANCH
GIT_BRANCH=${GIT_BRANCH:-main}

read -p "Node.js Version (18/20/22) [20]: " NODE_VERSION
NODE_VERSION=${NODE_VERSION:-20}

# Preparar parâmetros do CloudFormation
PARAMETERS="ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
PARAMETERS="$PARAMETERS ParameterKey=InstanceType,ParameterValue=t2.micro"
PARAMETERS="$PARAMETERS ParameterKey=KeyPairName,ParameterValue=$KEY_PAIR_NAME"
PARAMETERS="$PARAMETERS ParameterKey=DatabaseUrl,ParameterValue=$DATABASE_URL"
PARAMETERS="$PARAMETERS ParameterKey=NextAuthSecret,ParameterValue=$NEXTAUTH_SECRET"
PARAMETERS="$PARAMETERS ParameterKey=NextAuthUrl,ParameterValue=$NEXTAUTH_URL"
PARAMETERS="$PARAMETERS ParameterKey=AwsRegion,ParameterValue=$AWS_REGION"
PARAMETERS="$PARAMETERS ParameterKey=NodeVersion,ParameterValue=$NODE_VERSION"
PARAMETERS="$PARAMETERS ParameterKey=GitBranch,ParameterValue=$GIT_BRANCH"

if [ -n "$STRIPE_SECRET_KEY" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=StripeSecretKey,ParameterValue=$STRIPE_SECRET_KEY"
fi

if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=AwsAccessKeyId,ParameterValue=$AWS_ACCESS_KEY_ID"
fi

if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=AwsSecretAccessKey,ParameterValue=$AWS_SECRET_ACCESS_KEY"
fi

if [ -n "$VPC_ID" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=VpcId,ParameterValue=$VPC_ID"
fi

if [ -n "$SUBNET_ID" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=SubnetId,ParameterValue=$SUBNET_ID"
fi

if [ -n "$GIT_REPOSITORY_URL" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=GitRepositoryUrl,ParameterValue=$GIT_REPOSITORY_URL"
fi

# Mudar para o diretório do script
cd "$SCRIPT_DIR"

# Deploy da infraestrutura
echo ""
echo -e "${YELLOW}=== Criando/Atualizando Infraestrutura ===${NC}"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Stack já existe. Atualizando...${NC}"
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://ec2-standard-infra.yaml \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" || true
    
    echo -e "${GREEN}Aguardando conclusão do update...${NC}"
    aws cloudformation wait stack-update-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" || true
else
    echo -e "${YELLOW}Criando nova stack...${NC}"
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://ec2-standard-infra.yaml \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}Aguardando conclusão do create...${NC}"
    aws cloudformation wait stack-create-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
fi

# Obter IP público
echo ""
echo -e "${GREEN}=== Obtendo informações da instância ===${NC}"
PUBLIC_IP=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
    --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
    echo -e "${RED}Erro: Não foi possível obter o IP público${NC}"
    exit 1
fi

echo -e "${GREEN}IP Público: $PUBLIC_IP${NC}"

# Aguardar instância estar pronta
echo ""
echo -e "${YELLOW}=== Aguardando instância estar pronta (SSH) ===${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

KEY_FILE="$HOME/.ssh/${KEY_PAIR_NAME}.pem"
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}Aviso: Arquivo de chave não encontrado em $KEY_FILE${NC}"
    read -p "Caminho completo do arquivo .pem: " KEY_FILE
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@$PUBLIC_IP "echo 'Conectado'" &> /dev/null; then
        echo -e "${GREEN}Instância está pronta!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Aguardando... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Timeout: Instância não está respondendo via SSH${NC}"
    echo "Você pode tentar conectar manualmente mais tarde:"
    echo "ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
    exit 1
fi

# Upload do código (se não foi fornecido Git Repository)
if [ -z "$GIT_REPOSITORY_URL" ]; then
    echo ""
    echo -e "${YELLOW}=== Fazendo upload do código ===${NC}"
    
    # Verificar se o diretório do projeto existe
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${RED}Erro: Diretório do projeto não encontrado: $PROJECT_DIR${NC}"
        exit 1
    fi
    
    # Criar arquivo temporário com lista de arquivos para excluir
    EXCLUDE_FILE=$(mktemp)
    cat > "$EXCLUDE_FILE" << EOF
node_modules
.next
.turbo
.git
*.log
.env
.env.local
*.pem
.DS_Store
coverage
.nyc_output
EOF
    
    echo "Enviando arquivos do projeto..."
    rsync -avz --progress \
        --exclude-from="$EXCLUDE_FILE" \
        -e "ssh -i $KEY_FILE -o StrictHostKeyChecking=no" \
        "$PROJECT_DIR/" \
        ec2-user@$PUBLIC_IP:/opt/prontivus/ || {
        echo -e "${YELLOW}rsync não disponível, tentando com scp...${NC}"
        # Fallback para SCP
        ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP "sudo rm -rf /opt/prontivus/*"
        scp -r -i "$KEY_FILE" -o StrictHostKeyChecking=no \
            "$PROJECT_DIR"/* \
            ec2-user@$PUBLIC_IP:/tmp/prontivus-temp/ 2>/dev/null || true
        ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP \
            "sudo mv /tmp/prontivus-temp/* /opt/prontivus/ && sudo chown -R ec2-user:ec2-user /opt/prontivus"
    }
    
    rm -f "$EXCLUDE_FILE"
    
    echo ""
    echo -e "${YELLOW}=== Configurando e iniciando aplicação ===${NC}"
    
    # Executar comandos na instância
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP << 'ENDSSH'
        cd /opt/prontivus
        
        # Instalar dependências
        echo "Instalando dependências..."
        npm ci --production=false
        
        # Gerar Prisma Client
        echo "Gerando Prisma Client..."
        npx prisma generate
        
        # Executar migrations
        echo "Executando migrations..."
        npx prisma migrate deploy || echo "Aviso: Migrations podem ter falhado"
        
        # Build
        echo "Fazendo build..."
        npm run build
        
        # Criar ecosystem.config.js se não existir
        if [ ! -f ecosystem.config.js ]; then
            cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'prontivus',
    script: 'server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/prontivus-error.log',
    out_file: '/var/log/prontivus-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
PM2EOF
        fi
        
        # Parar PM2 se estiver rodando
        pm2 stop prontivus 2>/dev/null || true
        pm2 delete prontivus 2>/dev/null || true
        
        # Iniciar com PM2
        echo "Iniciando aplicação..."
        pm2 start ecosystem.config.js
        pm2 save
        
        # Configurar startup
        STARTUP_CMD=$(pm2 startup systemd -u ec2-user --hp /home/ec2-user | grep -o 'sudo.*')
        if [ -n "$STARTUP_CMD" ]; then
          eval $STARTUP_CMD
        fi
        
        echo "Aplicação iniciada!"
        pm2 status
ENDSSH
    
    echo ""
    echo -e "${GREEN}=== Deploy concluído com sucesso! ===${NC}"
else
    echo ""
    echo -e "${GREEN}=== Código será clonado automaticamente do Git ===${NC}"
    echo "Aguarde alguns minutos para a instância configurar tudo automaticamente."
fi

# Mostrar informações finais
echo ""
echo -e "${GREEN}=== Informações da Instância ===${NC}"
echo "IP Público: $PUBLIC_IP"
echo "URL da Aplicação: http://$PUBLIC_IP:3000"
echo ""
echo "SSH:"
echo "ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
echo ""
echo "Verificar status da aplicação:"
echo "ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'pm2 status'"
echo ""
echo "Ver logs:"
echo "ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'pm2 logs prontivus'"
