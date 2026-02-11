# Comandos para Aplicar Permissões

Como o usuário `prontivus` não tem permissão para modificar suas próprias políticas, você precisa executar estes comandos **como administrador** ou com credenciais que tenham permissão IAM.

## Opção 1: Via AWS CLI (como Admin)

Execute estes comandos um por um:

```bash
# Aplicar AmazonEC2FullAccess
aws iam attach-user-policy \
  --user-name prontivus \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

# Aplicar IAMFullAccess
aws iam attach-user-policy \
  --user-name prontivus \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

# Aplicar AWSCloudFormationFullAccess
aws iam attach-user-policy \
  --user-name prontivus \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess
```

## Opção 2: Via Script PowerShell

```powershell
.\aplicar-permissoes.ps1
```

## Opção 3: Via Script Bash

```bash
chmod +x aplicar-permissoes.sh
./aplicar-permissoes.sh
```

## Opção 4: Via Console AWS

1. Acesse o IAM Console: https://console.aws.amazon.com/iam/
2. Vá em **Users** → **prontivus**
3. Clique em **Add permissions**
4. Selecione **Attach policies directly**
5. Procure e selecione:
   - ✅ AmazonEC2FullAccess
   - ✅ IAMFullAccess
   - ✅ AWSCloudFormationFullAccess
6. Clique em **Next** e depois **Add permissions**

## Verificar Permissões Aplicadas

```bash
aws iam list-attached-user-policies --user-name prontivus --output table
```

## Testar Permissões

Após aplicar as permissões, teste se funcionam:

```bash
# Testar EC2
aws ec2 describe-key-pairs --region sa-east-1

# Testar CloudFormation
aws cloudformation list-stacks --region sa-east-1

# Testar IAM
aws iam list-users
```

## Nota Importante

⚠️ **IAMFullAccess** dá acesso total ao IAM. Em produção, considere usar permissões mais restritas. Para este deploy, as três políticas são necessárias.
