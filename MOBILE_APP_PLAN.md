# Prontivus Mobile — Plano de Desenvolvimento

**App do Paciente | React Native + Expo | iOS + Android**
**Versão do plano:** 1.0 — 2026-03-04

---

## 1. Visão Geral

App mobile para pacientes do Prontivus com comunicação direta com o SaaS existente via API REST + JWT.

### Funcionalidades

| Módulo | Descrição |
|---|---|
| Autenticação | Login, Logout, Recuperação de senha, Biometria |
| Histórico de Consultas | Lista, filtros, detalhe, link para telemedicina |
| Histórico de Prescrições | Lista por consulta, visualização, download PDF |
| Histórico de Exames | Lista de solicitações, laudos disponíveis |
| Histórico de Pagamentos | Lista, status, recibo PDF |
| Agendamento | Exclusivamente para telemedicina |
| Pagamento Online | Stripe — Cartão, PIX, Apple Pay, Google Pay |

> **Telemedicina:** a sessão de vídeo ocorre fora do app, via link aberto no navegador (Safari/Chrome). O app apenas exibe o link e oferece o botão "Abrir no navegador".

---

## 2. Tecnologia

### Por que React Native + Expo

| Critério | React Native + Expo | Flutter | Swift/Kotlin |
|---|---|---|---|
| Linguagem | **TypeScript** (igual ao SaaS) | Dart (nova linguagem) | Swift + Kotlin (2 codebases) |
| Reuso de types/interfaces | **100% compatível** | Zero | Zero |
| Curva de aprendizado | Mínima | Alta | Muito alta |
| Build iOS sem Mac | **EAS Build (cloud)** | Complexo | Impossível |
| Manutenção | 1 equipe, 1 linguagem | Equipe separada | 2 equipes |

### Stack de Bibliotecas

| Categoria | Biblioteca | Motivo |
|---|---|---|
| Framework | Expo SDK 52 (managed) | Build cloud, sem Xcode local |
| Navegação | Expo Router v4 | File-based routing (igual Next.js) |
| Estado server | TanStack Query v5 | Cache, sync, loading states |
| Auth storage | Expo SecureStore | JWT criptografado no dispositivo |
| Estilo | NativeWind v4 (Tailwind RN) | Mesma sintaxe do SaaS web |
| Componentes UI | React Native Paper | Design system profissional |
| Pagamentos | Stripe React Native SDK | PIX + Cartão + Apple/Google Pay |
| Forms | React Hook Form + Zod | Validação compartilhável com backend |
| Notificações | Expo Notifications | Push (consulta confirmada, etc.) |
| HTTP | Axios + interceptors | JWT injection automático |
| PDF | Expo Print + expo-sharing | Download de receitas/exames |
| Biometria | Expo Local Authentication | Face ID / Touch ID |
| Browser | Expo Linking | Abrir telemedicina no navegador |

---

## 3. Estrutura do Projeto

```
prontivus-mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── recuperar-senha.tsx
│   ├── (app)/
│   │   ├── _layout.tsx               # Tab navigator
│   │   ├── index.tsx                 # Dashboard
│   │   ├── consultas/
│   │   │   ├── index.tsx             # Histórico de consultas
│   │   │   └── [id].tsx              # Detalhe da consulta + link telemedicina
│   │   ├── agendar/
│   │   │   ├── index.tsx             # Selecionar médico
│   │   │   ├── horarios.tsx          # Selecionar data/hora
│   │   │   ├── confirmacao.tsx       # Resumo
│   │   │   └── pagamento.tsx         # Stripe checkout
│   │   ├── prescricoes/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── exames/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── pagamentos/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   └── perfil.tsx
│   └── _layout.tsx                   # Root layout (auth guard)
├── components/
│   ├── ui/                           # Design system base
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   ├── consultas/
│   │   ├── ConsultaCard.tsx
│   │   └── StatusBadge.tsx
│   ├── pagamentos/
│   │   └── PagamentoCard.tsx
│   └── shared/
│       ├── Header.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Axios instance + interceptors
│   │   ├── consultas.ts
│   │   ├── agendamentos.ts
│   │   ├── prescricoes.ts
│   │   ├── exames.ts
│   │   └── pagamentos.ts
│   ├── auth/
│   │   ├── context.tsx               # AuthContext + Provider
│   │   └── storage.ts                # SecureStore helpers
│   ├── hooks/
│   │   ├── useConsultas.ts
│   │   ├── useAgendamento.ts
│   │   ├── usePrescricoes.ts
│   │   ├── useExames.ts
│   │   └── usePagamentos.ts
│   └── types/
│       ├── consulta.ts
│       ├── prescricao.ts
│       ├── exame.ts
│       └── pagamento.ts
├── constants/
│   └── theme.ts                      # Cores, tipografia, espaçamentos
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── app.json
├── eas.json
└── package.json
```

---

## 4. Integração com o SaaS

### Autenticação

O app usa o endpoint de credentials do NextAuth diretamente:

```
POST /api/auth/callback/credentials
  body: { email, password, csrfToken }
  response: JWT (session token)
```

O JWT é armazenado no `Expo SecureStore` e injetado em todas as requests via interceptor Axios:

```
Authorization: Bearer <jwt>
```

### Endpoints Utilizados

| Feature | Método | Endpoint | Status no SaaS |
|---|---|---|---|
| Login | POST | `/api/auth/callback/credentials` | Existente |
| Logout | POST | `/api/auth/signout` | Existente |
| Recuperar senha | POST | `/api/auth/recuperar-senha` | **Criar** |
| Listar consultas | GET | `/api/paciente/consultas` | Existente |
| Listar prescrições | GET | `/api/paciente/prescricoes` | Existente |
| Listar pagamentos | GET | `/api/paciente/pagamentos` | Existente |
| Listar médicos | GET | `/api/paciente/medicos` | Existente |
| Horários disponíveis | GET | `/api/paciente/horarios-disponiveis` | Existente |
| Criar agendamento | POST | `/api/paciente/agendamentos` | Existente |
| Checkout pagamento | POST | `/api/paciente/telemedicina/checkout` | Existente (generalizar) |
| Registrar push token | POST | `/api/paciente/push-token` | **Criar** |

**Total de novos endpoints no SaaS: 2**

### Fluxo de Autenticação

```
App abre
  │
  ├─ Token no SecureStore?
  │     ├─ Sim → Validar expiração → Home
  │     └─ Não → Tela de Login
  │
Login
  │
  ├─ POST /api/auth/callback/credentials
  ├─ Salvar JWT no SecureStore
  ├─ Salvar push token no servidor
  └─ Redirecionar para Home
```

---

## 5. Fluxos de Tela

### Agendamento de Telemedicina

```
[Tab "Agendar"]
      │
      ├─ Lista de médicos disponíveis
      │       └─ Selecionar médico
      │
      ├─ Calendário com datas disponíveis
      │       └─ Selecionar data → horários disponíveis
      │
      ├─ Tela de confirmação
      │       └─ Resumo: médico, data, hora, valor
      │
      ├─ Pagamento Stripe (Payment Sheet)
      │       └─ Cartão / PIX / Apple Pay / Google Pay
      │
      └─ Sucesso
              └─ Email enviado pelo SaaS com link da sessão
              └─ Consulta aparece em "Minhas Consultas"
```

### Acesso à Telemedicina

```
[Minhas Consultas]
      │
      └─ Consulta com status TELEMEDICINA + sessão ativa
              │
              └─ Botão "Entrar na Consulta"
                      │
                      └─ Linking.openURL(linkDaSessao)
                              │
                              └─ Abre Safari/Chrome
                                      └─ /telemedicina/acesso?token=...
                                              └─ (fluxo existente no SaaS)
```

### Histórico de Prescrições

```
[Prescrições]
      │
      ├─ Lista agrupada por consulta
      │
      └─ Detalhe
              ├─ Medicamento, dosagem, posologia, duração
              └─ Botão "Baixar PDF"
                      └─ Expo Print → Share Sheet (salvar ou compartilhar)
```

---

## 6. Design

### Identidade Visual

- Paleta baseada na identidade do Prontivus (SaaS web)
- Tema claro padrão, tema escuro opcional (Fase 2+)
- Tipografia: Inter (mesma do SaaS)
- Ícones: Lucide React Native

### Componentes Base (Design System)

```typescript
// constants/theme.ts
export const colors = {
  primary:    '#0EA5E9',   // Azul Prontivus
  success:    '#22C55E',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  neutral:    '#64748B',
  background: '#F8FAFC',
  surface:    '#FFFFFF',
  text:       '#0F172A',
  textMuted:  '#94A3B8',
}
```

### Navegação por Tabs

```
[ Home ]  [ Consultas ]  [ Agendar ]  [ Histórico ]  [ Perfil ]
```

---

## 7. Fases de Implementação

### Fase 1 — Fundação (1–2 semanas)
- [ ] Setup Expo + TypeScript + NativeWind + Expo Router
- [ ] Design system: cores, tipografia, componentes base
- [ ] AuthContext + SecureStore + Axios interceptors
- [ ] Telas de Login e Recuperação de senha
- [ ] Biometria (Face ID / Touch ID) após primeiro login
- [ ] Navegação por tabs (estrutura vazia)

### Fase 2 — Históricos (1–2 semanas)
- [ ] TanStack Query setup + QueryClient
- [ ] Histórico de Consultas (lista + detalhe + link telemedicina)
- [ ] Histórico de Prescrições (lista + download PDF)
- [ ] Histórico de Exames (lista + laudos)
- [ ] Histórico de Pagamentos (lista + recibo PDF)
- [ ] Dashboard com próxima consulta e pendências

### Fase 3 — Agendamento e Pagamento (1–2 semanas)
- [ ] Fluxo de agendamento: médico → data/hora → confirmação
- [ ] Integração Stripe Payment Sheet
- [ ] Suporte a PIX, Cartão, Apple Pay, Google Pay
- [ ] Tela de sucesso + feedback visual
- [ ] Criar endpoint `POST /api/paciente/push-token` no SaaS
- [ ] Push notifications: consulta confirmada, lembrete, pagamento

### Fase 4 — Polimento e Deploy (1 semana)
- [ ] Testes em dispositivo real (iOS + Android)
- [ ] Splash screen e ícones finais
- [ ] `app.json` completo (bundleIdentifier, versões, permissões)
- [ ] `eas.json` com perfis development / preview / production
- [ ] EAS Build production (iOS + Android)
- [ ] TestFlight (iOS) + Play Store Internal Track (Android)
- [ ] Testes com usuários reais
- [ ] Submissão App Store + Play Store

---

## 8. Pipeline de Build e Publicação

### Configuração (uma vez)

```json
// app.json
{
  "expo": {
    "name": "Prontivus",
    "slug": "prontivus-paciente",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.prontivus.paciente",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.prontivus.paciente",
      "versionCode": 1
    }
  }
}
```

```json
// eas.json
{
  "build": {
    "development": {
      "ios": { "simulator": true }
    },
    "preview": {
      "ios": { "distribution": "internal" }
    },
    "production": {
      "ios": { "distribution": "store" },
      "android": { "buildType": "apk" }
    }
  }
}
```

### Comandos

```bash
# Build iOS produção (roda em servidores Expo, não precisa de Mac)
eas build --platform ios --profile production

# Submeter direto ao App Store Connect
eas submit --platform ios --latest

# Build Android
eas build --platform android --profile production
```

### Timeline de Publicação

```
Semana 1-2   Setup + Auth + Design System
Semana 3-4   Históricos
Semana 5-6   Agendamento + Pagamento
Semana 7     Polimento + EAS Build
Semana 7     TestFlight (sem review Apple, para testes internos)
Semana 8     Submissão App Store Review (1–7 dias)
Semana 8-9   Aprovação → Publicação na loja
```

### Custos

| Item | Valor |
|---|---|
| Apple Developer Program | US$ 99/ano |
| Google Play Developer | US$ 25 (único) |
| EAS Build (até 30 builds/mês) | Gratuito |
| EAS Build ilimitado | US$ 19/mês (opcional) |

---

## 9. Novos Endpoints Necessários no SaaS

### `POST /api/auth/recuperar-senha`

```typescript
// Body
{ email: string }

// Response
{ message: "Email enviado se o endereço existir" }

// Ação: gerar token temporário + enviar email com link de redefinição
```

### `POST /api/paciente/push-token`

```typescript
// Body
{ token: string, plataforma: "ios" | "android" }

// Response
{ success: true }

// Ação: salvar token de push no registro do paciente para envio de notificações
```

---

## 10. Permissões do App

### iOS (`Info.plist`)

```
NSFaceIDUsageDescription — "Para login rápido com Face ID"
```

### Android (`AndroidManifest.xml`)

```
USE_FINGERPRINT
USE_BIOMETRIC
INTERNET
RECEIVE_BOOT_COMPLETED    (notificações)
VIBRATE                   (notificações)
```

> Sem permissões de câmera ou microfone — a telemedicina ocorre fora do app.

---

## 11. Segurança

- JWT armazenado apenas no `Expo SecureStore` (nunca AsyncStorage)
- HTTPS obrigatório para todas as chamadas de API
- Biometria como camada adicional de acesso (não substitui senha)
- Nenhum dado sensível em logs de produção
- Timeout de sessão: 30 dias (igual ao SaaS web)
- Token revogado no logout (chamada ao `/api/auth/signout`)

---

*Plano gerado em 2026-03-04. Sujeito a ajustes conforme desenvolvimento.*
