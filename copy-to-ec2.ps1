# Script para copiar arquivos do projeto para a EC2
$EC2_IP = "54.233.203.231"
$EC2_USER = "ubuntu"
$KEY_FILE = "prontivus-keypair.pem"
$EC2_PATH = "/opt/prontivus"

Write-Host "Copiando arquivos para EC2..." -ForegroundColor Cyan
Write-Host "EC2: $EC2_USER@$EC2_IP" -ForegroundColor White
Write-Host ""

if (-not (Test-Path $KEY_FILE)) {
    Write-Host "Erro: Arquivo de chave nao encontrado: $KEY_FILE" -ForegroundColor Red
    exit 1
}

$itemsToCopy = @(
    "app",
    "components",
    "lib",
    "prisma",
    "public",
    "scripts",
    "types",
    "hooks",
    "infrastructure",
    "middleware.ts",
    "server.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "components.json",
    "prisma.config.ts"
)

$copied = 0
$failed = 0

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        Write-Host "Copiando: $item" -ForegroundColor Gray
        scp -i $KEY_FILE -r $item "${EC2_USER}@${EC2_IP}:${EC2_PATH}/" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $copied++
            Write-Host "  OK: $item" -ForegroundColor Green
        } else {
            $failed++
            Write-Host "  ERRO: $item" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Resumo: Copiados=$copied, Falhas=$failed" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "Todos os arquivos foram copiados com sucesso!" -ForegroundColor Green
}
