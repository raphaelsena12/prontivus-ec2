# Parâmetros CloudFormation - Prontivus

Este arquivo contém os parâmetros preenchidos baseados no seu arquivo `.env`.

## 📋 Parâmetros Configurados

Os seguintes parâmetros foram extraídos do seu `.env`:

| Parâmetro | Valor |
|-----------|-------|
| **KeyPairName** | `prontivus-keypair` |
| **DatabaseURL** | `postgresql://postgres:AmGRLans3P2RLFv8pyky@db-prontivus-new.crka8siog2ay.sa-east-1.rds.amazonaws.com:5432/db-prontivus-new` |
| **NextAuthURL** | `http://localhost:3000` ⚠️ *Atualizar após obter IP da EC2* |
| **NextAuthSecret** | `d0sULqJedg07lq0gsU+cbmMsiLrZqz0P9Z4pb2fEsck=` |
| **AllowedSSHIP** | `0.0.0.0/0` |
| **AWSRegion** | `sa-east-1` |
| **AWSAccessKeyId** | `YOUR_AWS_ACCESS_KEY_ID` |
| **AWSSecretAccessKey** | `YOUR_AWS_SECRET_ACCESS_KEY` |
| **S3BucketName** | `prontivus-documentos` |

## 🚀 Como Usar

### Opção 1: Via Console AWS

1. Acesse o Console AWS > CloudFormation
2. Clique em "Create stack" > "With new resources (standard)"
3. Em "Template source", selecione "Upload a template file"
4. Faça upload do arquivo `infrastructure/cloudformation/prontivus-stack.yaml`
5. Na seção "Parameters", preencha os valores acima
6. Revise e crie a stack

### Opção 2: Via AWS CLI (Linux/Mac)

```bash
# Tornar o script executável
chmod +x infrastructure/cloudformation/deploy-stack.sh

# Executar
./infrastructure/cloudformation/deploy-stack.sh
```

### Opção 3: Via AWS CLI (Windows PowerShell)

```powershell
# Executar
.\infrastructure\cloudformation\deploy-stack.ps1
```

### Opção 4: Via AWS CLI (Comando Manual)

```bash
aws cloudformation create-stack \
  --stack-name prontivus-stack \
  --template-body file://infrastructure/cloudformation/prontivus-stack.yaml \
  --parameters file://infrastructure/cloudformation/parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region sa-east-1
```

## ⚠️ Importante

1. **NextAuthURL**: Após criar a stack e obter o IP público da EC2, você precisa atualizar este parâmetro para `http://<IP_PUBLICO>:3000`

2. **AllowedSSHIP**: Por segurança, considere restringir para seu IP específico ao invés de `0.0.0.0/0`

3. **Credenciais AWS**: As credenciais estão no arquivo. Mantenha este arquivo seguro e não commite no Git.

## 📝 Próximos Passos

Após criar a stack:

1. Aguarde a criação completa (5-10 minutos)
2. Obtenha o IP público da EC2 nos Outputs da stack
3. Atualize o `NextAuthURL` se necessário
4. Configure as variáveis de ambiente na EC2 (Passo 5 do README principal)
5. Clone o repositório na EC2 (Passo 6 do README principal)
