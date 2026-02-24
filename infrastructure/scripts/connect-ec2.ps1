# Script para conectar na EC2 via SSH
# Execute: .\connect-ec2.ps1

$EC2_IP = "56.125.239.99"
$EC2_USER = "ubuntu"
$KEY_FILE = "prontivus-keypair.pem"

Write-Host "Conectando na EC2..." -ForegroundColor Cyan
Write-Host "IP: $EC2_IP" -ForegroundColor White
Write-Host "Usuário: $EC2_USER" -ForegroundColor White
Write-Host ""

# Verificar se o arquivo da chave existe
if (-not (Test-Path $KEY_FILE)) {
    Write-Host "❌ Erro: Arquivo de chave não encontrado: $KEY_FILE" -ForegroundColor Red
    Write-Host "Certifique-se de que o arquivo está no diretório atual." -ForegroundColor Yellow
    exit 1
}

# Verificar se SSH está disponível
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshPath) {
    Write-Host "❌ SSH não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "1. Abra PowerShell como Administrador" -ForegroundColor White
    Write-Host "2. Execute: .\infrastructure\scripts\install-openssh.ps1" -ForegroundColor White
    Write-Host "   OU" -ForegroundColor White
    Write-Host "   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor White
    exit 1
}

Write-Host "Conectando..." -ForegroundColor Yellow
Write-Host ""

# Conectar via SSH
ssh -i $KEY_FILE $EC2_USER@$EC2_IP
