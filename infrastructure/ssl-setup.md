# Configuração SSL/HTTPS para Prontivus na AWS

## Passo 1: Criar Certificado SSL no AWS Certificate Manager (ACM)

### Via AWS Console:

1. Acesse **AWS Certificate Manager (ACM)**
2. Certifique-se de estar na região **sa-east-1** (São Paulo)
3. Clique em **Request a certificate**
4. Selecione **Request a public certificate**
5. Configure:
   - **Domain names**:
     - `prontivus.com`
     - `*.prontivus.com` (opcional, para subdomínios)
   - **Validation method**: **DNS validation** (recomendado)
6. Clique em **Request**

### Via AWS CLI:

```bash
aws acm request-certificate \
  --domain-name prontivus.com \
  --subject-alternative-names "*.prontivus.com" \
  --validation-method DNS \
  --region sa-east-1
```

## Passo 2: Validar o Certificado via DNS

Após criar o certificado:

1. No ACM, clique no certificado solicitado
2. Na seção **Domains**, você verá registros CNAME para validação
3. Copie cada registro CNAME
4. No **Route 53**:
   - Acesse a Hosted Zone de `prontivus.com`
   - Clique em **Create record**
   - Cole o **Record name** e **Value** do CNAME
   - Tipo: **CNAME**
   - TTL: 300
   - Clique em **Create records**
5. Aguarde a validação (pode levar alguns minutos)

### Verificar Status da Validação:

```bash
aws acm describe-certificate \
  --certificate-arn <ARN_DO_CERTIFICADO> \
  --region sa-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ValidationStatus]' \
  --output table
```

## Passo 3: Configurar Nginx como Reverse Proxy com SSL

### 3.1. Instalar Certbot (Let's Encrypt) na EC2

```bash
# Conectar na EC2
ssh -i prontivus-keypair.pem ubuntu@54.233.203.231

# Atualizar sistema
sudo apt-get update

# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

### 3.2. Configurar Nginx

```bash
# Criar configuração do Nginx
sudo nano /etc/nginx/sites-available/prontivus
```

Cole este conteúdo:

```nginx
server {
    listen 80;
    server_name prontivus.com www.prontivus.com;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prontivus.com www.prontivivus.com;

    # Certificados SSL (serão configurados pelo Certbot)
    # ssl_certificate /etc/letsencrypt/live/prontivus.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/prontivus.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy para aplicação Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support (para Socket.IO)
    location /api/socket {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.3. Habilitar Site e Testar Configuração

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/prontivus /etc/nginx/sites-enabled/

# Remover configuração padrão (se existir)
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Se estiver OK, reiniciar Nginx
sudo systemctl restart nginx
```

## Passo 4: Obter Certificado SSL com Certbot

```bash
# Obter certificado SSL do Let's Encrypt
sudo certbot --nginx -d prontivus.com -d www.prontivus.com

# Seguir as instruções:
# - Email: seu email
# - Aceitar termos
# - Escolher redirecionar HTTP para HTTPS (opção 2)
```

O Certbot irá:
- Obter o certificado
- Configurar automaticamente o Nginx
- Configurar renovação automática

## Passo 5: Atualizar Security Group

Adicionar regra para HTTPS (porta 443):

1. **EC2** → **Security Groups** → **ProntivusSecurityGroup**
2. **Inbound rules** → **Edit inbound rules**
3. **Add rule**:
   - Type: **HTTPS**
   - Port: **443**
   - Source: **0.0.0.0/0**
   - Description: Allow HTTPS access
4. **Save rules**

## Passo 6: Atualizar NEXTAUTH_URL

```bash
# Na EC2
cd /opt/prontivus
sudo nano .env

# Atualizar para HTTPS:
NEXTAUTH_URL=https://prontivus.com

# Reiniciar aplicação
pm2 restart prontivus --update-env
```

## Passo 7: Verificar Renovação Automática

```bash
# Testar renovação automática
sudo certbot renew --dry-run

# Verificar se o timer está ativo
sudo systemctl status certbot.timer
```

## Verificação Final

```bash
# Testar HTTPS
curl -I https://prontivus.com

# Verificar certificado
openssl s_client -connect prontivus.com:443 -servername prontivus.com
```

## Alternativa: Usar ACM com Application Load Balancer

Se preferir usar o certificado do ACM (em vez de Let's Encrypt):

1. Criar Application Load Balancer (ALB)
2. Anexar o certificado do ACM ao ALB
3. Configurar listener HTTPS (443)
4. Target Group apontando para EC2:3000
5. Atualizar Route 53 para apontar para o ALB

Esta opção é mais robusta mas tem custo adicional do ALB.
