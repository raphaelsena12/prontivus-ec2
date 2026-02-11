# Prompt para Ajustes de Design - Prontivus

Use este prompt para aplicar os ajustes de design em qualquer página/tela do sistema:

---

## PROMPT:

Aplique os seguintes ajustes de design na página/tela [DESCREVER A PÁGINA]:

### 1. HEADER E TÍTULOS
- Remova o header com título e linha divisória (h1 com linha abaixo)
- O título deve aparecer apenas na barra superior (site-header já está configurado)
- Remova qualquer breadcrumb se existir
- Remova data/hora se estiver no header

### 2. TABELAS
- Diminua todas as fontes para `text-xs`:
  - Cabeçalhos: `text-xs font-semibold py-3`
  - Células: `text-xs py-3`
  - Texto de paginação e contadores: `text-xs`
- Aumente o padding vertical das células: `py-3`
- Adicione margens laterais: `px-4 lg:px-6` no container da tabela
- Badges dentro da tabela: ver seção de Badges abaixo
- Botões dentro da tabela: `text-xs h-7` com ícones `h-3 w-3`

### 3. CARDS
- Diminua fontes dos títulos: de `text-2xl/text-3xl` para `text-xl/text-2xl`
- Diminua fontes das descrições: `text-xs`
- Reduza padding: de `p-4/p-5` para `p-3` ou `p-4`
- Reduza espaçamento entre cards: de `gap-4` para `gap-3`
- Diminua ícones: de `size-4` para `size-3`
- Reduza altura geral dos cards

### 4. BADGES

Todos os badges devem seguir o padrão visual consistente:

#### Especificações Gerais
- **Fonte**: `text-[10px]` (10px)
- **Padding**: `py-0.5 px-1.5`
- **Line height**: `leading-tight`
- **Ícones**: `h-3 w-3` (12px) com `mr-1` (4px de margem)

#### Badge de Status (Ativo/Inativo)
```tsx
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";

// Ativo (Verde)
<Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
  <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
  Ativo
</Badge>

// Inativo (Vermelho)
<Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
  <IconLoader className="mr-1 h-3 w-3" />
  Inativo
</Badge>
```

#### Badge de Telemedicina (Habilitada/Desabilitada)
```tsx
// Habilitada (Verde)
<Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
  <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
  Habilitada
</Badge>

// Desabilitada (Vermelho)
<Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
  <IconLoader className="mr-1 h-3 w-3" />
  Desabilitada
</Badge>
```

#### Badge de Informação (Clínicas, etc.)
```tsx
// Azul para informações
<Badge variant="outline" className="bg-transparent border-blue-500 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight">
  {quantidade} clínicas
</Badge>
```

#### Função Helper Recomendada
```tsx
const getStatusBadge = (ativo: boolean) => {
  if (ativo) {
    return (
      <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
        <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
        Ativo
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
        <IconLoader className="mr-1 h-3 w-3" />
        Inativo
      </Badge>
    );
  }
};
```

### 5. BOTÕES E AÇÕES

#### Botões Principais
Botões de ação principais (ex: "Nova Clínica", "Novo Pagamento", "Novo Plano"):

```tsx
<Button className="text-xs">
  <Plus className="mr-2 h-3.5 w-3.5" />
  Nova Ação
</Button>
```

**Especificações**:
- Fonte: `text-xs`
- Ícones: `h-3.5 w-3.5` (14px)
- Margem do ícone: `mr-2` (8px)
- Alinhar à direita: `justify-end` no container

#### Botões em Tabelas
Botões de ação dentro de tabelas:

```tsx
<Button
  variant="outline"
  size="sm"
  className="text-xs h-7"
>
  <Icon className="h-3 w-3 mr-1.5" />
  Texto do Botão
</Button>
```

**Especificações**:
- Fonte: `text-xs`
- Altura: `h-7` (28px)
- Variante: `variant="outline"`
- Tamanho: `size="sm"`
- Ícones: `h-3 w-3` (12px) com `mr-1.5` (6px)
- Gap entre botões: `gap-2` (8px)

### 6. ESPAÇAMENTO GERAL
- Reduza padding top inicial: de `pt-5/pt-6` para `pt-2/pt-3`
- Remova padding lateral desnecessário
- Use margens laterais consistentes: `px-4 lg:px-6`

### 7. LAYOUT
- Maximize o uso do espaço disponível
- Remova elementos visuais desnecessários (linhas divisórias, espaços excessivos)
- Mantenha o design limpo e compacto

### EXEMPLO DE ESTRUTURA FINAL:

```tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

return (
  <div className="@container/main flex flex-1 flex-col">
    <div className="flex flex-col">
      {/* Botões de ação alinhados à direita */}
      <div className="flex items-center justify-end px-4 lg:px-6 pt-2 pb-4">
        <Button className="text-xs">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Nova Ação
        </Button>
      </div>

      {/* Conteúdo com margens laterais */}
      <div className="px-4 lg:px-6">
        {/* Tabelas, cards, etc */}
      </div>
    </div>
  </div>
);
```

---

## NOTAS IMPORTANTES:

- O título da página já aparece automaticamente na barra superior através do `site-header.tsx`
- Não adicione títulos duplicados na página
- Mantenha consistência visual em todo o sistema
- Priorize legibilidade mesmo com fontes menores
- Teste a responsividade após os ajustes

---

## CHECKLIST DE APLICAÇÃO:

- [ ] Header removido (título e linha divisória)
- [ ] Fontes da tabela reduzidas para `text-xs`
- [ ] Padding das células aumentado (`py-3`)
- [ ] Margens laterais adicionadas (`px-4 lg:px-6`)
- [ ] Badges com estilo padrão: `text-[10px] py-0.5 px-1.5 leading-tight`
  - [ ] Badges de status: verde (ativo) / vermelho (inativo) com ícones
  - [ ] Badges de telemedicina: verde (habilitada) / vermelho (desabilitada)
  - [ ] Badges de informação: azul para dados numéricos
- [ ] Botões principais: `text-xs` com ícones `h-3.5 w-3.5`
- [ ] Botões em tabelas: `text-xs h-7` com ícones `h-3 w-3 mr-1.5`
- [ ] Cards com fontes reduzidas
- [ ] Espaçamento geral otimizado
- [ ] Botões de ação alinhados corretamente
- [ ] Layout mais espaçado e menos sufocado
- [ ] Sem erros de lint
