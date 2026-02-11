# Script interativo para deploy
Write-Host "=== Deploy Prontivus - Configuração ===" -ForegroundColor Green
Write-Host ""

# Solicitar informações
$keyPairName = Read-Host "Key Pair Name (obrigatório)"
$databaseUrl = Read-Host "Database URL (obrigatório)" -AsSecureString
$databaseUrlPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($databaseUrl))

$nextAuthSecret = Read-Host "NextAuth Secret (obrigatório)" -AsSecureString
$nextAuthSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($nextAuthSecret))

$nextAuthUrl = Read-Host "NextAuth URL [http://localhost:3000]"
if ([string]::IsNullOrEmpty($nextAuthUrl)) { $nextAuthUrl = "http://localhost:3000" }

$stripeSecret = Read-Host "Stripe Secret Key (opcional, Enter para pular)" -AsSecureString
$stripeSecretPlain = ""
if ($stripeSecret.Length -gt 0) {
    $stripeSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($stripeSecret))
}

$gitRepo = Read-Host "Git Repository URL (opcional, Enter para upload manual)"
$awsRegion = Read-Host "AWS Region [sa-east-1]"
if ([string]::IsNullOrEmpty($awsRegion)) { $awsRegion = "sa-east-1" }

Write-Host ""
Write-Host "Iniciando deploy..." -ForegroundColor Yellow

# Executar deploy
$params = @{
    KeyPairName = $keyPairName
    DatabaseUrl = $databaseUrlPlain
    NextAuthSecret = $nextAuthSecretPlain
    NextAuthUrl = $nextAuthUrl
    AwsRegion = $awsRegion
}

if (![string]::IsNullOrEmpty($stripeSecretPlain)) {
    $params.StripeSecretKey = $stripeSecretPlain
}

if (![string]::IsNullOrEmpty($gitRepo)) {
    $params.GitRepositoryUrl = $gitRepo
}

& .\deploy.ps1 @params
