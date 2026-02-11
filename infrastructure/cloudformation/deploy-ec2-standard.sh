#!/bin/bash

# Script de deploy para infraestrutura EC2 do Prontivus (sem containers)
# Uso: ./deploy-ec2-standard.sh <environment> <stack-name> <key-pair-name>

set -e

ENVIRONMENT=${1:-production}
STACK_NAME=${2:-prontivus-ec2-${ENVIRONMENT}}
KEY_PAIR_NAME=${3}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validações
if [ -z "$KEY_PAIR_NAME" ]; then
    echo -e "${RED}Erro: Key Pair Name é obrigatório${NC}"
    echo "Uso: $0 <environment> <stack-name> <key-pair-name>"
    exit 1
fi

echo -e "${GREEN}=== Deploy da Infraestrutura EC2 - Prontivus (Sem Containers) ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"
echo "Key Pair: $KEY_PAIR_NAME"
echo ""

# Solicitar parâmetros sensíveis
read -sp "Database URL: " DATABASE_URL
echo ""
read -sp "NextAuth Secret: " NEXTAUTH_SECRET
echo ""
read -p "NextAuth URL (default: http://localhost:3000): " NEXTAUTH_URL
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

read -sp "Stripe Secret Key (opcional, pressione Enter para pular): " STRIPE_SECRET_KEY
echo ""

read -p "AWS Region (default: sa-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-sa-east-1}

read -sp "AWS Access Key ID (opcional): " AWS_ACCESS_KEY_ID
echo ""
read -sp "AWS Secret Access Key (opcional): " AWS_SECRET_ACCESS_KEY
echo ""

read -p "Instance Type (default: t2.micro): " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-t2.micro}

read -p "VPC ID (deixe vazio para criar nova): " VPC_ID
read -p "Subnet ID (deixe vazio para criar nova): " SUBNET_ID

read -p "Git Repository URL (opcional, deixe vazio para upload manual via SSH): " GIT_REPOSITORY_URL
read -p "Git Branch (default: main): " GIT_BRANCH
GIT_BRANCH=${GIT_BRANCH:-main}

read -p "Node.js Version (18, 20, 22 - default: 20): " NODE_VERSION
NODE_VERSION=${NODE_VERSION:-20}

# Preparar parâmetros do CloudFormation
PARAMETERS="ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
PARAMETERS="$PARAMETERS ParameterKey=InstanceType,ParameterValue=$INSTANCE_TYPE"
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

echo -e "${YELLOW}Iniciando deploy do CloudFormation...${NC}"

# Verificar se stack já existe
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${YELLOW}Stack já existe. Atualizando...${NC}"
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://ec2-standard-infra.yaml \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}Aguardando conclusão do update...${NC}"
    aws cloudformation wait stack-update-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
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

# Obter outputs
echo -e "${GREEN}=== Deploy concluído com sucesso! ===${NC}"
echo ""
echo "Outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs' \
    --output table

# Obter IP público
PUBLIC_IP=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
    --output text)

if [ -n "$PUBLIC_IP" ]; then
    echo ""
    echo -e "${GREEN}IP Público: $PUBLIC_IP${NC}"
    echo -e "${GREEN}URL da Aplicação: http://$PUBLIC_IP:3000${NC}"
    echo ""
    echo "Para acessar via SSH:"
    echo "ssh -i ~/.ssh/$KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP"
    echo ""
    if [ -z "$GIT_REPOSITORY_URL" ]; then
        echo -e "${YELLOW}=== IMPORTANTE: Upload Manual do Código ===${NC}"
        echo "Você precisa fazer upload do código para a instância:"
        echo ""
        echo "1. Via SCP:"
        echo "   scp -r -i ~/.ssh/$KEY_PAIR_NAME.pem ./Prontivus\\ 3.0/* ec2-user@$PUBLIC_IP:/opt/prontivus/"
        echo ""
        echo "2. Ou via SSH e Git:"
        echo "   ssh -i ~/.ssh/$KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP"
        echo "   cd /opt/prontivus"
        echo "   git clone <seu-repositorio> ."
        echo "   npm install"
        echo "   npx prisma generate"
        echo "   npx prisma migrate deploy"
        echo "   npm run build"
        echo "   pm2 start ecosystem.config.js"
        echo "   pm2 save"
    fi
fi
