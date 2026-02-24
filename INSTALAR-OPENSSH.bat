@echo off
echo ==========================================
echo Instalando OpenSSH Client no Windows
echo ==========================================
echo.
echo Este script precisa ser executado como Administrador!
echo.
pause

powershell -Command "Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo OpenSSH instalado com sucesso!
    echo ==========================================
    echo.
    echo Agora voce pode conectar usando:
    echo   ssh -i prontivus-keypair.pem ubuntu@56.125.239.99
    echo.
) else (
    echo.
    echo ==========================================
    echo ERRO: Falha ao instalar OpenSSH
    echo ==========================================
    echo.
    echo Certifique-se de executar como Administrador:
    echo 1. Clique com botao direito neste arquivo
    echo 2. Selecione "Executar como administrador"
    echo.
)

pause
