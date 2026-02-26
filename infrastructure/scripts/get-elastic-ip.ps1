# Script para obter o Elastic IP da stack CloudFormation
# Uso: .\get-elastic-ip.ps1 -StackName prontivus-stack

param(
    [Parameter(Mandatory=$false)]
    [string]$StackName = "prontivus-stack"
)

Write-Host "=== Obtendo Elastic IP da Stack CloudFormation ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Obter o IP do Elastic IP do output da stack
    $output = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query 'Stacks[0].Outputs[?OutputKey==`EC2PublicIP`].OutputValue' `
        --output text `
        --region sa-east-1

    if ($output) {
        Write-Host "✅ Elastic IP encontrado:" -ForegroundColor Green
        Write-Host "   IP: $output" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Use este IP para configurar o Route 53:" -ForegroundColor Cyan
        Write-Host "   Record Type: A" -ForegroundColor White
        Write-Host "   Value: $output" -ForegroundColor White
        Write-Host "   TTL: 300 (5 minutos)" -ForegroundColor White
    } else {
        Write-Host "❌ Não foi possível obter o Elastic IP" -ForegroundColor Red
        Write-Host "Verifique se a stack existe e tem o output EC2PublicIP" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao obter Elastic IP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique se:" -ForegroundColor Yellow
    Write-Host "  1. A stack '$StackName' existe" -ForegroundColor White
    Write-Host "  2. Você tem permissões para acessar CloudFormation" -ForegroundColor White
    Write-Host "  3. A região está correta (sa-east-1)" -ForegroundColor White
}
