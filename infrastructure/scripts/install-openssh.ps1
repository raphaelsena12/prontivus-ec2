# Script para instalar OpenSSH Client no Windows
# Execute como Administrador: PowerShell (Admin) > .\install-openssh.ps1

Write-Host "Instalando OpenSSH Client..." -ForegroundColor Cyan

# Verificar se já está instalado
$sshInstalled = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'

if ($sshInstalled.State -eq 'Installed') {
    Write-Host "OpenSSH Client já está instalado!" -ForegroundColor Green
    Write-Host "Localização: $((Get-Command ssh).Source)" -ForegroundColor Green
} else {
    Write-Host "Instalando OpenSSH Client..." -ForegroundColor Yellow
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ OpenSSH Client instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar OpenSSH Client" -ForegroundColor Red
        Write-Host "Tente executar manualmente:" -ForegroundColor Yellow
        Write-Host "  Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "Agora você pode conectar usando:" -ForegroundColor Cyan
Write-Host "  ssh -i prontivus-keypair.pem ubuntu@56.125.239.99" -ForegroundColor White
Write-Host ""
