# Script para deletar e monitorar a stack CloudFormation
# Uso: .\delete-stack.ps1

$STACK_NAME = "prontivus-stack"
$REGION = "sa-east-1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deletando Stack CloudFormation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Stack Name: $STACK_NAME" -ForegroundColor White
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host ""

# Verificar status atual
$currentStatus = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].StackStatus" --output text 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Stack não encontrada ou já foi deletada." -ForegroundColor Yellow
    exit 0
}

Write-Host "Status atual: $currentStatus" -ForegroundColor Yellow
Write-Host ""

if ($currentStatus -eq "DELETE_IN_PROGRESS") {
    Write-Host "Stack já está sendo deletada..." -ForegroundColor Yellow
} else {
    Write-Host "Iniciando deleção da stack..." -ForegroundColor Cyan
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Comando de deleção enviado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao deletar stack" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Aguardando deleção completa..." -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

# Monitorar progresso
$maxAttempts = 60
$attempt = 0

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 10
    $attempt++
    
    $status = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].StackStatus" --output text 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✅ Stack deletada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Todos os recursos foram removidos:" -ForegroundColor Cyan
        Write-Host "  - VPC" -ForegroundColor White
        Write-Host "  - Security Groups" -ForegroundColor White
        Write-Host "  - EC2 Instance" -ForegroundColor White
        Write-Host "  - Elastic IP" -ForegroundColor White
        Write-Host "  - IAM Role" -ForegroundColor White
        Write-Host ""
        exit 0
    }
    
    Write-Host "[$attempt/$maxAttempts] Status: $status" -ForegroundColor Gray
    
    if ($status -like "*FAILED*" -or $status -like "*ROLLBACK*") {
        Write-Host ""
        Write-Host "❌ Erro na deleção da stack!" -ForegroundColor Red
        Write-Host "Status: $status" -ForegroundColor Red
        Write-Host ""
        Write-Host "Verifique no Console AWS:" -ForegroundColor Yellow
        Write-Host "  https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "⏳ Timeout: A deleção ainda está em progresso." -ForegroundColor Yellow
Write-Host "Verifique manualmente no Console AWS:" -ForegroundColor Yellow
Write-Host "  https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks" -ForegroundColor White
Write-Host ""
