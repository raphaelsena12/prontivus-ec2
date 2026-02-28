# Exemplos de Uso - Sistema ANVISA

## Exemplos de Requisições API

### 1. Buscar medicamentos por nome (autocomplete)

```bash
curl "http://localhost:3000/api/anvisa/medicamentos?search=dipirona&tipo=nome&limit=10"
```

**Resposta:**
```json
{
  "medicamentos": [
    {
      "id": "uuid-1",
      "numeroRegistro": "101070123456",
      "nomeProduto": "DIPIRONA SÓDICA",
      "principioAtivo": "DIPIRONA",
      "empresa": "LABORATÓRIO X",
      "apresentacao": "COMPRIMIDO",
      "concentracao": "500MG"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "totalPages": 1
  }
}
```

### 2. Buscar medicamentos por princípio ativo

```bash
curl "http://localhost:3000/api/anvisa/medicamentos?search=paracetamol&tipo=principio-ativo&limit=20"
```

### 3. Busca geral (nome, princípio ativo ou empresa)

```bash
curl "http://localhost:3000/api/anvisa/medicamentos?search=novalgina&limit=50"
```

### 4. Buscar medicamento específico por número de registro

```bash
curl "http://localhost:3000/api/anvisa/medicamentos/101070123456"
```

**Resposta:**
```json
{
  "medicamento": {
    "id": "uuid-1",
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
}
```

### 5. Listar todos os medicamentos (paginado)

```bash
curl "http://localhost:3000/api/anvisa/medicamentos?page=1&limit=50"
```

### 6. Verificar status da base

```bash
curl "http://localhost:3000/api/anvisa/sync/status"
```

**Resposta:**
```json
{
  "totalMedicamentos": 125000,
  "lastSync": "Verificar logs do sistema"
}
```

### 7. Sincronização manual (requer autenticação)

```bash
curl -X POST "http://localhost:3000/api/anvisa/sync" \
  -H "Authorization: Bearer <token-super-admin>"
```

**Resposta:**
```json
{
  "success": true,
  "message": "Sincronização concluída com sucesso",
  "result": {
    "totalProcessed": 125000,
    "totalInserted": 5000,
    "totalUpdated": 120000,
    "totalErrors": 0,
    "duration": 180000,
    "errors": []
  }
}
```

## Exemplos de Uso em Código TypeScript

### Buscar medicamentos no frontend

```typescript
// Buscar medicamentos para autocomplete
async function buscarMedicamentos(termo: string) {
  const response = await fetch(
    `/api/anvisa/medicamentos?search=${encodeURIComponent(termo)}&tipo=nome&limit=20`
  );
  const data = await response.json();
  return data.medicamentos;
}

// Usar em componente React
const [medicamentos, setMedicamentos] = useState([]);

useEffect(() => {
  buscarMedicamentos("dipirona").then(setMedicamentos);
}, []);
```

### Buscar medicamento específico

```typescript
async function buscarPorRegistro(numeroRegistro: string) {
  const response = await fetch(
    `/api/anvisa/medicamentos/${numeroRegistro}`
  );
  const data = await response.json();
  return data.medicamento;
}
```

### Usar repositório diretamente (backend)

```typescript
import { MedicamentoAnvisaRepository } from "@/lib/anvisa";

const repository = new MedicamentoAnvisaRepository();

// Buscar por nome
const medicamentos = await repository.searchByNome("dipirona", 20);

// Buscar por princípio ativo
const medicamentos = await repository.searchByPrincipioAtivo("paracetamol", 50);

// Buscar por número de registro
const medicamento = await repository.findByNumeroRegistro("101070123456");

// Contar total
const total = await repository.count();
```

### Executar sincronização programaticamente

```typescript
import { AnvisaSyncService } from "@/lib/anvisa";

const syncService = new AnvisaSyncService();
const result = await syncService.sync();

console.log(`Processados: ${result.totalProcessed}`);
console.log(`Inseridos: ${result.totalInserted}`);
console.log(`Atualizados: ${result.totalUpdated}`);
console.log(`Erros: ${result.totalErrors}`);
```

## Integração com Frontend (React)

### Componente de Autocomplete

```typescript
import { useState, useEffect } from "react";

export function MedicamentoAutocomplete() {
  const [search, setSearch] = useState("");
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 3) {
      setMedicamentos([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/anvisa/medicamentos?search=${encodeURIComponent(search)}&tipo=nome&limit=20`
        );
        const data = await response.json();
        setMedicamentos(data.medicamentos || []);
      } catch (error) {
        console.error("Erro ao buscar medicamentos:", error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar medicamento..."
      />
      {loading && <p>Carregando...</p>}
      <ul>
        {medicamentos.map((med) => (
          <li key={med.id}>
            {med.nomeProduto} - {med.principioAtivo} ({med.numeroRegistro})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Agendamento de Sincronização

### Usando node-cron (Node.js)

```typescript
import cron from "node-cron";
import { AnvisaSyncService } from "@/lib/anvisa";

// Executar diariamente às 2h da manhã
cron.schedule("0 2 * * *", async () => {
  console.log("Iniciando sincronização agendada da ANVISA...");
  const syncService = new AnvisaSyncService();
  const result = await syncService.sync();
  console.log("Sincronização concluída:", result);
});
```

### Usando PM2 (Produção)

Criar arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "anvisa-sync",
      script: "npm",
      args: "run sync:anvisa",
      cron_restart: "0 2 * * *", // Diariamente às 2h
      autorestart: false,
      max_memory_restart: "1G",
    },
  ],
};
```

Executar:
```bash
pm2 start ecosystem.config.js
```
