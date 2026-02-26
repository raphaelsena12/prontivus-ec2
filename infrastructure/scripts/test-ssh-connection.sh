#!/bin/bash
# Script para testar conexão SSH
# Execute na EC2 para verificar qual chave está configurada

echo "=== Verificando chaves SSH autorizadas ==="
echo ""
echo "Chaves autorizadas para o usuário ubuntu:"
cat ~/.ssh/authorized_keys
echo ""
echo "=== Verificando permissões ==="
ls -la ~/.ssh/
echo ""
echo "=== Testando conexão local ==="
ssh -v ubuntu@localhost 2>&1 | head -20
