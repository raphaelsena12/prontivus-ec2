# Configuração Route 53 para Prontivus

## Pré-requisitos

1. Ter um domínio registrado (ex: `prontivus.com.br`)
2. O domínio deve estar gerenciado no Route 53 ou ter os nameservers apontados para o Route 53

## Passo 1: Obter o IP do Elastic IP

O CloudFormation já criou um Elastic IP associado à EC2. Para obter o IP:

### Via AWS Console:
1. Acesse **EC2** → **Elastic IPs**
2. Procure por `ProntivusElasticIP`
3. Anote o IP público

### Via CloudFormation:
1. Acesse **CloudFormation** → Sua Stack
2. Aba **Outputs**
3. Procure por `EC2PublicIP` - esse é o Elastic IP

### Via CLI:
```bash
aws cloudformation describe-stacks \
  --stack-name prontivus-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`EC2PublicIP`].OutputValue' \
  --output text
```

## Passo 2: Criar Hosted Zone no Route 53 (se ainda não tiver)

1. Acesse **Route 53** → **Hosted zones**
2. Clique em **Create hosted zone**
3. Configure:
   - **Domain name**: `prontivus.com.br` (ou seu domínio)
   - **Type**: Public hosted zone
4. Clique em **Create**

## Passo 3: Criar Registro A

1. Na **Hosted zone** criada, clique em **Create record**
2. Configure:
   - **Record name**: 
     - Para domínio raiz: deixe em branco ou `@`
     - Para subdomínio: `app` (resultará em `app.prontivus.com.br`)
   - **Record type**: `A`
   - **Value**: Cole o IP do Elastic IP (obtido no Passo 1)
   - **TTL**: `300` (5 minutos) ou `3600` (1 hora)
   - **Routing policy**: Simple routing
3. Clique em **Create records**

## Passo 4: Configurar Nameservers (se o domínio não estiver no Route 53)

Se você registrou o domínio em outro registrar (ex: Registro.br, GoDaddy):

1. Na **Hosted zone**, copie os 4 **Nameservers** listados
2. Acesse o registrar do seu domínio
3. Configure os nameservers para apontar para os nameservers do Route 53
4. Aguarde a propagação (pode levar até 48 horas, geralmente 1-2 horas)

## Passo 5: Configurar NextAuth para usar o domínio

Após configurar o Route 53, atualize a variável `NEXTAUTH_URL` no `.env` da EC2:

```bash
# Na EC2
cd /opt/prontivus
sudo nano .env

# Atualizar a linha:
NEXTAUTH_URL=http://prontivus.com.br:3000
# ou
NEXTAUTH_URL=http://app.prontivus.com.br:3000

# Reiniciar aplicação
pm2 restart prontivus
```

## Passo 6: Configurar Nginx como Reverse Proxy (Opcional mas Recomendado)

Para remover a porta `:3000` da URL e usar HTTPS:

1. Configure o Nginx na EC2 para fazer proxy reverso
2. Configure SSL com Let's Encrypt
3. Atualize o Route 53 para apontar para o domínio sem porta

### Exemplo de configuração Nginx:

```nginx
server {
    listen 80;
    server_name prontivus.com.br www.prontivus.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Verificação

Após configurar, teste:

```bash
# Verificar DNS
nslookup prontivus.com.br
# ou
dig prontivus.com.br

# Testar acesso
curl -I http://prontivus.com.br:3000
```

## Notas Importantes

- O Elastic IP é estático e não muda mesmo se a instância for reiniciada
- A propagação DNS pode levar até 48 horas (geralmente 1-2 horas)
- Se usar subdomínio, certifique-se de criar o registro correto no Route 53
- Para produção, considere usar HTTPS com certificado SSL (Let's Encrypt)
