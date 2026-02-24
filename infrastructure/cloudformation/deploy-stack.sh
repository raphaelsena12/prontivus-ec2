#!/bin/bash
# Script para fazer deploy da stack CloudFormation do Prontivus
# Uso: ./deploy-stack.sh

STACK_NAME="prontivus-stack"
REGION="sa-east-1"
TEMPLATE_FILE="infrastructure/cloudformation/prontivus-stack.yaml"
PARAMETERS_FILE="infrastructure/cloudformation/parameters.json"

echo "=========================================="
echo "Deploy da Stack CloudFormation - Prontivus"
echo "=========================================="
echo ""
echo "Stack Name: $STACK_NAME"
echo "Region: $REGION"
echo "Template: $TEMPLATE_FILE"
echo "Parameters: $PARAMETERS_FILE"
echo ""

# Verificar se o arquivo de template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Erro: Arquivo de template não encontrado: $TEMPLATE_FILE"
    exit 1
fi

# Verificar se o arquivo de parâmetros existe
if [ ! -f "$PARAMETERS_FILE" ]; then
    echo "❌ Erro: Arquivo de parâmetros não encontrado: $PARAMETERS_FILE"
    exit 1
fi

# Verificar se a stack já existe
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "⚠️  Stack já existe. Atualizando..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters file://"$PARAMETERS_FILE" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Stack em atualização. Aguarde a conclusão..."
        echo "Monitore o progresso:"
        echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION"
    fi
else
    echo "📦 Criando nova stack..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters file://"$PARAMETERS_FILE" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Stack criada com sucesso!"
        echo ""
        echo "Aguarde a criação completa (pode levar 5-10 minutos)..."
        echo ""
        echo "Monitore o progresso:"
        echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION"
        echo ""
        echo "Ou no Console AWS:"
        echo "  https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
        echo ""
        echo "Após a criação, obtenha o IP público em:"
        echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs'"
    else
        echo "❌ Erro ao criar stack"
        exit 1
    fi
fi
