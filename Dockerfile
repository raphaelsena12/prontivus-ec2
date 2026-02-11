# Dockerfile para Prontivus 3.0
# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar todas as dependências (incluindo devDependencies para tsx)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar arquivos de configuração primeiro
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY next.config.ts ./

# Copiar schema do Prisma e config
COPY prisma ./prisma
COPY prisma.config.ts ./

# Gerar Prisma Client ANTES de copiar o resto do código
RUN npx prisma generate

# Copiar o resto do código (agora o Prisma Client já está gerado)
COPY . .

# Build da aplicação Next.js
ENV NEXT_TELEMETRY_DISABLED 1
# Passar variáveis de ambiente como build args (valores dummy para o build)
ARG DATABASE_URL
ARG STRIPE_SECRET_KEY
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ENV DATABASE_URL=${DATABASE_URL:-postgresql://dummy:dummy@localhost:5432/dummy}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-dummy_key}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-dummy_secret}
ENV NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instalar wget para health check
RUN apk add --no-cache wget

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copiar arquivos adicionais necessários para o server.ts customizado
# IMPORTANTE: Copiar lib ANTES do standalone para garantir que os arquivos estejam disponíveis
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Garantir que o arquivo transcribe-websocket.ts está presente
# Se o standalone sobrescreveu, copiar novamente
COPY --from=builder /app/lib/transcribe-websocket.ts ./lib/transcribe-websocket.ts

# Copiar node_modules necessários (tsx está em devDependencies, mas necessário em runtime)
# Copiar apenas node_modules de produção e tsx
COPY --from=builder /app/node_modules ./node_modules

# Configurar permissões
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar a aplicação usando tsx (que está em node_modules)
CMD ["node_modules/.bin/tsx", "server.ts"]

