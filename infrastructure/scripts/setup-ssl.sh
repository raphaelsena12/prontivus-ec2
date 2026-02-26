#!/bin/bash
# Script para configurar SSL/HTTPS na EC2
# Execute na EC2: bash setup-ssl.sh

set -e

echo "=== Configurando SSL/HTTPS para Prontivus ==="
echo ""

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash setup-ssl.sh"
    exit 1
fi

# 1. Atualizar sistema
echo "1. Atualizando sistema..."
apt-get update -y

# 2. Instalar Certbot
echo ""
echo "2. Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 3. Configurar Nginx
echo ""
echo "3. Configurando Nginx..."

cat > /etc/nginx/sites-available/prontivus << 'EOF'
server {
    listen 80;
    server_name prontivus.com www.prontivus.com;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prontivus.com www.prontivus.com;

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
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/prontivus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
echo ""
echo "4. Testando configuração do Nginx..."
nginx -t

# Reiniciar Nginx
echo ""
echo "5. Reiniciando Nginx..."
systemctl restart nginx

echo ""
echo "✅ Nginx configurado!"
echo ""
echo "=== Próximos Passos ==="
echo ""
echo "1. Certifique-se de que o domínio prontivus.com está apontando para este servidor"
echo "2. Execute o Certbot para obter o certificado SSL:"
echo "   sudo certbot --nginx -d prontivus.com -d www.prontivus.com"
echo ""
echo "3. Adicione regra no Security Group para porta 443 (HTTPS)"
echo ""
echo "4. Atualize o .env:"
echo "   NEXTAUTH_URL=https://prontivus.com"
echo ""
echo "5. Reinicie o PM2:"
echo "   pm2 restart prontivus --update-env"
echo ""
