# Script para verificar status da stack e obter IP público da EC2
# Uso: .\check-stack-status.ps1

$STACK_NAME = "prontivus-stack"
$REGION = "sa-east-1"

Write-Host "Verificando status da stack: $STACK_NAME" -ForegroundColor Cyan
Write-Host ""

$stackStatus = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].StackStatus" --output text

Write-Host "Status atual: $stackStatus" -ForegroundColor Yellow
Write-Host ""

if ($stackStatus -eq "CREATE_COMPLETE") {
    Write-Host "✅ Stack criada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Obtendo informações da EC2..." -ForegroundColor Cyan
    Write-Host ""
    
    # Obter IP público
    $publicIP = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='EC2PublicIP'].OutputValue" --output text
    $publicDNS = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='EC2PublicDNS'].OutputValue" --output text
    $instanceId = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='EC2InstanceId'].OutputValue" --output text
    $appURL = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApplicationURL'].OutputValue" --output text
    
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Informações da EC2:" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "IP Público: $publicIP" -ForegroundColor White
    Write-Host "DNS Público: $publicDNS" -ForegroundColor White
    Write-Host "Instance ID: $instanceId" -ForegroundColor White
    Write-Host "URL da Aplicação: $appURL" -ForegroundColor White
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Próximos Passos:" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Conecte-se na EC2 via SSH:" -ForegroundColor Yellow
    Write-Host "   ssh -i prontivus-keypair.pem ubuntu@$publicIP" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Atualize o NextAuthURL no CloudFormation:" -ForegroundColor Yellow
    Write-Host "   http://$publicIP:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Configure as variáveis de ambiente na EC2" -ForegroundColor Yellow
    Write-Host "4. Clone o repositório na EC2" -ForegroundColor Yellow
    Write-Host "5. Execute o primeiro deploy manual" -ForegroundColor Yellow
    Write-Host ""
    
} elseif ($stackStatus -eq "CREATE_IN_PROGRESS") {
    Write-Host "⏳ Stack ainda está sendo criada..." -ForegroundColor Yellow
    Write-Host "Aguarde alguns minutos e execute novamente este script." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Últimos eventos:" -ForegroundColor Cyan
    aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $REGION --max-items 3 --query "StackEvents[*].[Timestamp,ResourceStatus,LogicalResourceId]" --output table
} elseif ($stackStatus -like "*FAILED*" -or $stackStatus -like "*ROLLBACK*") {
    Write-Host "❌ Erro na criação da stack!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Eventos de erro:" -ForegroundColor Red
    aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $REGION --max-items 10 --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[Timestamp,LogicalResourceId,ResourceStatusReason]" --output table
} else {
    Write-Host "Status: $stackStatus" -ForegroundColor Yellow
}
