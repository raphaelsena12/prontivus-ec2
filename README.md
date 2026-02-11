# Prontivus 3.0

Projeto Next.js 14+ com TypeScript, Tailwind CSS, ShadcnUI e configurações completas.

## 🚀 Tecnologias

- **Next.js 16.1.4** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **ShadcnUI** - Componentes UI acessíveis
- **Next Auth** - Autenticação
- **Prisma** - ORM para PostgreSQL
- **Zod** - Validação de schemas
- **React Hook Form** - Gerenciamento de formulários
- **ESLint + Prettier** - Linting e formatação de código

## 📦 Componentes ShadcnUI Instalados

- button, input, label, card, form
- select, dropdown-menu, dialog, alert
- table, badge, separator, tabs
- sonner (toast), avatar, checkbox
- navigation-menu, sheet

## 🛠️ Configuração

### Instalação

```bash
npm install
```

### Variáveis de Ambiente

Configure o arquivo `.env` com as seguintes variáveis:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-aqui"

# Configurações SMTP (Email)
SMTP_HOST="smtpout.secureserver.net"
SMTP_PORT="465"
SMTP_USER="suporte@prontivus.com"
SMTP_PASSWORD="ef&!.UHq=7D9k!m"
```

### Banco de Dados

1. Configure o arquivo `.env` com a `DATABASE_URL` do PostgreSQL
2. Inicialize o Prisma e execute as migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

3. Execute o seed para popular dados iniciais:

```bash
npm run db:seed
```

O seed cria:
- 3 planos padrão (Básico, Intermediário, Profissional)
- 1 Super Admin (email: `admin@system.com`, senha: `Admin@123`)

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o ESLint
- `npm run lint:fix` - Corrige problemas do ESLint automaticamente
- `npm run format` - Formata o código com Prettier
- `npm run format:check` - Verifica formatação sem alterar arquivos
- `npm run db:seed` - Executa o seed do banco de dados
- `npm run db:migrate` - Cria e aplica migrations
- `npm run db:generate` - Gera o Prisma Client

## 📁 Estrutura do Projeto

```
├── app/                    # App Router do Next.js
├── components/             # Componentes React
│   └── ui/                # Componentes ShadcnUI
├── lib/                   # Utilitários e configurações
├── prisma/                # Schema e migrations do Prisma
├── public/                # Arquivos estáticos
└── ...
```

## 🎨 Estilização

O projeto utiliza Tailwind CSS v4 com variáveis CSS do ShadcnUI. Os temas podem ser configurados através das variáveis em `app/globals.css`.

## 🔐 Autenticação

A autenticação está configurada com Next Auth. Configure as providers e callbacks conforme necessário.

## 📚 Documentação

- [Next.js Docs](https://nextjs.org/docs)
- [ShadcnUI Docs](https://ui.shadcn.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next Auth Docs](https://next-auth.js.org)
