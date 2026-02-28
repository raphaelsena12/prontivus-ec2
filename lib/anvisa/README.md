# Sistema de Sincronização de Medicamentos ANVISA

Sistema completo para sincronização e exposição da base oficial de medicamentos da ANVISA.

## 📋 Visão Geral

Este sistema:
- Baixa automaticamente o CSV oficial da ANVISA
- Processa e armazena medicamentos no banco de dados local
- Expõe API REST para busca de medicamentos
- É idempotente e seguro para reexecução
- Suporta centenas de milhares de registros

## 🏗️ Arquitetura

### Módulos

1. **MedicamentoAnvisaRepository** (`medicamento-repository.ts`)
   - Acesso ao banco de dados
   - Operações CRUD e busca
   - Otimizado para consultas rápidas

2. **AnvisaSyncService** (`sync-service.ts`)
   - Download do CSV da ANVISA
   - Parse e validação de dados
   - UPSERT em lotes para performance

3. **API Endpoints** (`app/api/anvisa/`)
   - Busca de medicamentos
   - Consulta por número de registro
   - Sincronização manual (admin)

4. **Script de Sincronização** (`scripts/sync-anvisa-medicamentos.ts`)
   - Execução via linha de comando
   - Pode ser agendado via cron

## 🚀 Uso

### 1. Migração do Banco de Dados

Primeiro, execute a migração para criar a tabela:

```bash
npm run db:migrate
```

### 2. Sincronização Inicial

Execute a sincronização para popular o banco:

```bash
npm run sync:anvisa
```

Este comando:
- Baixa o CSV da ANVISA
- Processa todos os registros
- Faz UPSERT no banco (insere novos, atualiza existentes)
- Exibe estatísticas ao final

### 3. Sincronização Periódica

Para sincronização automática diária, configure um cron job:

**Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Adicionar linha (executa diariamente às 2h da manhã)
0 2 * * * cd /caminho/do/projeto && npm run sync:anvisa >> /var/log/anvisa-sync.log 2>&1
```

**Windows (Task Scheduler):**
1. Abrir Task Scheduler
2. Criar tarefa básica
3. Ação: Executar programa
4. Programa: `npm`
5. Argumentos: `run sync:anvisa`
6. Agendar para execução diária

### 4. API de Consulta

#### Buscar medicamentos (busca geral)

```bash
GET /api/anvisa/medicamentos?search=dipirona&limit=20
```

**Query params:**
- `search`: Termo de busca (nome, princípio ativo ou empresa)
- `limit`: Limite de resultados (padrão: 50, máximo: 100)
- `page`: Página para paginação (padrão: 1)
- `tipo`: Tipo de busca - `"nome"` | `"principio-ativo"` | `"all"` (padrão)

**Resposta:**
```json
{
  "medicamentos": [
    {
      "id": "uuid",
      "numeroRegistro": "123456",
      "nomeProduto": "DIPIRONA SÓDICA",
      "principioAtivo": "DIPIRONA",
      "empresa": "LABORATÓRIO X",
      "situacaoRegistro": "ATIVO",
      "classeTerapeutica": "ANALGÉSICO",
      "apresentacao": "COMPRIMIDO",
      "concentracao": "500MG",
      "data": "2020-01-01",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Buscar por número de registro

```bash
GET /api/anvisa/medicamentos/123456
```

**Resposta:**
```json
{
  "medicamento": {
    "id": "uuid",
    "numeroRegistro": "123456",
    "nomeProduto": "DIPIRONA SÓDICA",
    ...
  }
}
```

#### Buscar por nome (autocomplete)

```bash
GET /api/anvisa/medicamentos?search=paracetamol&tipo=nome&limit=10
```

#### Buscar por princípio ativo

```bash
GET /api/anvisa/medicamentos?search=paracetamol&tipo=principio-ativo&limit=50
```

#### Sincronização manual (requer SUPER_ADMIN)

```bash
POST /api/anvisa/sync
Authorization: Bearer <token>
```

#### Status da base

```bash
GET /api/anvisa/sync/status
```

## 📊 Estrutura do Banco de Dados

### Modelo MedicamentoAnvisa

```prisma
model MedicamentoAnvisa {
  id                 String   @id @default(uuid())
  numeroRegistro     String   @unique  // Chave única da ANVISA
  nomeProduto        String
  principioAtivo     String?
  empresa            String?
  situacaoRegistro   String?
  classeTerapeutica  String?
  apresentacao       String?
  concentracao        String?
  data               String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([numeroRegistro])
  @@index([nomeProduto])
  @@index([principioAtivo])
  @@index([empresa])
  @@map("medicamentos_anvisa")
}
```

## 🔒 Segurança

- Sincronização manual requer autenticação de `SUPER_ADMIN`
- Busca de medicamentos é pública (dados abertos)
- Validação de dados antes de inserção
- Tratamento de erros robusto

## ⚡ Performance

- Processamento em lotes de 100 registros
- Índices otimizados para buscas rápidas
- Limite de resultados para evitar sobrecarga
- Timeout de 5 minutos para download do CSV

## 🛠️ Manutenção

### Verificar total de medicamentos

```bash
# Via API
curl http://localhost:3000/api/anvisa/sync/status

# Via banco
psql -d prontivus -c "SELECT COUNT(*) FROM medicamentos_anvisa;"
```

### Logs

Os logs da sincronização são exibidos no console. Para produção, redirecione para arquivo:

```bash
npm run sync:anvisa >> /var/log/anvisa-sync.log 2>&1
```

## 🐛 Troubleshooting

### Erro: "Falha ao baixar CSV"

- Verificar conectividade com internet
- Verificar se o endpoint da ANVISA está acessível
- O sistema tenta 3 vezes com backoff exponencial

### Erro: "Colunas obrigatórias não encontradas"

- O formato do CSV da ANVISA pode ter mudado
- Verificar o cabeçalho do CSV manualmente
- Ajustar mapeamento de colunas em `sync-service.ts`

### Performance lenta

- Verificar índices do banco: `\d medicamentos_anvisa` (PostgreSQL)
- Considerar aumentar o tamanho do lote em `sync-service.ts`
- Verificar conexão com banco de dados

## 📝 Notas

- O sistema é idempotente: pode ser executado múltiplas vezes sem duplicar dados
- O `numeroRegistro` é usado como chave única
- Dados são atualizados automaticamente se já existirem
- A sincronização pode demorar vários minutos dependendo do tamanho do CSV

## 🔗 Referências

- [Dados Abertos ANVISA](https://www.gov.br/anvisa/pt-br/acessoainformacao/dadosabertos)
- [Endpoint CSV Oficial](https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV)
