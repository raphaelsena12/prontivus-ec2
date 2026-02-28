# Como Testar o Sistema ANVISA

Guia completo para testar o sistema de sincronização e API de medicamentos da ANVISA.

## 🚀 Opção 1: Teste Automatizado (Recomendado)

Execute o script de teste automatizado:

```bash
npm run test:anvisa
```

Este script testa:
- ✅ Status da base de dados
- ✅ Busca geral de medicamentos
- ✅ Busca por nome
- ✅ Busca por princípio ativo
- ✅ Busca geral com termo

## 🧪 Opção 2: Teste Manual via API

### Pré-requisito: Servidor Rodando

Primeiro, inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### 1. Verificar Status da Base

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/sync/status" | Select-Object -ExpandProperty Content

# Ou usando curl (se disponível)
curl http://localhost:3000/api/anvisa/sync/status
```

**Resposta esperada:**
```json
{
  "totalMedicamentos": 0,
  "lastSync": "Verificar logs do sistema"
}
```

> **Nota:** Se `totalMedicamentos` for 0, você precisa executar a sincronização primeiro.

### 2. Executar Sincronização (Primeira Vez)

```bash
npm run sync:anvisa
```

⚠️ **Importante:** A primeira sincronização pode levar 10-30 minutos!

### 3. Testar Busca de Medicamentos

#### Busca Geral (sem termo)
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/medicamentos?limit=5" | Select-Object -ExpandProperty Content
```

#### Busca por Nome
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/medicamentos?search=dipirona&tipo=nome&limit=10" | Select-Object -ExpandProperty Content
```

#### Busca por Princípio Ativo
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/medicamentos?search=paracetamol&tipo=principio-ativo&limit=10" | Select-Object -ExpandProperty Content
```

#### Busca Geral (qualquer termo)
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/medicamentos?search=aspirina&limit=10" | Select-Object -ExpandProperty Content
```

#### Buscar por Número de Registro
```bash
# PowerShell
# Substitua 101070123456 por um número de registro real
Invoke-WebRequest -Uri "http://localhost:3000/api/anvisa/medicamentos/101070123456" | Select-Object -ExpandProperty Content
```

## 🌐 Opção 3: Teste no Navegador

### 1. Status da Base
Abra no navegador:
```
http://localhost:3000/api/anvisa/sync/status
```

### 2. Buscar Medicamentos
```
http://localhost:3000/api/anvisa/medicamentos?search=dipirona&limit=10
```

### 3. Buscar por Registro
```
http://localhost:3000/api/anvisa/medicamentos/101070123456
```

## 📝 Opção 4: Teste com Postman/Insomnia

### Coleção de Requisições

#### 1. GET Status
```
GET http://localhost:3000/api/anvisa/sync/status
```

#### 2. GET Buscar Medicamentos (Geral)
```
GET http://localhost:3000/api/anvisa/medicamentos?search=dipirona&limit=10
```

#### 3. GET Buscar por Nome
```
GET http://localhost:3000/api/anvisa/medicamentos?search=dipirona&tipo=nome&limit=10
```

#### 4. GET Buscar por Princípio Ativo
```
GET http://localhost:3000/api/anvisa/medicamentos?search=paracetamol&tipo=principio-ativo&limit=10
```

#### 5. GET Buscar por Registro
```
GET http://localhost:3000/api/anvisa/medicamentos/101070123456
```

#### 6. POST Sincronização (requer autenticação)
```
POST http://localhost:3000/api/anvisa/sync
Headers:
  Authorization: Bearer <token-super-admin>
```

## 🔍 Opção 5: Teste Programático (TypeScript)

Crie um arquivo `test-manual.ts`:

```typescript
import { MedicamentoAnvisaRepository } from "@/lib/anvisa";

async function test() {
  const repository = new MedicamentoAnvisaRepository();

  // Contar total
  const total = await repository.count();
  console.log(`Total de medicamentos: ${total}`);

  // Buscar por nome
  const medicamentos = await repository.searchByNome("dipirona", 10);
  console.log(`Encontrados: ${medicamentos.length}`);
  medicamentos.forEach((m) => {
    console.log(`- ${m.nomeProduto} (${m.numeroRegistro})`);
  });
}

test();
```

Execute:
```bash
tsx test-manual.ts
```

## ✅ Checklist de Testes

- [ ] Servidor está rodando (`npm run dev`)
- [ ] Status da API responde corretamente
- [ ] Sincronização foi executada (`npm run sync:anvisa`)
- [ ] Base tem medicamentos (`totalMedicamentos > 0`)
- [ ] Busca geral funciona
- [ ] Busca por nome funciona
- [ ] Busca por princípio ativo funciona
- [ ] Busca por registro funciona
- [ ] Respostas JSON estão corretas

## 🐛 Troubleshooting

### Erro: "Servidor não está rodando"
```bash
npm run dev
```

### Erro: "Base vazia"
```bash
npm run sync:anvisa
```

### Erro: "Conexão recusada"
- Verifique se a porta 3000 está livre
- Verifique se o servidor iniciou corretamente

### Erro: "404 Not Found"
- Verifique se a rota está correta: `/api/anvisa/medicamentos`
- Verifique se o servidor está rodando na porta correta

### Erro: "500 Internal Server Error"
- Verifique os logs do servidor
- Verifique se o banco de dados está acessível
- Verifique se a tabela `medicamentos_anvisa` existe

## 📊 Exemplo de Resposta Esperada

### Busca de Medicamentos
```json
{
  "medicamentos": [
    {
      "id": "uuid",
      "numeroRegistro": "101070123456",
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
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

## 🎯 Próximos Passos Após Testes

1. ✅ Verificar se todos os testes passaram
2. ✅ Integrar a API no frontend
3. ✅ Configurar sincronização periódica
4. ✅ Monitorar logs e performance
