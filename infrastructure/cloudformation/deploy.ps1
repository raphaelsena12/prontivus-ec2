# Script PowerShell para deploy da infraestrutura EC2
# Uso: .\deploy.ps1

param(
    [string]$Environment = "production",
    [string]$StackName = "prontivus-ec2-production",
    [string]$KeyPairName = "",
    [string]$DatabaseUrl = "",
    [string]$NextAuthSecret = "",
    [string]$NextAuthUrl = "http://localhost:3000",
    [string]$AwsRegion = "sa-east-1",
    [string]$InstanceType = "t2.micro",
    [string]$NodeVersion = "20",
    [string]$GitRepositoryUrl = "",
    [string]$GitBranch = "main",
    [string]$StripeSecretKey = "",
    [string]$AwsAccessKeyId = "",
    [string]$AwsSecretAccessKey = "",
    [string]$VpcId = "",
    [string]$SubnetId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy da Infraestrutura EC2 - Prontivus ===" -ForegroundColor Green
Write-Host ""

# Validações
if ([string]::IsNullOrEmpty($KeyPairName)) {
    Write-Host "Erro: Key Pair Name é obrigatório" -ForegroundColor Red
    Write-Host "Uso: .\deploy.ps1 -KeyPairName 'nome-da-chave' -DatabaseUrl 'postgresql://...' -NextAuthSecret 'secret'"
    exit 1
}

if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Host "Erro: Database URL é obrigatório" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($NextAuthSecret)) {
    Write-Host "Erro: NextAuth Secret é obrigatório" -ForegroundColor Red
    exit 1
}

# Preparar parâmetros
$parameters = @(
    "ParameterKey=Environment,ParameterValue=$Environment",
    "ParameterKey=InstanceType,ParameterValue=$InstanceType",
    "ParameterKey=KeyPairName,ParameterValue=$KeyPairName",
    "ParameterKey=DatabaseUrl,ParameterValue=$DatabaseUrl",
    "ParameterKey=NextAuthSecret,ParameterValue=$NextAuthSecret",
    "ParameterKey=NextAuthUrl,ParameterValue=$NextAuthUrl",
    "ParameterKey=AwsRegion,ParameterValue=$AwsRegion",
    "ParameterKey=NodeVersion,ParameterValue=$NodeVersion",
    "ParameterKey=GitBranch,ParameterValue=$GitBranch"
)

if (![string]::IsNullOrEmpty($StripeSecretKey)) {
    $parameters += "ParameterKey=StripeSecretKey,ParameterValue=$StripeSecretKey"
}

if (![string]::IsNullOrEmpty($AwsAccessKeyId)) {
    $parameters += "ParameterKey=AwsAccessKeyId,ParameterValue=$AwsAccessKeyId"
}

if (![string]::IsNullOrEmpty($AwsSecretAccessKey)) {
    $parameters += "ParameterKey=AwsSecretAccessKey,ParameterValue=$AwsSecretAccessKey"
}

if (![string]::IsNullOrEmpty($VpcId)) {
    $parameters += "ParameterKey=VpcId,ParameterValue=$VpcId"
}

if (![string]::IsNullOrEmpty($SubnetId)) {
    $parameters += "ParameterKey=SubnetId,ParameterValue=$SubnetId"
}

if (![string]::IsNullOrEmpty($GitRepositoryUrl)) {
    $parameters += "ParameterKey=GitRepositoryUrl,ParameterValue=$GitRepositoryUrl"
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$templateFile = Join-Path $scriptPath "ec2-standard-infra.yaml"

Write-Host "Iniciando deploy do CloudFormation..." -ForegroundColor Yellow
Write-Host "Stack: $StackName" -ForegroundColor Cyan
Write-Host "Region: $AwsRegion" -ForegroundColor Cyan
Write-Host ""

# Verificar se stack já existe
$stackExists = $false
try {
    aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $stackExists = $true
    }
} catch {
    $stackExists = $false
}

if ($stackExists) {
    Write-Host "Stack já existe. Atualizando..." -ForegroundColor Yellow
    $paramString = ($parameters | ForEach-Object { "`"$_`"" }) -join " "
    $cmd = "aws cloudformation update-stack --stack-name `"$StackName`" --template-body `"file://$templateFile`" --parameters $paramString --capabilities CAPABILITY_NAMED_IAM --region `"$AwsRegion`""
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Aguardando conclusão do update..." -ForegroundColor Green
        aws cloudformation wait stack-update-complete --stack-name $StackName --region $AwsRegion
    } else {
        Write-Host "Aviso: Update pode ter falhado ou não há mudanças" -ForegroundColor Yellow
    }
} else {
    Write-Host "Criando nova stack..." -ForegroundColor Yellow
    $paramString = ($parameters | ForEach-Object { "`"$_`"" }) -join " "
    $cmd = "aws cloudformation create-stack --stack-name `"$StackName`" --template-body `"file://$templateFile`" --parameters $paramString --capabilities CAPABILITY_NAMED_IAM --region `"$AwsRegion`""
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Aguardando conclusão do create..." -ForegroundColor Green
        aws cloudformation wait stack-create-complete --stack-name $StackName --region $AwsRegion
    } else {
        Write-Host "Erro ao criar stack" -ForegroundColor Red
        exit 1
    }
}

# Obter outputs
Write-Host ""
Write-Host "=== Deploy concluído com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Outputs:" -ForegroundColor Cyan
aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs' --output table

# Obter IP público
$publicIp = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' --output text

if ($publicIp -and $publicIp -ne "None") {
    Write-Host ""
    Write-Host "IP Público: $publicIp" -ForegroundColor Green
    Write-Host "URL da Aplicação: http://$publicIp:3000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para acessar via SSH:" -ForegroundColor Cyan
    Write-Host "ssh -i ~/.ssh/$KeyPairName.pem ec2-user@$publicIp"
}
