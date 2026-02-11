# Permissões IAM Necessárias

O usuário `prontivus` na conta `983740383268` precisa das seguintes permissões para criar a infraestrutura:

## Permissões Necessárias

### 1. EC2 (Elastic Compute Cloud)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Ou permissões específicas:
- `ec2:CreateKeyPair`
- `ec2:DescribeKeyPairs`
- `ec2:RunInstances`
- `ec2:DescribeInstances`
- `ec2:DescribeVpcs`
- `ec2:DescribeSubnets`
- `ec2:DescribeSecurityGroups`
- `ec2:CreateVpc`
- `ec2:CreateSubnet`
- `ec2:CreateSecurityGroup`
- `ec2:AllocateAddress`
- `ec2:AssociateAddress`
- `ec2:AuthorizeSecurityGroupIngress`
- `ec2:AuthorizeSecurityGroupEgress`
- `ec2:CreateInternetGateway`
- `ec2:AttachInternetGateway`
- `ec2:CreateRoute`
- `ec2:CreateRouteTable`
- `ec2:AssociateRouteTable`

### 2. CloudFormation
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Ou permissões específicas:
- `cloudformation:CreateStack`
- `cloudformation:UpdateStack`
- `cloudformation:DeleteStack`
- `cloudformation:DescribeStacks`
- `cloudformation:DescribeStackEvents`
- `cloudformation:ListStacks`
- `cloudformation:ValidateTemplate`

### 3. IAM (para criar roles)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "iam:CreateInstanceProfile",
        "iam:AddRoleToInstanceProfile",
        "iam:PassRole",
        "iam:GetRole",
        "iam:GetInstanceProfile"
      ],
      "Resource": "*"
    }
  ]
}
```

## Política IAM Completa Recomendada

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2FullAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationFullAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMForEC2Roles",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "iam:CreateInstanceProfile",
        "iam:AddRoleToInstanceProfile",
        "iam:PassRole",
        "iam:GetRole",
        "iam:GetInstanceProfile",
        "iam:ListRoles",
        "iam:ListInstanceProfiles"
      ],
      "Resource": "*"
    }
  ]
}
```

## Como Adicionar Permissões

### Opção 1: Via Console AWS
1. Acesse IAM Console
2. Vá em "Users" → "prontivus"
3. Clique em "Add permissions"
4. Selecione "Attach policies directly"
5. Adicione as políticas acima ou crie uma política customizada

### Opção 2: Via AWS CLI (se tiver permissão de admin)
```bash
# Criar política
aws iam put-user-policy \
  --user-name prontivus \
  --policy-name ProntivusInfraDeploy \
  --policy-document file://policy.json
```

### Opção 3: Solicitar ao Administrador
Envie este documento para o administrador da conta AWS para adicionar as permissões necessárias.

## Alternativa: Usar Role com Permissões

Se você não pode modificar as permissões do usuário, pode:
1. Assumir um role com as permissões necessárias
2. Ou usar credenciais temporárias de outro usuário/role

```bash
# Assumir role
aws sts assume-role \
  --role-arn arn:aws:iam::983740383268:role/DeployRole \
  --role-session-name prontivus-deploy
```

## Verificar Permissões Atuais

```bash
# Ver políticas do usuário
aws iam list-user-policies --user-name prontivus
aws iam list-attached-user-policies --user-name prontivus

# Ver grupos do usuário
aws iam list-groups-for-user --user-name prontivus
```
