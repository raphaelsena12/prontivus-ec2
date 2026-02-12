---
name: Integração Assinatura Digital ICP-Brasil
overview: Integrar assinatura digital ICP-Brasil usando certificados CFM e Valid (ValidSign) na tela de atendimento, permitindo assinar todos os documentos médicos gerados com validade legal.
todos:
  - id: setup-valid-sign
    content: "Configurar cliente ValidSign: criar lib/valid-sign-client.ts com métodos para iniciar assinatura, verificar status e baixar PDF assinado"
    status: pending
  - id: api-iniciar-assinatura
    content: Criar endpoint /api/assinatura/iniciar/route.ts para iniciar processo de assinatura com ValidSign
    status: pending
    dependencies:
      - setup-valid-sign
  - id: api-callback
    content: Criar endpoint /api/assinatura/callback/route.ts para receber webhooks da ValidSign e processar PDF assinado
    status: pending
    dependencies:
      - setup-valid-sign
  - id: componente-assinatura
    content: Criar componente components/assinatura-digital-dialog.tsx com UI para iniciar e acompanhar assinatura
    status: pending
  - id: hook-assinatura
    content: Criar hook hooks/use-assinatura-digital.ts para gerenciar estado e polling de assinatura
    status: pending
    dependencies:
      - api-iniciar-assinatura
  - id: integracao-atendimento
    content: "Integrar componente de assinatura na tela atendimento-content.tsx: adicionar botão 'Assinar Digitalmente' após gerar documento"
    status: pending
    dependencies:
      - componente-assinatura
      - hook-assinatura
  - id: schema-prisma
    content: Adicionar campos de assinatura digital no schema Prisma (assinadoDigitalmente, assinaturaToken, assinaturaData, etc)
    status: pending
  - id: migration-banco
    content: Criar migration Prisma para adicionar campos de assinatura digital na tabela Documento
    status: pending
    dependencies:
      - schema-prisma
  - id: atualizar-salvar-documento
    content: Atualizar /api/medico/documentos/salvar/route.ts para salvar metadados de assinatura quando documento for assinado
    status: pending
    dependencies:
      - migration-banco
  - id: validacao-icp
    content: "Implementar validação de certificado ICP-Brasil: verificar AC, cadeia de certificação e status de revogação"
    status: pending
    dependencies:
      - setup-valid-sign
  - id: indicador-visual
    content: Adicionar indicadores visuais (badges/ícones) para documentos assinados digitalmente na lista de documentos
    status: pending
    dependencies:
      - integracao-atendimento
  - id: config-env
    content: Adicionar variáveis de ambiente para ValidSign (API key, URL, callback, webhook secret) e documentar no README
    status: pending
---

# Integração de Assinatura Digital ICP-Brasil com CFM e Valid

## Visão Geral

Este plano implementa assinatura digital ICP-Brasil usando a API ValidSign (Valid) com certificados em nuvem, integrada na tela de atendimento para assinar documentos médicos gerados.

## Arquitetura

```mermaid
flowchart TD
    A[Frontend: Tela de Atendimento] -->|1. Gerar PDF| B[API: /api/medico/documentos/gerar]
    B -->|2. Retornar PDF| A
    A -->|3. Solicitar Assinatura| C[Componente: AssinaturaDigitalDialog]
    C -->|4. Enviar PDF| D[API: /api/assinatura/iniciar]
    D -->|5. Chamar ValidSign| E[API ValidSign - Cloud]
    E -->|6. Retornar Token| D
    D -->|7. Retornar URL Assinatura| C
    C -->|8. Redirecionar Usuário| F[ValidSign: Tela de Assinatura]
    F -->|9. Assinar com Certificado| E
    E -->|10. Callback| D
    D -->|11. PDF Assinado| C
    C -->|12. Salvar no S3| G[API: /api/medico/documentos/salvar]
    G -->|13. Atualizar DB| H[(Prisma: Documento)]
```

## Componentes Principais

### 1. Backend - API de Assinatura Digital

**Arquivo:** `app/api/assinatura/iniciar/route.ts`

- Endpoint para iniciar processo de assinatura
- Integração com API ValidSign (REST)
- Gerenciamento de tokens e callbacks
- Validação de certificado ICP-Brasil

**Arquivo:** `app/api/assinatura/callback/route.ts`

- Webhook para receber confirmação da ValidSign
- Processar PDF assinado
- Atualizar status do documento

**Arquivo:** `lib/valid-sign-client.ts`

- Cliente para comunicação com API ValidSign
- Métodos: iniciar assinatura, verificar status, baixar PDF assinado
- Tratamento de erros e retry

### 2. Frontend - Componente de Assinatura

**Arquivo:** `components/assinatura-digital-dialog.tsx`

- Dialog modal para iniciar assinatura
- Exibição de status (pendente, assinando, concluído)
- Preview do documento antes de assinar
- Integração com fluxo de assinatura ValidSign

**Arquivo:** `hooks/use-assinatura-digital.ts`

- Hook customizado para gerenciar estado de assinatura
- Polling de status da assinatura
- Gerenciamento de erros

### 3. Integração na Tela de Atendimento

**Arquivo:** `app/(protected)/medico/atendimento/atendimento-content.tsx`

- Adicionar botão "Assinar Digitalmente" após gerar documento
- Integrar componente de assinatura
- Atualizar lista de documentos com status de assinatura

**Arquivo:** `components/document-models-sheet.tsx`

- Adicionar opção de assinatura digital no fluxo de geração
- Indicador visual para documentos que requerem assinatura

### 4. Modificações nos Geradores de PDF

**Arquivos:** `lib/pdf/*.ts`

- Adicionar campo para indicar se documento foi assinado digitalmente
- Incluir metadados de assinatura no PDF (quando aplicável)
- Manter compatibilidade com documentos não assinados

### 5. Banco de Dados

**Arquivo:** `prisma/schema.prisma`

- Adicionar campos na tabela `Documento`:
  - `assinadoDigitalmente: Boolean`
  - `assinaturaToken: String?` (token da ValidSign)
  - `assinaturaData: DateTime?`
  - `assinaturaCertificado: String?` (info do certificado)
  - `assinaturaValida: Boolean`

### 6. Configuração e Variáveis de Ambiente

**Arquivo:** `.env`

- `VALIDSIGN_API_KEY` - Chave da API ValidSign
- `VALIDSIGN_API_URL` - URL base da API
- `VALIDSIGN_CALLBACK_URL` - URL para callbacks
- `VALIDSIGN_WEBHOOK_SECRET` - Secret para validar webhooks

## Fluxo de Assinatura

1. **Geração do Documento**: Médico gera documento na tela de atendimento
2. **Solicitação de Assinatura**: Clica em "Assinar Digitalmente"
3. **Início do Processo**: Frontend chama API para iniciar assinatura
4. **Integração ValidSign**: Backend cria sessão na ValidSign e retorna URL
5. **Redirecionamento**: Usuário é redirecionado para tela ValidSign
6. **Autenticação**: Usuário autentica com certificado digital (nuvem)
7. **Assinatura**: ValidSign processa assinatura ICP-Brasil
8. **Callback**: ValidSign notifica backend via webhook
9. **Download**: Backend baixa PDF assinado
10. **Armazenamento**: PDF assinado é salvo no S3
11. **Atualização**: Status do documento é atualizado no banco
12. **Notificação**: Frontend recebe notificação de conclusão

## Documentos que Serão Assinados

Todos os documentos médicos exceto controles:

- Atestados (todos os tipos)
- Receitas (simples e controle especial)
- Declarações de comparecimento
- Guias de encaminhamento
- Justificativas de exames
- Laudos médicos
- Termos de consentimento

## Validação ICP-Brasil

- Verificar se certificado é emitido por AC ICP-Brasil
- Validar cadeia de certificação
- Verificar se certificado não está revogado
- Confirmar que assinatura é válida e íntegra

## Segurança

- Tokens de assinatura armazenados de forma segura
- Validação de webhooks com secret
- Autenticação obrigatória para todas as APIs
- Logs de auditoria para assinaturas

## Tratamento de Erros

- Timeout de assinatura (30 minutos)
- Retry automático em falhas de rede
- Notificações de erro ao usuário
- Fallback para assinatura manual (opcional)

## Testes

- Testes unitários para cliente ValidSign
- Testes de integração com API ValidSign (sandbox)
- Testes E2E do fluxo completo de assinatura
- Validação de documentos assinados

## Dependências

- `axios` ou `fetch` para chamadas HTTP
- `@valid/sign-sdk` (se disponível) ou integração REST manual
- Biblioteca de validação de certificados ICP-Brasil (opcional)

## Migração

- Criar migration Prisma para novos campos
- Manter compatibilidade com documentos existentes
- Script de migração para documentos antigos (opcional)