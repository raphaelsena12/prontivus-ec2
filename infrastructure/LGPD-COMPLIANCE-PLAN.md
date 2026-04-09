# Plano de Compliance LGPD - Prontivus

## Sistema SaaS Medico Multi-Tenant | Versao 1.0

**Data:** 08/04/2026
**Classificacao:** CONFIDENCIAL
**Responsavel:** Equipe de Engenharia Prontivus

---

## Indice

1. [Sumario Executivo](#1-sumario-executivo)
2. [Classificacao de Dados](#2-classificacao-de-dados)
3. [Dados em Transito](#3-dados-em-transito)
4. [Dados em Repouso](#4-dados-em-repouso)
5. [Matriz de Acesso por Perfil](#5-matriz-de-acesso-por-perfil)
6. [Isolamento Multi-Tenant](#6-isolamento-multi-tenant)
7. [Consentimento e Base Legal](#7-consentimento-e-base-legal)
8. [Direitos do Titular (DSAR)](#8-direitos-do-titular-dsar)
9. [Trilha de Auditoria](#9-trilha-de-auditoria)
10. [IA e Compartilhamento de Dados](#10-ia-e-compartilhamento-de-dados)
11. [Gestao de Incidentes](#11-gestao-de-incidentes)
12. [Contratos e DPA](#12-contratos-e-dpa)
13. [Gap Analysis e Remediacao](#13-gap-analysis-e-remediacao)
14. [Roadmap de Implementacao](#14-roadmap-de-implementacao)

---

## 1. Sumario Executivo

O Prontivus e um SaaS medico multi-tenant que processa dados pessoais sensiveis (Art. 5, II, LGPD) de milhares de pacientes em multiplas clinicas. Por lidar com **dados de saude**, o sistema se enquadra na categoria de **maior rigor** da LGPD, exigindo:

- **Base legal explicita** para todo tratamento (Art. 7 e 11)
- **Consentimento especifico** para dados sensiveis de saude (Art. 11, I)
- **Medidas de seguranca tecnicas e administrativas** (Art. 46)
- **Relatorio de Impacto a Protecao de Dados (RIPD)** (Art. 38)
- **Encarregado (DPO) nomeado** (Art. 41)
- **Comunicacao a ANPD e titulares** em caso de incidente (Art. 48)

### Dados Processados pelo Sistema

| Categoria | Exemplos no Sistema | Modelos Prisma |
|-----------|-------------------|----------------|
| Dados pessoais | Nome, CPF, RG, email, telefone, endereco | Paciente, Usuario |
| Dados sensiveis de saude | Prontuarios, prescricoes, exames, anamneses, CID | Prontuario, Consulta, PrescricaoMedicamento, SolicitacaoExame |
| Dados biometricos | Imagens de exames | SolicitacaoExame (arquivos S3) |
| Dados de criancas/adolescentes | Pacientes menores (data nascimento) | Paciente |
| Dados financeiros | Pagamentos, planos | Stripe integration, Pagamento |
| Dados de sessao/log | IP, user-agent, timestamps | TelemedicineLog, TelemedicineConsent |

---

## 2. Classificacao de Dados

### 2.1. Niveis de Classificacao

```
NIVEL 4 - CRITICO (Dados Sensiveis de Saude)
  Prontuarios medicos, diagnosticos (CID), prescricoes,
  resultados de exames, anamneses, historico clinico,
  imagens medicas, certificados digitais

NIVEL 3 - CONFIDENCIAL (Dados Pessoais Identificaveis)
  CPF, RG, nome completo, data nascimento, nome da mae/pai,
  endereco, telefone, email, genero, estado civil,
  profissao, convenio/plano de saude

NIVEL 2 - INTERNO (Dados Operacionais)
  Agendamentos, dados financeiros da clinica, configuracoes,
  tokens de integracao, logs de acesso, metadados de sessao

NIVEL 1 - PUBLICO
  Nome da clinica, endereco comercial, horarios de atendimento,
  especialidades oferecidas
```

### 2.2. Mapeamento de Campos Sensiveis no Schema

#### Modelo `Paciente` - NIVEL 3/4
```
CRITICO: (campos ligados a dados clinicos via relacionamentos)
  - consultas[], prontuarios[], prescricoes[], exames[]

CONFIDENCIAL:
  - cpf            → PII, identificador unico
  - rg             → PII, documento
  - dataNascimento → PII, dado demografico
  - nomeMae        → PII, dado familiar
  - nomePai        → PII, dado familiar
  - genero         → Dado sensivel (Art. 5, II)
  - endereco       → PII, localizacao
  - telefone       → PII, contato
  - email          → PII, contato
  - convenio       → Dado de saude indiretamente
  - profissao      → Dado pessoal
  - estadoCivil    → Dado pessoal
```

#### Modelo `Consulta` - NIVEL 4
```
CRITICO:
  - pressaoArterial, frequenciaCardiaca, saturacaoO2
  - temperatura, peso, altura (sinais vitais)
  - observacoes (notas clinicas livres)
  - prontuarios[] (historico clinico completo)
  - prescricoes[] (medicamentos prescritos)
  - exames[] (solicitacoes de exames)
```

#### Modelo `Prontuario` - NIVEL 4
```
CRITICO:
  - anamnese       → Historico clinico relatado pelo paciente
  - exameFisico    → Achados do exame fisico
  - diagnostico    → CID/diagnostico medico
  - planoTerapeutico → Plano de tratamento
  - orientacoes    → Orientacoes ao paciente
```

#### Modelo `PrescricaoMedicamento` - NIVEL 4
```
CRITICO:
  - nome           → Medicamento prescrito
  - dosagem        → Dosagem
  - posologia      → Modo de uso
  - duracao        → Tempo de tratamento
  - observacoes    → Notas sobre a prescricao
```

#### Modelo `TelemedicineSession` / `TelemedicineLog` - NIVEL 3/4
```
CRITICO:
  - Conteudo das sessoes de video (nao gravado, apenas metadados)
  - Transcricoes de audio (enviadas para IA)

CONFIDENCIAL:
  - ipAddress      → Dado de conexao
  - userAgent      → Identificacao de dispositivo
  - consentTimestamp → Prova de consentimento
```

---

## 3. Dados em Transito

### 3.1. Estado Atual

| Fluxo | Protocolo | Status |
|-------|-----------|--------|
| Cliente → Servidor (Next.js) | HTTPS/TLS 1.2+ | ✅ Via ALB/Nginx |
| Servidor → PostgreSQL (RDS) | TLS | ⚠️ Verificar `sslmode=require` na connection string |
| Servidor → S3 | HTTPS | ✅ SDK AWS usa HTTPS por padrao |
| Servidor → OpenAI API | HTTPS | ✅ API usa HTTPS |
| Servidor → Stripe | HTTPS | ✅ Stripe exige TLS |
| Servidor → SES/WhatsApp | HTTPS | ✅ APIs usam HTTPS |
| Telemedicina (WebRTC) | DTLS-SRTP | ✅ AWS Chime SDK criptografa |
| Servidor → Comprehend Medical | HTTPS | ✅ SDK AWS usa HTTPS |

### 3.2. Acoes Necessarias

#### P0 - IMEDIATO

**3.2.1. Forcar TLS na conexao com banco de dados**
```
# Na DATABASE_URL do .env, adicionar:
DATABASE_URL="postgresql://...?sslmode=require&sslrootcert=/path/to/rds-ca-cert.pem"
```

**3.2.2. Configurar HSTS no servidor**
```nginx
# nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**3.2.3. Headers de seguranca obrigatorios**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.amazonaws.com https://api.openai.com wss://*.chime.aws;" always;
```

**3.2.4. Certificate Pinning para APIs criticas**
```typescript
// lib/http-client.ts - Para chamadas a APIs externas criticas
const httpsAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true,
});
```

#### P1 - CURTO PRAZO

**3.2.5. Implementar mTLS entre microservicos** (se houver comunicacao entre servicos internos)

**3.2.6. Criptografar cookies de sessao**
```typescript
// lib/auth.ts - NextAuth config
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true, // Somente HTTPS
    },
  },
},
```

**3.2.7. Reduzir tempo de sessao JWT**
```typescript
// ATUAL: 30 dias (INSEGURO para dados de saude)
// RECOMENDADO:
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60, // 8 horas (turno de trabalho)
},
// Com refresh token para renovacao silenciosa
```

---

## 4. Dados em Repouso

### 4.1. Estado Atual

| Local | Criptografia | Status |
|-------|-------------|--------|
| PostgreSQL (RDS) | AES-256 (EBS encryption) | ⚠️ Verificar se habilitado |
| S3 (documentos) | SSE-S3 ou SSE-KMS | ⚠️ Verificar configuracao |
| Senhas de usuario | bcrypt (10 rounds) | ✅ Implementado |
| Certificados digitais | AES-256-GCM | ✅ Implementado (crypto/aes-gcm.ts) |
| CPF, RG, endereco | **PLAINTEXT** | ❌ NAO CRIPTOGRAFADO |
| Prontuarios | **PLAINTEXT** | ❌ NAO CRIPTOGRAFADO |
| Prescricoes | **PLAINTEXT** | ❌ NAO CRIPTOGRAFADO |
| Exames (resultados texto) | **PLAINTEXT** | ❌ NAO CRIPTOGRAFADO |
| Backups | Depende da config RDS | ⚠️ Verificar |

### 4.2. Acoes Necessarias

#### P0 - IMEDIATO

**4.2.1. Habilitar criptografia RDS (se nao habilitado)**
```bash
# Verificar status
aws rds describe-db-instances --db-instance-identifier prontivus-db \
  --query 'DBInstances[0].StorageEncrypted'

# Se false, migrar para instancia criptografada:
# 1. Criar snapshot
# 2. Copiar snapshot com criptografia KMS
# 3. Restaurar instancia a partir do snapshot criptografado
```

**4.2.2. Habilitar SSE-KMS no bucket S3**
```bash
aws s3api put-bucket-encryption --bucket prontivus-documentos \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/prontivus-docs-key"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

**4.2.3. Bloquear acesso publico ao S3**
```bash
aws s3api put-public-access-block --bucket prontivus-documentos \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'
```

#### P1 - CURTO PRAZO

**4.2.4. Criptografia em nivel de campo (Field-Level Encryption)**

Expandir o modulo `lib/crypto/aes-gcm.ts` existente para criptografar campos PII:

```typescript
// lib/crypto/field-encryption.ts
import { encryptStringAESGCM, decryptStringAESGCM } from './aes-gcm';

// Campos que DEVEM ser criptografados em repouso
const ENCRYPTED_FIELDS = {
  Paciente: ['cpf', 'rg', 'nomeMae', 'nomePai', 'endereco', 'telefone'],
  Prontuario: ['anamnese', 'exameFisico', 'diagnostico', 'planoTerapeutico'],
  PrescricaoMedicamento: ['nome', 'dosagem', 'posologia', 'observacoes'],
  Consulta: ['observacoes'],
} as const;

// Chave de criptografia por tenant (isolamento de chaves)
// Cada clinica tem sua propria chave derivada
async function getTenantEncryptionKey(clinicaId: string): Promise<Buffer> {
  // Derivar chave unica por tenant usando HKDF
  // Master key do KMS + clinicaId como contexto
}

// Middleware Prisma para criptografia transparente
// Encripta ao salvar, decripta ao ler
```

**Estrategia de criptografia por tenant:**
```
Master Key (AWS KMS)
  └── Tenant Key (clinica-001) → Encripta dados da clinica 001
  └── Tenant Key (clinica-002) → Encripta dados da clinica 002
  └── Tenant Key (clinica-N)   → Encripta dados da clinica N
```

Beneficio: Se uma chave de tenant for comprometida, apenas os dados daquela clinica sao expostos.

**4.2.5. Indice de busca para campos criptografados**

Para manter busca por CPF sem expor o valor em plaintext:
```typescript
// Armazenar hash blind index para busca
// cpf_hash = HMAC-SHA256(cpf, SEARCH_KEY) → indexado para busca
// cpf_enc  = AES-256-GCM(cpf, TENANT_KEY) → armazenado para leitura

model Paciente {
  cpf_enc   String   // Valor criptografado
  cpf_hash  String   @unique // Hash para busca (nao reversivel)
  // ... demais campos
}
```

**4.2.6. Criptografia de backups**
```bash
# RDS automated backups herdam criptografia da instancia
# Para backups manuais adicionais:
aws rds create-db-snapshot \
  --db-instance-identifier prontivus-db \
  --db-snapshot-identifier prontivus-backup-$(date +%Y%m%d) \
  --tags Key=Encryption,Value=KMS
```

#### P2 - MEDIO PRAZO

**4.2.7. Rotacao automatica de chaves**
```bash
# Configurar rotacao anual automatica no KMS
aws kms enable-key-rotation --key-id alias/prontivus-master-key
# Rotacao acontece automaticamente a cada 365 dias
# AWS gerencia versoes antigas para decriptacao de dados existentes
```

**4.2.8. Tokenizacao de dados ultra-sensiveis**
Para dados como CPF, considerar tokenizacao onde o valor real fica em vault separado:
```
Banco principal: cpf_token = "tok_abc123"
Vault (AWS Secrets Manager ou HashiCorp Vault): "tok_abc123" → "123.456.789-00"
```

---

## 5. Matriz de Acesso por Perfil

### 5.1. SUPER_ADMIN (Administrador do Sistema)

**Descricao:** Operador da plataforma Prontivus. Gerencia tenants, configuracoes globais e infraestrutura.

| Recurso | Criar | Ler | Editar | Deletar | Obs |
|---------|-------|-----|--------|---------|-----|
| Tenants/Clinicas | ✅ | ✅ | ✅ | ✅ | CRUD completo |
| Usuarios (todos) | ✅ | ✅ | ✅ | ✅ | Gerencia qualquer usuario |
| Config. globais do sistema | ✅ | ✅ | ✅ | - | Seguranca, planos, etc |
| Dados de pacientes | ❌ | ❌ | ❌ | ❌ | **NAO DEVE TER ACESSO** |
| Prontuarios medicos | ❌ | ❌ | ❌ | ❌ | **NAO DEVE TER ACESSO** |
| Prescricoes | ❌ | ❌ | ❌ | ❌ | **NAO DEVE TER ACESSO** |
| Exames | ❌ | ❌ | ❌ | ❌ | **NAO DEVE TER ACESSO** |
| Logs de auditoria | - | ✅ | ❌ | ❌ | Somente leitura |
| Financeiro (plataforma) | ✅ | ✅ | ✅ | - | Planos, cobrancas |
| Financeiro (clinicas) | - | ✅* | ❌ | ❌ | *Apenas metricas agregadas |
| Backups | ✅ | ✅ | - | ✅ | Gerencia ciclo de backup |
| Integ. WhatsApp/Stripe | - | ✅* | ❌ | ❌ | *Apenas status, nao tokens |

**Riscos LGPD e Mitigacoes:**
```
RISCO: Super-admin pode acessar banco de dados diretamente via SQL,
       bypassing controles de aplicacao.

MITIGACAO:
  1. Acesso ao banco SOMENTE via bastion host com MFA
  2. Credenciais de banco em AWS Secrets Manager (nao .env)
  3. Queries no banco logadas via RDS Audit Log
  4. Mascaramento de dados PII em ambientes nao-producao
  5. Segregacao de duty: quem gerencia infra NAO deve ver dados clinicos
  6. Alertas para queries em tabelas sensiveis (Prontuario, Consulta, etc.)
```

**Restricoes tecnicas necessarias:**
```typescript
// Middleware: bloquear super-admin de endpoints clinicos
if (session.user.tipo === 'SUPER_ADMIN') {
  const clinicalEndpoints = [
    '/api/medico/',
    '/api/paciente/',
    '/api/admin-clinica/pacientes',
  ];
  if (clinicalEndpoints.some(ep => req.url.startsWith(ep))) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 });
  }
}
```

---

### 5.2. ADMIN_CLINICA (Administrador da Clinica)

**Descricao:** Proprietario ou gestor da clinica. Gerencia equipe, configuracoes e operacao da clinica.

| Recurso | Criar | Ler | Editar | Deletar | Obs |
|---------|-------|-----|--------|---------|-----|
| Pacientes (sua clinica) | ✅ | ✅ | ✅ | ✅* | *Soft-delete apenas |
| Usuarios (sua clinica) | ✅ | ✅ | ✅ | ✅* | *Desativar |
| Agendamentos | ✅ | ✅ | ✅ | ✅ | Todos da clinica |
| Prontuarios medicos | ❌ | ⚠️ | ❌ | ❌ | **VER NOTA ABAIXO** |
| Prescricoes | ❌ | ⚠️ | ❌ | ❌ | **VER NOTA ABAIXO** |
| Exames | ❌ | ⚠️ | ❌ | ❌ | **VER NOTA ABAIXO** |
| Financeiro (clinica) | ✅ | ✅ | ✅ | - | Pagamentos, relatorios |
| Relatorios | ✅ | ✅ | - | ✅ | Gerar e exportar |
| Config. clinica | - | ✅ | ✅ | - | Logo, horarios, etc |
| Integ. WhatsApp | - | ✅ | ✅ | - | Config. de notificacoes |
| Convenios | ✅ | ✅ | ✅ | ✅ | Planos de saude aceitos |
| Salas | ✅ | ✅ | ✅ | ✅ | Gerencia salas |

**NOTA CRITICA - Dados Clinicos:**
```
LGPD + CFM (Conselho Federal de Medicina):
  Prontuarios medicos sao de PROPRIEDADE do paciente e
  de GUARDA do medico/instituicao de saude.

  O admin da clinica NAO deve ter acesso irrestrito a
  prontuarios, prescricoes e exames. O acesso deve ser:

  OPCAO A (Recomendada): Sem acesso a dados clinicos
    - Admin ve apenas dados cadastrais e administrativos
    - Relatorios financeiros NAO incluem dados clinicos

  OPCAO B (Com justificativa): Acesso restrito e auditado
    - Apenas para fins legais, regulatorios ou judiciais
    - Requer motivo registrado
    - Cada acesso gera log de auditoria
    - Paciente e medico sao notificados
```

**Restricoes tecnicas:**
```typescript
// Admin da clinica: filtrar campos sensiveis de pacientes
// Retornar apenas dados administrativos, nunca clinicos
const pacienteAdminView = {
  id: true,
  nome: true,
  cpf: true, // Mascarado: ***.***.789-00
  email: true,
  telefone: true,
  convenio: true,
  ativo: true,
  createdAt: true,
  // NAO incluir: consultas, prontuarios, prescricoes, exames
};
```

---

### 5.3. MEDICO (Medico)

**Descricao:** Profissional de saude que realiza atendimentos. Tem acesso clinico aos seus pacientes.

| Recurso | Criar | Ler | Editar | Deletar | Obs |
|---------|-------|-----|--------|---------|-----|
| Pacientes (seus) | ✅ | ✅ | ✅ | ❌ | Apenas pacientes que atende |
| Pacientes (outros medicos) | ❌ | ⚠️ | ❌ | ❌ | **VER NOTA** |
| Prontuarios (seus) | ✅ | ✅ | ✅* | ❌ | *Editar dentro de prazo (24h) |
| Prontuarios (outros) | ❌ | ⚠️ | ❌ | ❌ | **VER NOTA** |
| Prescricoes | ✅ | ✅ | ✅* | ❌ | *Dentro da consulta |
| Exames (solicitar) | ✅ | ✅ | ✅ | ✅ | Solicitacoes de exames |
| Exames (resultados) | - | ✅ | - | - | Resultados recebidos |
| Documentos (atestados, etc) | ✅ | ✅ | - | - | Gerar documentos |
| Agendamentos | ✅ | ✅* | ✅* | - | *Apenas seus |
| Telemedicina | ✅ | ✅ | - | - | Sessoes de video |
| IA (analises) | ✅ | ✅ | - | - | Gerar anamnese, sugestoes |
| Financeiro | ❌ | ❌ | ❌ | ❌ | Sem acesso |
| Config. clinica | ❌ | ❌ | ❌ | ❌ | Sem acesso |
| Perfil proprio | - | ✅ | ✅ | - | CRM, assinatura, logo |

**NOTA - Acesso a pacientes de outros medicos:**
```
CENARIO: Medico A precisa ver historico de paciente do Medico B
  (ex: interconsulta, cobertura de plantao)

OPCOES:
  A) Medico ve TODOS os pacientes da clinica (atual no sistema)
     → Risco: Acesso amplo sem necessidade
     → Mitiga com: Auditoria de cada visualizacao

  B) Medico ve APENAS seus pacientes (recomendado LGPD)
     → Implementar: Relacionamento medico-paciente explicito
     → Para interconsulta: solicitar acesso temporario ao admin/outro medico
     → Acesso temporario registrado e com expiracao

RECOMENDACAO: Opcao B com mecanismo de acesso temporario
```

**Restricoes tecnicas:**
```typescript
// Filtrar pacientes por medico (opcao B)
const pacientes = await prisma.paciente.findMany({
  where: {
    clinicaId: auth.clinicaId,
    ativo: true,
    // Adicionar filtro por relacionamento medico-paciente
    OR: [
      { consultas: { some: { medicoId: auth.medicoId } } },
      { acessosTemporarios: { some: {
        medicoId: auth.medicoId,
        expiraEm: { gte: new Date() }
      }}}
    ]
  }
});

// Registrar TODA visualizacao de prontuario
await prisma.auditLog.create({
  data: {
    action: 'VIEW_PRONTUARIO',
    userId: session.user.id,
    resourceType: 'Prontuario',
    resourceId: prontuarioId,
    pacienteId: prontuario.pacienteId,
    clinicaId: auth.clinicaId,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  }
});
```

---

### 5.4. SECRETARIA (Secretaria/Recepcionista)

**Descricao:** Profissional administrativo. Gerencia agenda, cadastros e recepcao de pacientes.

| Recurso | Criar | Ler | Editar | Deletar | Obs |
|---------|-------|-----|--------|---------|-----|
| Pacientes (cadastro) | ✅ | ✅* | ✅* | ❌ | *Dados administrativos apenas |
| Pacientes (dados clinicos) | ❌ | ❌ | ❌ | ❌ | **SEM ACESSO** |
| Prontuarios | ❌ | ❌ | ❌ | ❌ | **SEM ACESSO** |
| Prescricoes | ❌ | ❌ | ❌ | ❌ | **SEM ACESSO** |
| Exames | ❌ | ❌ | ❌ | ❌ | **SEM ACESSO** |
| Agendamentos | ✅ | ✅ | ✅ | ✅ | CRUD completo |
| Financeiro (caixa) | ✅ | ✅ | ✅ | - | Recebimentos do dia |
| Painel de chamadas | - | ✅ | - | - | Chamar proximo paciente |
| Convenios | - | ✅ | - | - | Consultar planos aceitos |
| Documentos (recibos) | ✅ | ✅ | - | - | Apenas recibos de pagamento |

**Dados visiveis do paciente pela secretaria:**
```
PERMITIDO:
  - Nome completo
  - CPF (mascarado: ***.***.789-00, exibir completo apenas para cadastro)
  - Telefone
  - Email
  - Data de nascimento
  - Convenio/plano
  - Status (ativo/inativo)
  - Historico de agendamentos (data, horario, medico, status)

PROIBIDO:
  - Motivo da consulta
  - Diagnosticos
  - Medicamentos
  - Resultados de exames
  - Qualquer nota clinica
  - Historico medico
```

**Restricoes tecnicas:**
```typescript
// View da secretaria: campos estritamente administrativos
const pacienteSecretariaView = {
  select: {
    id: true,
    nome: true,
    cpf: true,        // Aplicar mascara no retorno
    telefone: true,
    email: true,
    dataNascimento: true,
    convenio: true,
    ativo: true,
    agendamentos: {    // Apenas info de agenda
      select: {
        data: true,
        hora: true,
        status: true,
        medico: { select: { nome: true, especialidade: true } },
      }
    }
    // EXPLICITAMENTE excluir: consultas, prontuarios, prescricoes, exames
  }
};
```

---

### 5.5. PACIENTE (Titular dos Dados)

**Descricao:** Titular dos dados pessoais e de saude. Tem direitos garantidos pela LGPD.

| Recurso | Criar | Ler | Editar | Deletar | Obs |
|---------|-------|-----|--------|---------|-----|
| Perfil proprio | - | ✅ | ✅ | ✅* | *Solicitar exclusao |
| Prontuarios proprios | ❌ | ✅ | ❌ | ❌ | Somente leitura |
| Prescricoes proprias | ❌ | ✅ | ❌ | ❌ | Somente leitura |
| Exames proprios | ❌ | ✅ | ❌ | ❌ | Somente leitura |
| Agendamentos proprios | ✅ | ✅ | ✅* | ✅* | *Cancelar/remarcar |
| Documentos proprios | ❌ | ✅ | ❌ | ❌ | Atestados, receitas |
| Dados de outros pacientes | ❌ | ❌ | ❌ | ❌ | **ISOLAMENTO TOTAL** |
| Dados da clinica | ❌ | ✅* | ❌ | ❌ | *Apenas info publica |
| Financeiro | - | ✅* | - | - | *Apenas seus pagamentos |
| Telemedicina | - | ✅ | - | - | Participar de sessoes |
| Consentimentos | ✅ | ✅ | ✅ | - | Gerenciar consentimentos |
| Exportar dados (DSAR) | ✅ | - | - | - | Solicitar copia dos dados |

**Direitos LGPD que devem ser implementados no portal do paciente:**
```
Art. 18 - O titular tem direito a:
  I   - Confirmacao da existencia de tratamento        → Tela "Meus Dados"
  II  - Acesso aos dados                               → Exportar dados
  III - Correcao de dados incompletos/desatualizados   → Editar perfil
  IV  - Anonimizacao/bloqueio/eliminacao               → Solicitar exclusao
  V   - Portabilidade                                  → Exportar em formato aberto
  VI  - Eliminacao dos dados com consentimento          → Revogar consentimento
  VII - Info sobre compartilhamento                     → Tela de privacidade
  VIII - Info sobre possibilidade de nao consentir      → Politica de privacidade
  IX  - Revogacao do consentimento                      → Gerenciar consentimentos
```

**Restricoes tecnicas:**
```typescript
// Paciente SOMENTE ve seus proprios dados
// NUNCA confiar em parametro da URL, usar sessao
const consultas = await prisma.consulta.findMany({
  where: {
    pacienteId: session.user.pacienteId, // Da sessao, NUNCA do request
    clinicaId: auth.clinicaId,
  },
  select: {
    data: true,
    hora: true,
    status: true,
    medico: { select: { nome: true, especialidade: true } },
    prontuarios: { select: { diagnostico: true, orientacoes: true } },
    prescricoes: true,
    exames: { select: { tipo: true, status: true, resultado: true } },
  }
});
```

---

### 5.6. Matriz Resumo de Acesso

```
                    SUPER   ADMIN    MEDICO  SECRET  PACIENTE
                    ADMIN   CLINICA          ARIA
Cadastro Paciente    -       CRUD     CR      CR       R(seu)
Dados PII Paciente   -       R        R       R*       R(seu)
Prontuarios          -       -        CRUD    -        R(seu)
Prescricoes          -       -        CRUD    -        R(seu)
Exames               -       -        CRUD    -        R(seu)
Documentos           -       -        CR      -        R(seu)
Agendamentos         -       CRUD     CR      CRUD     CR(seu)
Financeiro Clinica   -       CRUD     -       CR       -
Financeiro Plataforma CRUD   -        -       -        -
Config Sistema       CRUD    -        -       -        -
Config Clinica       -       CRUD     -       -        -
Usuarios Sistema     CRUD    -        -       -        -
Usuarios Clinica     -       CRUD     -       -        -
Logs Auditoria       R       R*       -       -        -
Telemedicina         -       -        CRUD    -        R(seu)
IA/Analises          -       -        CR      -        -
Consentimentos       -       R        -       -        CRUD(seu)

Legenda: C=Create, R=Read, U=Update, D=Delete
         R* = Leitura parcial/mascarada
         (seu) = Apenas dados proprios
         - = Sem acesso
```

---

## 6. Isolamento Multi-Tenant

### 6.1. Arquitetura Atual

O sistema usa **tenant isolation via clinicaId** (row-level filtering):

```
Tenant (Clinica)
  └── UsuarioTenant (vincula usuarios a clinicas com role)
  └── Pacientes (clinicaId)
  └── Consultas (clinicaId via medico → clinica)
  └── Prontuarios (via consulta → clinica)
  └── Prescricoes (via consulta → clinica)
  └── Exames (clinicaId)
  └── Documentos (clinicaId)
  └── Agendamentos (clinicaId)
  └── Pagamentos (clinicaId)
```

### 6.2. Riscos e Mitigacoes

#### RISCO 1: Falha no filtro de clinicaId
```
Se qualquer endpoint esquecer de filtrar por clinicaId,
dados de TODAS as clinicas ficam expostos.

MITIGACAO:
  1. Row-Level Security (RLS) no PostgreSQL
  2. Middleware Prisma que injeta clinicaId automaticamente
  3. Testes automatizados de isolamento
```

**Implementar RLS no PostgreSQL:**
```sql
-- Habilitar RLS nas tabelas sensiveis
ALTER TABLE "Paciente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consulta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prontuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescricaoMedicamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SolicitacaoExame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentoGerado" ENABLE ROW LEVEL SECURITY;

-- Policy: usuario so ve dados da sua clinica
CREATE POLICY tenant_isolation_paciente ON "Paciente"
  USING ("clinicaId" = current_setting('app.current_clinic_id')::text);

CREATE POLICY tenant_isolation_consulta ON "Consulta"
  USING ("clinicaId" = current_setting('app.current_clinic_id')::text);

-- ... para cada tabela sensivel

-- Setar variavel de sessao antes de cada query
-- No Prisma middleware:
-- await prisma.$executeRaw`SELECT set_config('app.current_clinic_id', ${clinicaId}, true)`;
```

**Implementar Prisma Middleware de isolamento:**
```typescript
// lib/prisma-tenant-middleware.ts
prisma.$use(async (params, next) => {
  const tenantModels = [
    'Paciente', 'Consulta', 'Prontuario',
    'PrescricaoMedicamento', 'SolicitacaoExame',
    'DocumentoGerado', 'Agendamento', 'Pagamento'
  ];

  if (tenantModels.includes(params.model)) {
    // Injetar clinicaId em TODA query
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        clinicaId: getCurrentClinicaId(), // Do contexto da request
      };
    }
    if (params.action === 'create') {
      params.args.data.clinicaId = getCurrentClinicaId();
    }
    // ... update, delete
  }

  return next(params);
});
```

#### RISCO 2: Paciente compartilhado entre clinicas
```
Um paciente pode frequentar multiplas clinicas no sistema.
Cada clinica deve ver APENAS os dados gerados NELA.

SITUACAO ATUAL: Paciente tem clinicaId (pertence a UMA clinica)
PROBLEMA: Se paciente frequenta 2 clinicas, precisa de 2 cadastros
SOLUCAO: Manter isolamento - cada clinica tem seu proprio registro
```

#### RISCO 3: S3 bucket compartilhado
```
Todos os documentos de todas as clinicas estao no mesmo bucket S3.
Separacao por pasta: {categoria}/{clinicaId}/{pacienteId}/

MITIGACAO:
  1. Presigned URLs com expiracao curta (15 min)
  2. Validar clinicaId do documento contra sessao antes de gerar URL
  3. S3 bucket policy restritiva
  4. VPC Endpoint para S3 (trafego nao sai da rede AWS)
```

---

## 7. Consentimento e Base Legal

### 7.1. Bases Legais Aplicaveis (Art. 7 e 11)

| Tratamento | Base Legal | Artigo |
|------------|-----------|--------|
| Atendimento medico (prontuario) | Tutela da saude | Art. 7, VIII / Art. 11, II, f |
| Prescricao de medicamentos | Tutela da saude | Art. 7, VIII / Art. 11, II, f |
| Exames | Tutela da saude | Art. 7, VIII / Art. 11, II, f |
| Cadastro do paciente | Execucao de contrato | Art. 7, V |
| Envio de lembretes (WhatsApp) | Consentimento | Art. 7, I |
| Telemedicina | Consentimento + Tutela saude | Art. 11, I + II, f |
| IA (analise por OpenAI) | **Consentimento especifico** | Art. 11, I |
| Compartilhamento com IA | **Consentimento especifico** | Art. 11, I |
| Cobranca/pagamento | Execucao de contrato | Art. 7, V |
| Obrigacao legal (guarda prontuario 20 anos) | Obrigacao legal | Art. 7, II |
| Relatorios financeiros | Legitimo interesse | Art. 7, IX |
| Marketing/comunicacao | Consentimento | Art. 7, I |

### 7.2. Modelo de Consentimento a Implementar

```typescript
// prisma/schema.prisma - Novo modelo
model ConsentimentoLGPD {
  id              String   @id @default(cuid())
  pacienteId      String
  paciente        Paciente @relation(fields: [pacienteId], references: [id])
  clinicaId       String
  clinica         Clinica  @relation(fields: [clinicaId], references: [id])

  // Tipos de consentimento
  tipo            TipoConsentimento
  versao          String   // Versao do termo (ex: "1.0", "1.1")
  textoCompleto   String   @db.Text // Texto integral do termo aceito
  hash            String   // SHA-256 do texto para verificacao de integridade

  // Status
  consentido      Boolean
  dataConsentimento DateTime
  dataRevogacao   DateTime?
  motivoRevogacao String?

  // Prova
  ipAddress       String
  userAgent       String
  metodoColeta    String   // "portal_web", "presencial", "telemedicina"

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum TipoConsentimento {
  TRATAMENTO_DADOS_SAUDE      // Tratamento de dados para atendimento
  COMPARTILHAMENTO_IA         // Envio de dados para analise por IA
  NOTIFICACOES_WHATSAPP       // Envio de lembretes por WhatsApp
  NOTIFICACOES_EMAIL          // Comunicacao por email
  TELEMEDICINA                // Atendimento por telemedicina (ja existe parcial)
  MARKETING                   // Comunicacao de marketing
  PORTABILIDADE               // Autorizacao para portabilidade
}
```

### 7.3. Fluxo de Coleta de Consentimento

```
PRIMEIRO ACESSO DO PACIENTE (cadastro):
  1. Apresentar Termos de Uso e Politica de Privacidade
  2. Consentimento OBRIGATORIO: Tratamento de dados para atendimento
  3. Consentimento OPCIONAL: WhatsApp, email marketing
  4. Registrar IP, user-agent, timestamp, versao do termo

ANTES DE CADA TELEMEDICINA:
  5. Consentimento especifico para sessao de video (ja implementado)
  6. Consentimento para gravacao (se aplicavel)

ANTES DE USAR IA:
  7. Medico informa paciente que IA sera usada
  8. Consentimento do paciente para envio a servico externo (OpenAI)
  9. Explicar que dados sao processados mas nao retidos pela OpenAI

PORTAL DO PACIENTE:
  10. Tela "Meus Consentimentos" para visualizar e revogar
  11. Revogacao NAO afeta tratamentos ja realizados (base legal: tutela saude)
  12. Revogacao de WhatsApp/marketing tem efeito imediato
```

---

## 8. Direitos do Titular (DSAR)

### 8.1. Endpoints a Implementar

```typescript
// app/api/paciente/lgpd/meus-dados/route.ts
// Art. 18, I e II - Confirmacao e acesso
GET /api/paciente/lgpd/meus-dados
  → Retorna todos os dados pessoais do paciente em formato JSON
  → Inclui: cadastro, consultas, prontuarios, prescricoes, exames

// app/api/paciente/lgpd/exportar/route.ts
// Art. 18, V - Portabilidade
POST /api/paciente/lgpd/exportar
  → Gera arquivo JSON/CSV com todos os dados do paciente
  → Formato interoperavel (FHIR ou formato padrao de saude)
  → Envia link de download por email (expira em 24h)
  → Log de auditoria obrigatorio

// app/api/paciente/lgpd/corrigir/route.ts
// Art. 18, III - Correcao
PUT /api/paciente/lgpd/corrigir
  → Permite corrigir dados cadastrais incorretos
  → Dados clinicos: somente via medico (regulamentacao CFM)

// app/api/paciente/lgpd/excluir/route.ts
// Art. 18, IV e VI - Eliminacao
POST /api/paciente/lgpd/excluir
  → Solicita exclusao de dados pessoais
  → EXCECAO: Prontuarios medicos devem ser mantidos por 20 ANOS (CFM 1821/07)
  → Anonimizar dados pessoais, manter registros clinicos desidentificados
  → Requer confirmacao por email + senha
  → Prazo de 15 dias para efetivacao

// app/api/paciente/lgpd/consentimentos/route.ts
// Art. 18, IX - Revogacao
GET  /api/paciente/lgpd/consentimentos  → Listar consentimentos ativos
POST /api/paciente/lgpd/consentimentos  → Conceder consentimento
DELETE /api/paciente/lgpd/consentimentos/:id  → Revogar consentimento

// app/api/paciente/lgpd/compartilhamento/route.ts
// Art. 18, VII - Informacao sobre compartilhamento
GET /api/paciente/lgpd/compartilhamento
  → Lista todas as entidades com quem dados sao compartilhados
  → AWS (infraestrutura), OpenAI (analise IA), Stripe (pagamento)
  → Finalidade de cada compartilhamento
```

### 8.2. Processo de Exclusao (Direito ao Esquecimento)

```
SOLICITACAO DE EXCLUSAO:
  1. Paciente solicita via portal ou email ao DPO
  2. Sistema valida identidade (senha + email de confirmacao)
  3. Verifica restricoes legais:
     a. Prontuarios: NAO podem ser excluidos (CFM 1821/07 - 20 anos)
     b. Dados fiscais: NAO podem ser excluidos (5 anos - legislacao tributaria)
     c. Dados de consentimento: MANTER como prova de compliance
  4. Para dados que PODEM ser excluidos:
     a. Anonimizar: substituir nome, CPF, endereco por dados ficticios
     b. Manter registros clinicos com ID anonimo para fins de pesquisa
  5. Para dados em sistemas externos:
     a. Remover de cache/CDN
     b. Excluir documentos do S3 (exceto prontuarios)
     c. Solicitar exclusao ao OpenAI (se reteve dados)
  6. Gerar comprovante de exclusao para o paciente
  7. Prazo: 15 dias uteis (Art. 18, § 1)

ANONIMIZACAO (ao inves de exclusao total):
  Nome: "Paciente Anonimizado #hash"
  CPF: "000.000.000-00"
  Email: "anonimo_hash@removed.local"
  Telefone: "00000000000"
  Endereco: "Removido por solicitacao LGPD"
  Dados clinicos: MANTIDOS vinculados ao ID anonimo
```

---

## 9. Trilha de Auditoria

### 9.1. Estado Atual

O sistema possui auditoria **APENAS** para telemedicina (`TelemedicineLog`). Nao ha registro de:
- Quem acessou qual prontuario
- Quem visualizou dados de qual paciente
- Quem exportou relatorios
- Quem modificou cadastros
- Tentativas de acesso negadas

### 9.2. Modelo de Auditoria a Implementar

```typescript
// prisma/schema.prisma
model AuditLog {
  id            String   @id @default(cuid())
  timestamp     DateTime @default(now())

  // Quem
  userId        String
  userTipo      TipoUsuario  // MEDICO, SECRETARIA, etc.
  userName      String       // Snapshot do nome (caso usuario seja deletado)
  clinicaId     String

  // O que
  action        AuditAction
  resourceType  String       // "Paciente", "Prontuario", "Consulta", etc.
  resourceId    String
  description   String?

  // Contexto do titular
  pacienteId    String?      // Titular dos dados afetados (se aplicavel)
  pacienteNome  String?      // Snapshot

  // Dados da mudanca
  previousData  Json?        // Estado anterior (para updates/deletes)
  newData       Json?        // Novo estado (para creates/updates)
  changedFields String[]     // Lista de campos alterados

  // Metadados tecnicos
  ipAddress     String
  userAgent     String
  endpoint      String       // /api/medico/pacientes/123
  method        String       // GET, POST, PUT, DELETE
  statusCode    Int          // 200, 403, etc.
  sessionId     String?

  // Indexacao
  @@index([userId, timestamp])
  @@index([pacienteId, timestamp])
  @@index([clinicaId, timestamp])
  @@index([action, timestamp])
  @@index([resourceType, resourceId])
}

enum AuditAction {
  // Dados de paciente
  PATIENT_VIEW
  PATIENT_CREATE
  PATIENT_UPDATE
  PATIENT_DELETE
  PATIENT_SEARCH

  // Prontuario
  RECORD_VIEW
  RECORD_CREATE
  RECORD_UPDATE
  RECORD_PRINT
  RECORD_EXPORT

  // Prescricao
  PRESCRIPTION_VIEW
  PRESCRIPTION_CREATE
  PRESCRIPTION_PRINT

  // Exames
  EXAM_VIEW
  EXAM_REQUEST
  EXAM_UPLOAD
  EXAM_DOWNLOAD

  // Documentos
  DOCUMENT_GENERATE
  DOCUMENT_DOWNLOAD
  DOCUMENT_VIEW

  // Relatorios
  REPORT_GENERATE
  REPORT_EXPORT

  // Autenticacao
  LOGIN_SUCCESS
  LOGIN_FAILURE
  LOGOUT
  PASSWORD_CHANGE
  PASSWORD_RESET_REQUEST
  SESSION_EXPIRED

  // LGPD
  CONSENT_GIVEN
  CONSENT_REVOKED
  DATA_EXPORT_REQUEST
  DATA_DELETION_REQUEST
  DATA_CORRECTION_REQUEST

  // Administrativo
  USER_CREATE
  USER_UPDATE
  USER_DEACTIVATE
  CONFIG_CHANGE

  // IA
  AI_ANALYSIS_REQUEST
  AI_DATA_SENT

  // Acesso negado
  ACCESS_DENIED
}
```

### 9.3. Middleware de Auditoria

```typescript
// lib/audit-logger.ts
export async function auditLog(params: {
  session: Session;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  pacienteId?: string;
  previousData?: any;
  newData?: any;
  changedFields?: string[];
  request: Request;
}) {
  // NUNCA logar dados clinicos no campo previousData/newData
  // Apenas registrar QUAIS campos mudaram, nao OS VALORES
  const sanitizedPrevious = sanitizeForAudit(params.previousData);
  const sanitizedNew = sanitizeForAudit(params.newData);

  await prisma.auditLog.create({
    data: {
      userId: params.session.user.id,
      userTipo: params.session.user.tipo,
      userName: params.session.user.nome,
      clinicaId: params.session.user.clinicaId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      pacienteId: params.pacienteId,
      previousData: sanitizedPrevious,
      newData: sanitizedNew,
      changedFields: params.changedFields || [],
      ipAddress: params.request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: params.request.headers.get('user-agent') || 'unknown',
      endpoint: new URL(params.request.url).pathname,
      method: params.request.method,
      statusCode: 200,
    }
  });
}

// Sanitizar dados para nao logar PII no audit log
function sanitizeForAudit(data: any): any {
  if (!data) return null;
  const sensitive = ['cpf', 'rg', 'anamnese', 'exameFisico',
    'diagnostico', 'planoTerapeutico', 'observacoes', 'senha'];
  const sanitized = { ...data };
  for (const field of sensitive) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

### 9.4. Retencao de Logs de Auditoria

```
REGRA: Logs de auditoria devem ser mantidos por NO MINIMO 5 anos
  (alinhado com prescricao para acoes judiciais de dados pessoais)

PARA PRONTUARIOS: Logs de acesso mantidos por 20 anos
  (alinhado com guarda obrigatoria de prontuarios - CFM 1821/07)

IMPLEMENTACAO:
  - Logs antigos migrados para S3 Glacier (custo reduzido)
  - Logs devem ser IMUTAVEIS (append-only, sem update/delete)
  - Considerar Amazon Timestream ou CloudWatch Logs para retencao
```

---

## 10. IA e Compartilhamento de Dados

### 10.1. Estado Atual

O sistema envia dados para a **OpenAI (GPT-4o)** nos seguintes cenarios:

| Funcionalidade | Dados Enviados | Endpoint |
|---------------|---------------|----------|
| Gerar anamnese | Transcricao da consulta (texto completo) | /api/medico/gerar-anamnese |
| Analisar exames | Imagens de exames (base64) | /api/medico/analisar-exames |
| Resumo do paciente | Historico de consultas e prontuarios | /api/medico/resumo-paciente |
| Sugestoes clinicas | Dados da consulta atual | /api/medico/gerar-sugestoes |

### 10.2. Riscos LGPD

```
RISCO CRITICO: Dados sensiveis de saude sao enviados a empresa
estrangeira (OpenAI, EUA) sem:
  1. Consentimento especifico do paciente (Art. 11, I)
  2. Garantia de nao-retencao dos dados pela OpenAI
  3. Transferencia internacional documentada (Art. 33)
  4. DPA (Data Processing Agreement) com OpenAI
  5. Avaliacao de impacto (RIPD) para este tratamento
```

### 10.3. Mitigacoes Obrigatorias

#### A. Consentimento Especifico para IA
```typescript
// Antes de QUALQUER chamada a OpenAI:
const consentimento = await prisma.consentimentoLGPD.findFirst({
  where: {
    pacienteId: paciente.id,
    tipo: 'COMPARTILHAMENTO_IA',
    consentido: true,
    dataRevogacao: null,
  }
});

if (!consentimento) {
  return Response.json({
    error: 'Paciente nao consentiu com analise por IA',
    action: 'REQUIRE_CONSENT',
  }, { status: 403 });
}
```

#### B. Minimizacao de Dados
```typescript
// Enviar para OpenAI APENAS o necessario, sem PII
function prepareDataForAI(consulta: any): string {
  // REMOVER: nome, CPF, RG, endereco, telefone, email
  // MANTER: dados clinicos anonimizados
  return `
    Paciente: [ANONIMO], ${calcularIdade(consulta.paciente.dataNascimento)} anos, ${consulta.paciente.genero}
    Queixa: ${consulta.observacoes}
    Sinais vitais: PA ${consulta.pressaoArterial}, FC ${consulta.frequenciaCardiaca}
    // ... dados clinicos sem identificacao
  `;
}
```

#### C. Registro de Transferencia
```typescript
// Logar TODA transferencia de dados para IA
await auditLog({
  action: 'AI_DATA_SENT',
  resourceType: 'Consulta',
  resourceId: consultaId,
  pacienteId: pacienteId,
  description: `Dados enviados para OpenAI GPT-4o. Tokens: ${tokenCount}. Finalidade: ${purpose}`,
  // NÃO logar o conteudo enviado (dados sensiveis)
});
```

#### D. DPA com OpenAI
```
REQUISITOS do DPA:
  1. OpenAI NAO retém dados de input/output (confirmar via API policy)
  2. OpenAI NAO usa dados para treinamento (opt-out configurado)
  3. Dados processados e descartados apos resposta
  4. Notificacao em caso de breach na OpenAI
  5. Sub-processadores da OpenAI listados e aprovados

CONFIGURACAO na OpenAI:
  - Usar Organization API com data retention = 0 days
  - Configurar: "training_data_opt_out": true
  - Documentar no registro de tratamento
```

#### E. Alternativa de Longo Prazo
```
Considerar migrar para modelo de IA local/on-premise:
  - AWS Bedrock com Claude (dados ficam na AWS sa-east-1)
  - Modelo open-source (LLaMA, Mistral) em instancia EC2 dedicada
  - Elimina transferencia internacional de dados
  - Maior controle sobre retencao e processamento
```

---

## 11. Gestao de Incidentes

### 11.1. Plano de Resposta a Incidentes de Dados (Art. 48)

```
CLASSIFICACAO DE INCIDENTES:

  SEV1 - CRITICO (Comunicacao ANPD em 72h + Titulares)
    - Vazamento de prontuarios medicos
    - Exposicao de banco de dados
    - Acesso nao autorizado a dados de saude
    - Ransomware afetando dados de pacientes

  SEV2 - ALTO (Comunicacao ANPD em 72h)
    - Vazamento de dados pessoais (CPF, nome, endereco)
    - Acesso indevido por usuario interno
    - Falha no isolamento multi-tenant

  SEV3 - MEDIO (Investigacao interna, comunicar se necessario)
    - Tentativa de acesso nao autorizado bloqueada
    - Vulnerabilidade descoberta (nao explorada)
    - Erro de configuracao corrigido

  SEV4 - BAIXO (Registro e monitoramento)
    - Anomalia em logs de acesso
    - Falha em controle de seguranca (ex: backup)
```

### 11.2. Processo de Notificacao

```
PRAZO LEGAL: Comunicacao a ANPD em "prazo razoavel"
  (Recomendacao: 72 horas, alinhado com GDPR)

CONTEUDO DA NOTIFICACAO (Art. 48, § 1):
  I   - Descricao da natureza dos dados afetados
  II  - Informacoes sobre os titulares envolvidos
  III - Medidas tecnicas e de seguranca utilizadas
  IV  - Riscos relacionados ao incidente
  V   - Motivos da demora (se nao comunicado imediatamente)
  VI  - Medidas adotadas para reverter/mitigar

FLUXO:
  1. Deteccao → Equipe de seguranca avalia severidade
  2. Contenção → Isolar sistema afetado
  3. Investigacao → Determinar escopo e dados afetados
  4. Notificacao ANPD → Dentro de 72h (SEV1/SEV2)
  5. Notificacao titulares → Comunicar pacientes afetados
  6. Remediacao → Corrigir vulnerabilidade
  7. Pos-incidente → Relatorio e melhorias
```

### 11.3. Ferramentas de Deteccao

```
IMPLEMENTAR:
  1. AWS GuardDuty → Deteccao de ameacas na infra AWS
  2. AWS CloudTrail → Auditoria de acoes na conta AWS
  3. RDS Performance Insights → Queries anomalas
  4. CloudWatch Alarms → Alertas para:
     - Picos de requests em endpoints sensiveis
     - Tentativas de login falhadas (>5 em 5 min)
     - Downloads massivos de dados
     - Queries que retornam mais de N registros de pacientes
     - Acesso fora do horario comercial
  5. WAF (Web Application Firewall) → Protecao contra ataques web
```

---

## 12. Contratos e DPA

### 12.1. Papeis LGPD

| Entidade | Papel LGPD | Justificativa |
|----------|-----------|---------------|
| Prontivus (plataforma) | **Operador** | Processa dados em nome das clinicas |
| Clinica (tenant) | **Controlador** | Define finalidade e meios do tratamento |
| Medico | **Controlador conjunto** | Responsavel pelo prontuario (CFM) |
| Paciente | **Titular** | Pessoa a quem os dados se referem |
| AWS | **Sub-operador** | Infraestrutura de processamento |
| OpenAI | **Sub-operador** | Processamento de IA |
| Stripe | **Controlador independente** | Dados de pagamento |

### 12.2. DPAs Necessarios

```
1. PRONTIVUS ↔ CLINICA (Contrato de Operador)
   - Finalidades do tratamento
   - Medidas de seguranca
   - Retencao e exclusao
   - Sub-operadores autorizados
   - Notificacao de incidentes
   - Auditoria

2. PRONTIVUS ↔ AWS (DPA de Sub-operador)
   - AWS ja possui DPA padrao (AWS Data Processing Addendum)
   - Verificar cobertura para regiao sa-east-1
   - Documentar servicos utilizados

3. PRONTIVUS ↔ OPENAI (DPA de Sub-operador)
   - Retencao de dados = 0
   - Nao uso para treinamento
   - Transferencia internacional documentada

4. PRONTIVUS ↔ STRIPE (DPA)
   - Stripe ja possui DPA (Stripe Data Processing Agreement)
   - Verificar conformidade com LGPD

5. PRONTIVUS ↔ META/WHATSAPP (DPA)
   - Para envio de notificacoes via WhatsApp Business API
   - Meta possui DPA padrao
```

### 12.3. Registro de Atividades de Tratamento (Art. 37)

Deve ser mantido um registro contendo:

```
Para cada atividade de tratamento:
  - Finalidade
  - Categoria de dados
  - Categoria de titulares
  - Base legal
  - Destinatarios (compartilhamento)
  - Transferencia internacional (se houver)
  - Prazo de retencao
  - Medidas de seguranca

EXEMPLO - Atividade "Atendimento Medico":
  Finalidade: Prestacao de servicos de saude
  Dados: Nome, CPF, dados de saude, prontuario
  Titulares: Pacientes
  Base legal: Tutela da saude (Art. 11, II, f)
  Compartilhamento: Medico, OpenAI (com consentimento)
  Transferencia internacional: EUA (OpenAI) com consentimento
  Retencao: 20 anos (CFM 1821/07)
  Seguranca: Criptografia AES-256, controle de acesso, auditoria
```

---

## 13. Gap Analysis e Remediacao

### 13.1. Gaps Criticos (P0 - Correcao Imediata)

| # | Gap | Risco | Remediacao | Esforco |
|---|-----|-------|-----------|---------|
| 1 | Credenciais em .env no repositorio | Exposicao total do sistema | Migrar para AWS Secrets Manager + .env.example sem valores | 1 dia |
| 2 | Sem trilha de auditoria geral | Impossivel rastrear acessos a dados | Implementar AuditLog model + middleware | 3-5 dias |
| 3 | Dados PII em plaintext no banco | Exposicao em caso de breach | Field-level encryption para CPF, RG, etc | 5-7 dias |
| 4 | Sessao JWT de 30 dias | Sessao roubada = acesso prolongado | Reduzir para 8h + refresh token | 1 dia |
| 5 | Sem consentimento para IA | Violacao Art. 11, I (dados sensiveis) | Implementar fluxo de consentimento | 3-5 dias |
| 6 | Dados PII enviados para OpenAI | Compartilhamento sem base legal | Anonimizar antes do envio | 2-3 dias |
| 7 | Sem DPO nomeado | Violacao Art. 41 | Nomear encarregado + canal de contato | 1 dia |
| 8 | Super-admin pode acessar dados clinicos | Acesso excessivo sem necessidade | Bloquear endpoints clinicos para super-admin | 1-2 dias |

### 13.2. Gaps Altos (P1 - Curto Prazo, 30 dias)

| # | Gap | Risco | Remediacao | Esforco |
|---|-----|-------|-----------|---------|
| 9 | Sem direitos do titular (DSAR) | Violacao Art. 18 | Implementar endpoints LGPD para paciente | 5-7 dias |
| 10 | Sem politica de privacidade no app | Violacao Art. 9 | Criar e exibir politica no cadastro/login | 2-3 dias |
| 11 | Secretaria pode ver dados desnecessarios | Principio da minimizacao | Restringir view da secretaria | 2-3 dias |
| 12 | Medico ve todos pacientes da clinica | Acesso alem do necessario | Filtrar por vinculo medico-paciente | 3-5 dias |
| 13 | Sem RLS no PostgreSQL | Falha de tenant = leak total | Implementar Row-Level Security | 3-5 dias |
| 14 | Senha minima 6 caracteres | Seguranca de acesso fraca | Aumentar para 12+ com complexidade | 1 dia |
| 15 | Sem registro de tratamento (Art. 37) | Violacao regulatoria | Documentar todas atividades de tratamento | 3-5 dias |
| 16 | S3 sem criptografia KMS verificada | Dados em repouso vulneraveis | Habilitar SSE-KMS no bucket | 1 dia |

### 13.3. Gaps Medios (P2 - Medio Prazo, 90 dias)

| # | Gap | Risco | Remediacao | Esforco |
|---|-----|-------|-----------|---------|
| 17 | Sem RIPD (Relatorio de Impacto) | Violacao Art. 38 | Elaborar RIPD completo | 5-10 dias |
| 18 | Sem WAF | Vulnerabilidade a ataques web | Implementar AWS WAF | 2-3 dias |
| 19 | Sem deteccao de anomalias | Breach nao detectado | GuardDuty + CloudWatch Alarms | 3-5 dias |
| 20 | Sem backup testado | Perda de dados | Testar restore periodico | 2-3 dias |
| 21 | Sem treinamento da equipe | Falha humana | Programa de treinamento LGPD | Continuo |
| 22 | Sem plano de incidentes formal | Resposta lenta a breach | Documentar e testar plano | 3-5 dias |
| 23 | Migrar IA para solucao local | Eliminar transferencia internacional | AWS Bedrock ou modelo on-premise | 10-15 dias |
| 24 | Rotacao de chaves | Chave comprometida = exposicao | KMS key rotation + app key rotation | 3-5 dias |

---

## 14. Roadmap de Implementacao

### Fase 1 - Fundacao (Semanas 1-2) [P0]

```
SEMANA 1:
  □ Migrar credenciais para AWS Secrets Manager
  □ Nomear DPO e publicar canal de contato
  □ Reduzir sessao JWT para 8 horas
  □ Aumentar requisito de senha para 12 caracteres
  □ Bloquear super-admin de endpoints clinicos
  □ Verificar/habilitar criptografia RDS e S3 KMS

SEMANA 2:
  □ Implementar modelo AuditLog no Prisma
  □ Criar middleware de auditoria
  □ Adicionar auditoria nos endpoints mais criticos:
    - Visualizacao de prontuario
    - Visualizacao de paciente
    - Login/logout
    - Exportacao de relatorios
  □ Implementar consentimento para uso de IA
  □ Anonimizar dados antes de enviar para OpenAI
```

### Fase 2 - Protecao de Dados (Semanas 3-4) [P1]

```
SEMANA 3:
  □ Implementar field-level encryption (CPF, RG, endereco)
  □ Criar blind indexes para busca em campos criptografados
  □ Implementar RLS no PostgreSQL
  □ Restringir view da secretaria (dados administrativos apenas)

SEMANA 4:
  □ Implementar modelo ConsentimentoLGPD
  □ Tela de consentimento no cadastro do paciente
  □ Implementar DSAR endpoints:
    - GET /api/paciente/lgpd/meus-dados
    - POST /api/paciente/lgpd/exportar
    - PUT /api/paciente/lgpd/corrigir
    - POST /api/paciente/lgpd/excluir
  □ Criar politica de privacidade e exibir no app
```

### Fase 3 - Hardening (Semanas 5-8) [P1/P2]

```
SEMANA 5-6:
  □ Filtrar pacientes por vinculo medico-paciente
  □ Implementar mecanismo de acesso temporario entre medicos
  □ Registro de atividades de tratamento (Art. 37)
  □ Elaborar RIPD (Relatorio de Impacto)

SEMANA 7-8:
  □ Implementar AWS WAF
  □ Configurar GuardDuty + CloudWatch Alarms
  □ Testar restore de backup
  □ Headers de seguranca (HSTS, CSP, etc.)
  □ Implementar plano de resposta a incidentes
```

### Fase 4 - Maturidade (Semanas 9-12) [P2]

```
SEMANA 9-10:
  □ Avaliar migracao para AWS Bedrock (eliminar OpenAI)
  □ Implementar rotacao automatica de chaves
  □ Tokenizacao de CPF (vault separado)
  □ Testes de penetracao (pentest)

SEMANA 11-12:
  □ Programa de treinamento LGPD para equipe
  □ Simulacao de incidente de dados
  □ Auditoria externa de compliance
  □ Documentacao final e certificacao
```

### Fase Continua - Manutencao

```
MENSAL:
  □ Revisao de logs de auditoria
  □ Verificacao de consentimentos pendentes
  □ Teste de backup (restore)

TRIMESTRAL:
  □ Revisao de acessos e permissoes
  □ Atualizacao do registro de tratamento
  □ Revisao de sub-operadores

ANUAL:
  □ Atualizacao do RIPD
  □ Auditoria de compliance LGPD
  □ Treinamento de reciclagem
  □ Revisao da politica de privacidade
  □ Pentest
  □ Revisao de DPAs
```

---

## Anexo A - Checklist de Compliance LGPD

```
ORGANIZACIONAL:
  [ ] DPO nomeado e publicado (Art. 41)
  [ ] Politica de privacidade publicada (Art. 9)
  [ ] Registro de atividades de tratamento (Art. 37)
  [ ] RIPD elaborado (Art. 38)
  [ ] DPAs com todos os operadores/sub-operadores
  [ ] Programa de treinamento LGPD
  [ ] Plano de resposta a incidentes (Art. 48)
  [ ] Canal de atendimento ao titular (Art. 18)

TECNICO:
  [ ] Criptografia em transito (TLS 1.2+)
  [ ] Criptografia em repouso (AES-256)
  [ ] Field-level encryption para PII
  [ ] Controle de acesso baseado em roles (RBAC)
  [ ] Isolamento multi-tenant (RLS)
  [ ] Trilha de auditoria completa
  [ ] Gestao de consentimento
  [ ] Mecanismo de DSAR (direitos do titular)
  [ ] Anonimizacao/pseudonimizacao
  [ ] Backup criptografado e testado
  [ ] Monitoramento e deteccao de anomalias
  [ ] WAF e protecao contra ataques
  [ ] Gestao de secrets (nao em codigo)
  [ ] Sessoes seguras (tempo limitado)
  [ ] Politica de senhas robusta
  [ ] Minimizacao de dados em integ. externas (IA)

JURIDICO:
  [ ] Base legal definida para cada tratamento
  [ ] Consentimento especifico para dados sensiveis
  [ ] Consentimento para transferencia internacional
  [ ] Termos de uso atualizados
  [ ] Contrato com clinicas (operador)
  [ ] DPA com AWS, OpenAI, Stripe, Meta/WhatsApp
```

---

## Anexo B - Referencias Legais

- **LGPD** - Lei 13.709/2018
- **CFM 1821/07** - Resolucao sobre prontuario medico (guarda 20 anos)
- **CFM 2.314/2022** - Telemedicina
- **ANS** - Normas de operadoras de saude
- **ANPD** - Guias e orientacoes da Autoridade Nacional
- **ISO 27001** - Seguranca da informacao
- **ISO 27701** - Gestao de privacidade
- **OWASP Top 10** - Vulnerabilidades web

---

*Este documento deve ser revisado e atualizado a cada 6 meses ou sempre que houver mudanca significativa no sistema ou na legislacao.*
