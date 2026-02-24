# Script PowerShell para fazer deploy da stack CloudFormation do Prontivus
# Uso: .\deploy-stack.ps1

$STACK_NAME = "prontivus-stack"
$REGION = "sa-east-1"
$TEMPLATE_FILE = "infrastructure\cloudformation\prontivus-stack.yaml"
$PARAMETERS_FILE = "infrastructure\cloudformation\parameters.json"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploy da Stack CloudFormation - Prontivus" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Stack Name: $STACK_NAME"
Write-Host "Region: $REGION"
Write-Host "Template: $TEMPLATE_FILE"
Write-Host "Parameters: $PARAMETERS_FILE"
Write-Host ""

# Verificar se o arquivo de template existe
if (-not (Test-Path $TEMPLATE_FILE)) {
    Write-Host "❌ Erro: Arquivo de template não encontrado: $TEMPLATE_FILE" -ForegroundColor Red
    exit 1
}

# Verificar se o arquivo de parâmetros existe
if (-not (Test-Path $PARAMETERS_FILE)) {
    Write-Host "❌ Erro: Arquivo de parâmetros não encontrado: $PARAMETERS_FILE" -ForegroundColor Red
    exit 1
}

# Verificar se a stack já existe
try {
    $existingStack = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⚠️  Stack já existe. Atualizando..." -ForegroundColor Yellow
        aws cloudformation update-stack `
            --stack-name $STACK_NAME `
            --template-body file://$TEMPLATE_FILE `
            --parameters file://$PARAMETERS_FILE `
            --capabilities CAPABILITY_NAMED_IAM `
            --region $REGION
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Stack em atualização. Aguarde a conclusão..." -ForegroundColor Green
            Write-Host "Monitore o progresso:"
            Write-Host "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION"
        }
    }
} catch {
    Write-Host "📦 Criando nova stack..." -ForegroundColor Cyan
    aws cloudformation create-stack `
        --stack-name $STACK_NAME `
        --template-body file://$TEMPLATE_FILE `
        --parameters file://$PARAMETERS_FILE `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $REGION
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Stack criada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Aguarde a criação completa (pode levar 5-10 minutos)..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Monitore o progresso:"
        Write-Host "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION"
        Write-Host ""
        Write-Host "Ou no Console AWS:"
        Write-Host "  https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
        Write-Host ""
        Write-Host "Após a criação, obtenha o IP público em:"
        Write-Host "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs'"
    } else {
        Write-Host "❌ Erro ao criar stack" -ForegroundColor Red
        exit 1
    }
}
