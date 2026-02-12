---
name: Sistema Telemedicina AWS Chime
overview: Implementar sistema completo de telemedicina usando AWS Chime SDK com compliance LGPD, logs de auditoria, segurança e integração com a UI existente. O sistema não gravará vídeo, apenas áudio/transcrição, com retenção de dados de 10 anos.
todos:
  - id: "1"
    content: Atualizar Prisma schema com modelos TelemedicinaSession, AuditLog e ConsentimentoLGPD
    status: pending
  - id: "2"
    content: Criar migration do banco de dados para novos modelos
    status: pending
    dependencies:
      - "1"
  - id: "3"
    content: Instalar dependências AWS Chime SDK (amazon-chime-sdk-js, @aws-sdk/client-chime)
    status: pending
  - id: "4"
    content: Configurar IAM roles e políticas AWS para Chime SDK
    status: pending
  - id: "5"
    content: Criar serviço AWS Chime (lib/aws/chime-service.ts) para gerenciar meetings
    status: pending
    dependencies:
      - "3"
      - "4"
  - id: "6"
    content: Criar sistema de logs de auditoria (lib/telemedicina/audit-logger.ts)
    status: pending
    dependencies:
      - "1"
  - id: "7"
    content: Criar utilitários LGPD (lib/telemedicina/lgpd-compliance.ts e consent-manager.ts)
    status: pending
    dependencies:
      - "1"
  - id: "8"
    content: Criar API routes para sessões de telemedicina (criar, join, encerrar)
    status: pending
    dependencies:
      - "5"
      - "6"
      - "7"
  - id: "9"
    content: Criar API route para gerenciar consentimentos LGPD
    status: pending
    dependencies:
      - "7"
  - id: "10"
    content: Criar componente React Chime (components/telemedicina/chime-video-call.tsx)
    status: pending
    dependencies:
      - "3"
  - id: "11"
    content: Criar hook use-chime-session para gerenciar estado da sessão
    status: pending
    dependencies:
      - "10"
  - id: "12"
    content: Integrar componente Chime na UI existente (atendimento-content.tsx)
    status: pending
    dependencies:
      - "10"
      - "11"
      - "8"
  - id: "13"
    content: Implementar validações de segurança e autorização nas APIs
    status: pending
    dependencies:
      - "8"
  - id: "14"
    content: Configurar CloudWatch e monitoramento
    status: pending
    dependencies:
      - "5"
  - id: "15"
    content: Testar fluxo completo de telemedicina e logs de auditoria
    status: pending
    dependencies:
      - "12"
      - "13"
      - "14"
---

# Sistema de Telemedicina com AWS Chime SDK - Implementação Completa

## Visão Geral

Implementar sistema de telemedicina seguro e em compliance usando AWS Chime SDK, integrando com a UI existente em `app/(protected)/medico/atendimento/atendimento-content.tsx`. O sistema incluirá autenticação, logs de auditoria, compliance LGPD, e integração com a infraestrutura AWS já existente.

## Arquitetura

```mermaid
graph TB
    subgraph Frontend["Frontend (React/Next.js)"]
        UI[UI Telemedicina Existente]
        ChimeComponent[Componente Chime SDK]
        TranscriptionHook[useTranscription Hook]
    end
    
    subgraph Backend["Backend (Next.js API Routes)"]
        ChimeAPI[API Chime - Criar/Join Meeting]
        AuthAPI[API Autenticação]
        LogsAPI[API Logs Auditoria]
        ConsentAPI[API Consentimento LGPD]
    end
    
    subgraph AWS["AWS Services"]
        ChimeSDK[AWS Chime SDK]
        Transcribe[AWS Transcribe - já configurado]
        S3[AWS S3 - armazenar logs]
        CloudWatch[CloudWatch Logs]
        IAM[IAM Roles]
    end
    
    subgraph Database["Database (PostgreSQL)"]
        ConsultaModel[Model Consulta]
        TelemedicinaSession[Model TelemedicinaSession]
        AuditLog[Model AuditLog]
        ConsentLog[Model ConsentimentoLGPD]
    end
    
    UI --> ChimeComponent
    ChimeComponent --> ChimeAPI
    ChimeComponent --> TranscriptionHook
    TranscriptionHook --> Transcribe
    ChimeAPI --> ChimeSDK
    ChimeAPI --> TelemedicinaSession
    ChimeAPI --> AuditLog
    ChimeAPI --> ConsentAPI
    ConsentAPI --> ConsentLog
    LogsAPI --> AuditLog
    AuditLog --> S3
    AuditLog --> CloudWatch
```

## Componentes Principais

### 1. Modelo de Dados (Prisma Schema)

**Arquivo:** `prisma/schema.prisma`

Adicionar modelos:

- `TelemedicinaSession`: Sessões de telemedicina
- `AuditLog`: Logs de auditoria (LGPD)
- `ConsentimentoLGPD`: Consentimentos de pacientes

### 2. Backend - API Routes

**Arquivos a criar:**

- `app/api/telemedicina/sessao/criar/route.ts`: Criar sessão Chime
- `app/api/telemedicina/sessao/[sessionId]/join/route.ts`: Entrar na sessão
- `app/api/telemedicina/sessao/[sessionId]/encerrar/route.ts`: Encerrar sessão
- `app/api/telemedicina/consentimento/route.ts`: Gerenciar consentimentos LGPD
- `app/api/telemedicina/logs/route.ts`: Consultar logs de auditoria

### 3. Frontend - Componentes

**Arquivos a criar/modificar:**

- `components/telemedicina/chime-video-call.tsx`: Componente principal Chime
- `hooks/use-chime-session.ts`: Hook para gerenciar sessão Chime
- `app/(protected)/medico/atendimento/atendimento-content.tsx`: Integrar Chime na UI existente

### 4. Serviços e Utilitários

**Arquivos a criar:**

- `lib/aws/chime-service.ts`: Serviço AWS Chime
- `lib/telemedicina/audit-logger.ts`: Logger de auditoria
- `lib/telemedicina/lgpd-compliance.ts`: Utilitários LGPD
- `lib/telemedicina/consent-manager.ts`: Gerenciador de consentimentos

### 5. Segurança e Compliance

- Autenticação: Usar NextAuth existente
- Autorização: Validar médico e paciente na consulta
- Criptografia: TLS para tráfego, criptografia em repouso (S3)
- Logs: Todos os eventos registrados (LGPD)
- Consentimento: Obrigatório antes de iniciar sessão

## Fluxo de Funcionamento

```mermaid
sequenceDiagram
    participant M as Médico
    participant UI as Frontend
    participant API as Backend API
    participant Chime as AWS Chime
    participant DB as Database
    participant Logs as Audit Logger
    
    M->>UI: Inicia consulta telemedicina
    UI->>API: POST /telemedicina/consentimento
    API->>DB: Verificar consentimento paciente
    alt Sem consentimento
        API-->>UI: Solicitar consentimento
        UI->>M: Exibir formulário LGPD
        M->>UI: Confirmar consentimento
        UI->>API: POST /telemedicina/consentimento
        API->>DB: Salvar consentimento
        API->>Logs: Log consentimento
    end
    
    UI->>API: POST /telemedicina/sessao/criar
    API->>Chime: Criar meeting
    Chime-->>API: Meeting ID + Credentials
    API->>DB: Salvar TelemedicinaSession
    API->>Logs: Log criação sessão
    API-->>UI: Meeting credentials
    
    UI->>Chime: Conectar (Chime SDK)
    Chime-->>UI: Conexão estabelecida
    UI->>Logs: Log conexão estabelecida
    
    Note over M,Chime: Consulta em andamento
    
    M->>UI: Encerrar consulta
    UI->>API: POST /telemedicina/sessao/[id]/encerrar
    API->>Chime: Encerrar meeting
    API->>DB: Atualizar sessão (encerrada)
    API->>Logs: Log encerramento
    API-->>UI: Confirmação
```

## Implementação Detalhada

### Fase 1: Infraestrutura e Modelos

1. **Atualizar Prisma Schema**

   - Adicionar modelos `TelemedicinaSession`, `AuditLog`, `ConsentimentoLGPD`
   - Adicionar campos em `Consulta` para referenciar sessão de telemedicina
   - Criar migration

2. **Configurar AWS Chime**

   - Criar IAM role/policy para Chime SDK
   - Configurar variáveis de ambiente
   - Instalar dependências: `amazon-chime-sdk-js`

### Fase 2: Backend APIs

1. **Serviço AWS Chime** (`lib/aws/chime-service.ts`)

   - Criar/gerenciar meetings
   - Gerar attendee credentials
   - Encerrar meetings

2. **APIs de Sessão**

   - Criar sessão com validação de autorização
   - Join session com credenciais temporárias
   - Encerrar sessão com logs

3. **Sistema de Logs** (`lib/telemedicina/audit-logger.ts`)

   - Registrar todos os eventos (criação, join, encerramento)
   - Armazenar em DB e S3 (backup)
   - Formato estruturado para compliance

4. **LGPD Compliance** (`lib/telemedicina/lgpd-compliance.ts`)

   - Gerenciar consentimentos
   - Política de retenção (10 anos)
   - Exclusão de dados (após 10 anos)

### Fase 3: Frontend

1. **Componente Chime** (`components/telemedicina/chime-video-call.tsx`)

   - Integrar Chime SDK JS
   - Gerenciar áudio/vídeo
   - Controles (mute, camera, screen share)
   - Indicadores de qualidade de conexão

2. **Hook de Sessão** (`hooks/use-chime-session.ts`)

   - Gerenciar ciclo de vida da sessão
   - Estados (connecting, connected, disconnected)
   - Tratamento de erros

3. **Integração com UI Existente**

   - Substituir placeholders em `atendimento-content.tsx`
   - Integrar com transcrição existente
   - Manter chat e outras funcionalidades

### Fase 4: Segurança e Compliance

1. **Autenticação/Autorização**

   - Validar médico autenticado
   - Validar paciente da consulta
   - Validar clínica habilitada para telemedicina

2. **Logs de Auditoria**

   - Eventos: criação, join, encerramento, erros
   - Dados: timestamp, usuário, IP, ação, resultado
   - Armazenamento: DB + S3 (backup)

3. **LGPD**

   - Consentimento obrigatório antes da sessão
   - Política de privacidade clara
   - Retenção de 10 anos
   - Direito ao esquecimento (após 10 anos)

## Dependências

**Novas dependências:**

```json
{
  "amazon-chime-sdk-js": "^2.0.0",
  "@aws-sdk/client-chime": "^3.980.0",
  "@aws-sdk/client-chime-sdk-meetings": "^3.980.0"
}
```

**Variáveis de ambiente:**

```env
AWS_CHIME_REGION=us-east-1
AWS_CHIME_APP_INSTANCE_ARN=arn:aws:chime:...
CHIME_MEETING_RETENTION_DAYS=3650  # 10 anos
```

## Logs e Auditoria

**Eventos a registrar:**

- Criação de sessão
- Join de médico/paciente
- Encerramento de sessão
- Erros de conexão
- Consentimentos LGPD
- Acessos a logs

**Formato de log:**

```typescript
{
  timestamp: Date,
  userId: string,
  userType: 'MEDICO' | 'PACIENTE',
  action: string,
  sessionId: string,
  consultaId: string,
  ipAddress: string,
  userAgent: string,
  result: 'SUCCESS' | 'ERROR',
  errorMessage?: string,
  metadata?: Record<string, any>
}
```

## Compliance LGPD

1. **Consentimento**

   - Formulário antes de iniciar sessão
   - Armazenar: data, IP, versão da política
   - Permitir revogação

2. **Retenção**

   - Dados mantidos por 10 anos
   - Processo automático de exclusão após período

3. **Transparência**

   - Logs acessíveis ao paciente
   - Política de privacidade clara

4. **Segurança**

   - Criptografia em trânsito (TLS)
   - Criptografia em repouso (S3)
   - Acesso restrito aos dados

## Testes

1. **Testes unitários**

   - Serviços AWS Chime
   - Audit logger
   - LGPD compliance

2. **Testes de integração**

   - Fluxo completo de sessão
   - Logs de auditoria
   - Consentimentos

3. **Testes de segurança**

   - Autorização de acesso
   - Validação de credenciais
   - Proteção contra acesso não autorizado

## Monitoramento

- CloudWatch para métricas AWS Chime
- Alertas para erros de conexão
- Dashboard de sessões ativas
- Relatórios de compliance

## Próximos Passos Após Implementação

1. Documentação técnica
2. Treinamento de usuários
3. Monitoramento em produção
4. Otimizações baseadas em uso real