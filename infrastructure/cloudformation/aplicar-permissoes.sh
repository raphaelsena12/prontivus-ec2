#!/bin/bash

# Script para aplicar permissões ao usuário prontivus
# Execute como administrador ou com credenciais que tenham permissão IAM

echo "=== Aplicando Permissões ao Usuário prontivus ==="
echo ""

USER_NAME="prontivus"
ACCOUNT_ID="983740383268"

# Políticas AWS gerenciadas
POLICIES=(
    "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
    "arn:aws:iam::aws:policy/IAMFullAccess"
    "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
)

for POLICY_ARN in "${POLICIES[@]}"; do
    echo "Aplicando política: $POLICY_ARN"
    
    if aws iam attach-user-policy \
        --user-name "$USER_NAME" \
        --policy-arn "$POLICY_ARN"; then
        echo "✓ Política aplicada com sucesso!"
    else
        echo "✗ Erro ao aplicar política"
    fi
    echo ""
done

echo "=== Verificando políticas aplicadas ==="
aws iam list-attached-user-policies --user-name "$USER_NAME" --output table

echo ""
echo "=== Testando permissões ==="

# Testar EC2
echo "Testando EC2..."
if aws ec2 describe-key-pairs --region sa-east-1 --max-items 1 &>/dev/null; then
    echo "✓ Permissão EC2 OK"
else
    echo "✗ Permissão EC2 ainda não funciona"
fi

# Testar CloudFormation
echo "Testando CloudFormation..."
if aws cloudformation list-stacks --region sa-east-1 --max-items 1 &>/dev/null; then
    echo "✓ Permissão CloudFormation OK"
else
    echo "✗ Permissão CloudFormation ainda não funciona"
fi

echo ""
echo "=== Concluído ==="
