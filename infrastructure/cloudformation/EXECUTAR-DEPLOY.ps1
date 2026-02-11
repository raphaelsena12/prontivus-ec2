# ============================================
# EXECUTAR ESTE COMANDO COM SUAS INFORMAÇÕES
# ============================================
#
# Substitua os valores abaixo pelos seus:
#
# .\deploy.ps1 `
#   -KeyPairName "NOME-DA-SUA-CHAVE" `
#   -DatabaseUrl "postgresql://usuario:senha@host:5432/database" `
#   -NextAuthSecret "seu-secret-aqui" `
#   -NextAuthUrl "http://localhost:3000" `
#   -AwsRegion "sa-east-1"
#
# Exemplo completo:
#
# .\deploy.ps1 `
#   -KeyPairName "CHAVE-SV-SITE-UBUNTU" `
#   -DatabaseUrl "postgresql://user:pass@db.example.com:5432/prontivus" `
#   -NextAuthSecret "abc123xyz456" `
#   -NextAuthUrl "http://localhost:3000" `
#   -AwsRegion "sa-east-1" `
#   -GitRepositoryUrl "https://github.com/seu-usuario/prontivus.git"
#
# ============================================

Write-Host "Por favor, execute o comando acima com suas informações reais" -ForegroundColor Yellow
Write-Host ""
Write-Host "Informações necessárias:" -ForegroundColor Cyan
Write-Host "1. Key Pair Name (ex: CHAVE-SV-SITE-UBUNTU)" -ForegroundColor White
Write-Host "2. Database URL (ex: postgresql://user:pass@host:5432/db)" -ForegroundColor White
Write-Host "3. NextAuth Secret (gerar com: openssl rand -base64 32)" -ForegroundColor White
Write-Host ""
Write-Host "Para gerar NextAuth Secret:" -ForegroundColor Green
Write-Host "openssl rand -base64 32" -ForegroundColor Yellow
