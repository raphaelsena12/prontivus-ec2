# 🚀 Início Rápido - Deploy Prontivus na AWS

## ⚡ Deploy Automatizado (Recomendado)

Execute o script completo que cria a infraestrutura e envia o código:

### No Linux/Mac/WSL/Git Bash:

```bash
cd infrastructure/cloudformation
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### No Windows PowerShell:

Você precisará usar WSL ou Git Bash para executar os scripts bash.

**Opção 1: Usar WSL**
```powershell
wsl
cd /mnt/c/Users/raphael.souza/Desktop/Prontivus\ -\ Copia/Prontivus\ -\ Copia/AS3.0/Prontivus\ 3.0/infrastructure/cloudformation
chmod +x deploy-complete.sh
./deploy-complete.sh
```

**Opção 2: Usar Git Bash**
```bash
# Abrir Git Bash e navegar até:
cd "/c/Users/raphael.souza/Desktop/Prontivus - Copia/Prontivus - Copia/AS3.0/Prontivus 3.0/infrastructure/cloudformation"
chmod +x deploy-complete.sh
./deploy-complete.sh
```

## 📋 Informações Necessárias

Antes de executar, tenha em mãos:

1. ✅ **Key Pair Name** (criado na AWS)
2. ✅ **Database URL** (PostgreSQL)
3. ✅ **NextAuth Secret** (gerar com: `openssl rand -base64 32`)
4. ✅ **NextAuth URL** (ex: `https://prontivus.com.br` ou `http://IP:3000`)
5. ⚠️ **Stripe Secret Key** (opcional)
6. ⚠️ **AWS Access Key ID e Secret** (opcional, se não usar IAM Role)
7. ⚠️ **Git Repository URL** (opcional - se não fornecer, faz upload manual)

## 🎯 O que o Script Faz

1. ✅ Cria/atualiza stack CloudFormation
2. ✅ Cria VPC, Subnets, Security Groups
3. ✅ Cria instância EC2 t2.micro
4. ✅ Instala Node.js, PM2, PostgreSQL client
5. ✅ Aguarda instância estar pronta
6. ✅ Faz upload do código (se não usar Git)
7. ✅ Instala dependências
8. ✅ Executa migrations do Prisma
9. ✅ Faz build da aplicação
10. ✅ Inicia aplicação com PM2

## 🔍 Verificar Status Após Deploy

```bash
# Obter IP público
PUBLIC_IP=$(aws cloudformation describe-stacks \
  --stack-name prontivus-ec2-production \
  --region sa-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text)

# Testar aplicação
curl http://$PUBLIC_IP:3000/api/health

# Ver status
ssh -i ~/.ssh/seu-key.pem ec2-user@$PUBLIC_IP 'pm2 status'
```

## 📚 Documentação Completa

- `README-EC2-STANDARD.md` - Documentação detalhada
- `GUIA-RAPIDO.md` - Guia passo a passo
