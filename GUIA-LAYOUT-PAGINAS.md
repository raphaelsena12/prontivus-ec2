# Guia de Layout de Páginas - Prontivus

Este documento descreve o padrão de layout implementado na página de Clínicas (`/super-admin/clinicas`) e deve ser usado como referência para atualizar todas as outras páginas do sistema.

## 📋 Índice

1. [Breadcrumb no Navbar Superior](#1-breadcrumb-no-navbar-superior)
2. [Estrutura da Página](#2-estrutura-da-página)
3. [Título e Subtítulo](#3-título-e-subtítulo)
4. [Card Branco com Tabela](#4-card-branco-com-tabela)
5. [Header do Card](#5-header-do-card)
6. [Exemplo Completo](#6-exemplo-completo)

---

## 1. Breadcrumb no Navbar Superior

### Localização
O breadcrumb foi implementado no componente `components/site-header.tsx` e substitui o título estático anterior.

### Implementação

#### 1.1. Importar componentes do Breadcrumb

```typescript
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

#### 1.2. Criar função para gerar itens do breadcrumb

```typescript
const getBreadcrumbItems = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const items: Array<{ label: string; href: string; isLast: boolean }> = [];

  const routeLabels: Record<string, string> = {
    "super-admin": "Super Admin",
    "clinicas": "Clínicas",
    "pagamentos": "Pagamentos",
    "configuracoes": "Configurações",
    "admin-clinica": "Admin Clínica",
    "exames": "Exames",
    "especialidades": "Especialidades",
    "medicamentos": "Medicamentos",
    "pacientes": "Pacientes",
    "usuarios": "Usuários",
    "medicos": "Médicos",
    "procedimentos": "Procedimentos",
    "formas-pagamento": "Formas de Pagamento",
    "estoque": "Estoque",
    "contas-pagar": "Contas a Pagar",
    "contas-receber": "Contas a Receber",
    "fluxo-caixa": "Fluxo de Caixa",
    "medico": "Médico",
    "agendamentos": "Agendamentos",
    "fila-atendimento": "Fila de Atendimento",
    "prontuarios": "Prontuários",
    "dashboard-financeiro": "Dashboard Financeiro",
    "inadimplencia": "Inadimplência",
    "manipulados": "Manipulados",
    "secretaria": "Secretária",
    "painel-chamadas": "Painel de Chamadas",
    "check-in": "Check-in",
    "paciente": "Paciente",
    "novo-agendamento": "Novo Agendamento",
    "historico-consultas": "Histórico de Consultas",
    "historico-prescricoes": "Histórico de Prescrições",
    "dashboard": "Dashboard",
  };

  segments.forEach((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || capitalizeWords(segment.replace(/-/g, " "));
    items.push({
      label,
      href,
      isLast: index === segments.length - 1,
    });
  });

  return items;
};
```

#### 1.3. Substituir título estático por breadcrumb

**Antes:**
```typescript
<div className="flex-1">
  {pathname === "/super-admin" && user ? (
    <h1 className="text-base font-semibold tracking-tight text-foreground">
      Bem-vindo, {user.name}.
    </h1>
  ) : (
    <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
      {pageTitle}
    </h1>
  )}
</div>
```

**Depois:**
```typescript
<div className="flex-1">
  {pathname === "/super-admin" && user ? (
    <h1 className="text-base font-semibold tracking-tight text-foreground">
      Bem-vindo, {user.name}.
    </h1>
  ) : (
    <Breadcrumb>
      <BreadcrumbList>
        {getBreadcrumbItems(pathname).map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )}
</div>
```

### Observações
- O breadcrumb é gerado automaticamente baseado no `pathname`
- Rotas não mapeadas são capitalizadas automaticamente
- A página `/super-admin` mantém o comportamento especial (mostra "Bem-vindo, {nome}")

---

## 2. Estrutura da Página

### Container Principal

```typescript
<div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
  {/* Conteúdo aqui */}
</div>
```

**Classes:**
- `@container/main`: Container responsivo
- `flex flex-1 flex-col`: Layout flexível em coluna
- `px-4 lg:px-6`: Padding horizontal responsivo
- `py-6`: Padding vertical

---

## 3. Título e Subtítulo

### Estrutura

```typescript
<div className="mb-6">
  <div className="flex items-center gap-3 mb-2">
    <Building2 className="h-6 w-6 text-primary" />
    <h1 className="text-2xl font-semibold text-foreground">Clínicas</h1>
  </div>
  <p className="text-sm text-muted-foreground ml-9">
    Gerencie as clínicas cadastradas no sistema
  </p>
</div>
```

### Componentes

1. **Ícone**: Use ícones do `lucide-react` ou `@tabler/icons-react`
   - Tamanho: `h-6 w-6`
   - Cor: `text-primary`

2. **Título (h1)**:
   - Tamanho: `text-2xl`
   - Peso: `font-semibold`
   - Cor: `text-foreground`

3. **Subtítulo (p)**:
   - Tamanho: `text-sm`
   - Cor: `text-muted-foreground`
   - Margem esquerda: `ml-9` (para alinhar com o título, considerando o ícone)

### Ícones Sugeridos por Seção

- **Clínicas**: `Building2`
- **Usuários**: `Users`
- **Pacientes**: `UserCircle`
- **Médicos**: `Stethoscope` ou `UserMd`
- **Agendamentos**: `Calendar`
- **Exames**: `FileText` ou `ClipboardList`
- **Medicamentos**: `Pill` ou `Capsule`
- **Estoque**: `Package` ou `Box`
- **Financeiro**: `DollarSign` ou `Wallet`
- **Configurações**: `Settings` ou `Cog`

---

## 4. Card Branco com Tabela

### Estrutura do Card

```typescript
<Card className="bg-white border shadow-sm">
  {/* Header do Card */}
  <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
    {/* Conteúdo do header */}
  </CardHeader>
  
  {/* Conteúdo do Card (Tabela) */}
  <CardContent className="p-0">
    {/* Tabela aqui */}
  </CardContent>
</Card>
```

### Classes do Card

- `bg-white`: Fundo branco
- `border`: Borda
- `shadow-sm`: Sombra suave

### Importar Componentes

```typescript
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

---

## 5. Header do Card

### Estrutura Completa

```typescript
<CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
  {/* Lado Esquerdo: Ícone + Título */}
  <div className="flex items-center gap-1.5">
    <Filter className="h-3 w-3 text-muted-foreground" />
    <CardTitle className="text-sm font-semibold">Lista de Clínicas</CardTitle>
  </div>
  
  {/* Lado Direito: Botão de Ação */}
  <Button 
    onClick={handleCreate} 
    className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
  >
    <Plus className="mr-1.5 h-3 w-3" />
    Nova Clínica
  </Button>
</CardHeader>
```

### Especificações do Header

#### Classes do CardHeader
- `flex flex-row items-center justify-between`: Layout flexível horizontal
- `pb-1`: Padding inferior mínimo
- `border-b`: Borda inferior
- `px-6`: Padding horizontal
- `pt-1.5`: Padding superior reduzido

#### Lado Esquerdo (Título)
- **Container**: `flex items-center gap-1.5`
- **Ícone**: 
  - Tamanho: `h-3 w-3`
  - Cor: `text-muted-foreground`
- **Título**:
  - Tamanho: `text-sm`
  - Peso: `font-semibold`

#### Lado Direito (Botão)
- **Altura**: `h-8` (padronizado com botão "Nova Conta" de contas a pagar)
- **Texto**: `text-xs`
- **Padding horizontal**: `px-3`
- **Ícone**: `h-3 w-3` com `mr-1.5`

### Botões de Ação Comuns

- **Criar/Novo**: `Nova Clínica`, `Novo Usuário`, `Novo Paciente`, etc.
- **Exportar**: `Exportar`, `Baixar Relatório`
- **Filtrar**: `Filtros` (com ícone de filtro)
- **Atualizar**: `Atualizar` (com ícone de refresh)

### Páginas Financeiras (Padrão Especial)

Nas páginas financeiras (Contas a Pagar, Contas a Receber, Fluxo de Caixa), os controles de busca, filtros e botões devem ficar **ao lado do título da tabela** no `CardHeader`, não dentro da tabela.

#### Estrutura do CardHeader para Páginas Financeiras

```typescript
<CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
  {/* Lado Esquerdo: Ícone + Título */}
  <div className="flex items-center gap-1.5">
    <Filter className="h-3 w-3 text-muted-foreground" />
    <CardTitle className="text-sm font-semibold">Lista de Contas a Pagar</CardTitle>
  </div>
  
  {/* Lado Direito: Input de Busca + Filtros + Botão */}
  <div className="flex items-center gap-2">
    {/* Input de Busca */}
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
      <Input 
        type="search"
        placeholder="Buscar por descrição ou fornecedor..." 
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="pl-9 h-8 text-xs bg-background w-64" 
      />
    </div>
    
    {/* Filtro de Status */}
    <Select
      value={statusFilter}
      onValueChange={setStatusFilter}
    >
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        <SelectItem value="PENDENTE">Pendente</SelectItem>
        <SelectItem value="PAGO">Pago</SelectItem>
        <SelectItem value="VENCIDO">Vencido</SelectItem>
        <SelectItem value="CANCELADO">Cancelado</SelectItem>
      </SelectContent>
    </Select>
    
    {/* Botão de Ação */}
    <Button onClick={() => router.push("/admin-clinica/contas-pagar/novo")} className="h-8 text-xs">
      <Plus className="mr-2 h-3.5 w-3.5" />
      Nova Conta
    </Button>
  </div>
</CardHeader>
```

#### Especificações para Páginas Financeiras

1. **Input de Busca**:
   - Largura: `w-64` (ou `max-w-md` para responsividade)
   - Altura: `h-8`
   - Ícone de busca: `h-3 w-3` posicionado à esquerda com `pl-9`
   - Texto: `text-xs`

2. **Filtros (Select)**:
   - Largura: `w-[180px]`
   - Altura: `h-8`
   - Texto: `text-xs`

3. **Filtros de Data (Fluxo de Caixa)**:
   - Largura: `w-[150px]` para cada input
   - Altura: `h-8`
   - Texto: `text-xs`
   - Agrupar com ícone de calendário e texto "até" entre as datas

4. **Botão de Ação**:
   - Altura: `h-8`
   - Texto: `text-xs`
   - Ícone: `h-3.5 w-3.5` com `mr-2`

5. **Container dos Controles**:
   - Use `flex items-center gap-2` para alinhar horizontalmente
   - Use `flex-wrap` se necessário para responsividade (ex: Fluxo de Caixa)

#### Gerenciamento de Estado

Os estados de busca e filtros devem ser gerenciados no componente pai (`*-content.tsx`), não na tabela:

```typescript
// No componente pai
const [globalFilter, setGlobalFilter] = useState<string>("");
const [statusFilter, setStatusFilter] = useState<string>("all");

// Passar para a tabela via props
<ContasPagarTable 
  data={contas} 
  statusFilter={statusFilter}
  onStatusFilterChange={setStatusFilter}
  globalFilter={globalFilter}
  onGlobalFilterChange={setGlobalFilter}
  onDelete={handleDeleteClick}
/>
```

#### Remover Controles da Tabela

As tabelas financeiras **não devem** ter controles internos. Remova:
- Inputs de busca
- Filtros (Select)
- Botões de ação

A tabela deve apenas receber os valores via props e renderizar os dados.

---

## 6. Exemplo Completo

### Página Completa de Clínicas

```typescript
"use client";

import { useState } from "react";
import { Building2, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClinicasTable } from "@/components/clinicas-table";

export function ClinicasContent({ clinicas, planos }: ClinicasContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = () => {
    setDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Clínicas</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie as clínicas cadastradas no sistema
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Clínicas</CardTitle>
          </div>
          <Button 
            onClick={handleCreate} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Nova Clínica
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ClinicasTable
            data={clinicas}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onManageUsers={handleManageUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. Checklist de Implementação

Use este checklist ao atualizar cada página:

### ✅ Breadcrumb
- [ ] Breadcrumb implementado no `site-header.tsx` (já está global)
- [ ] Rota adicionada ao mapeamento `routeLabels` se necessário

### ✅ Estrutura da Página
- [ ] Container principal com classes corretas
- [ ] Padding responsivo aplicado

### ✅ Título e Subtítulo
- [ ] Ícone escolhido e importado
- [ ] Título (h1) com classes corretas
- [ ] Subtítulo descritivo adicionado
- [ ] Alinhamento correto (ml-9 no subtítulo)

### ✅ Card Branco
- [ ] Card importado e configurado
- [ ] Classes de estilo aplicadas (bg-white, border, shadow-sm)

### ✅ Header do Card
- [ ] CardHeader com classes corretas
- [ ] Ícone de filtro + título no lado esquerdo
- [ ] Botão de ação no lado direito
- [ ] Tamanhos e espaçamentos corretos

### ✅ Tabela
- [ ] Tabela dentro do CardContent
- [ ] CardContent com `p-0` para remover padding padrão
- [ ] Padding da tabela ajustado internamente

---

## 8. Padrões de Nomenclatura

### Títulos de Páginas
- Use substantivos no plural quando for lista: "Clínicas", "Usuários", "Pacientes"
- Use substantivos no singular quando for formulário: "Nova Clínica", "Editar Usuário"

### Subtítulos
- Comece com verbo no imperativo: "Gerencie...", "Visualize...", "Configure..."
- Seja descritivo mas conciso

### Botões
- Use "Novo" + substantivo: "Nova Clínica", "Novo Usuário"
- Use verbos de ação: "Exportar", "Filtrar", "Atualizar"

---

## 9. Ajustes de Tabela

### Remover Padding Duplicado

Quando a tabela está dentro do Card, ajuste o padding:

**Antes:**
```typescript
<div className="flex flex-col gap-4 overflow-auto px-4 lg:px-6">
  <div className="overflow-hidden rounded-lg border">
    <Table>...</Table>
  </div>
</div>
```

**Depois:**
```typescript
<div className="flex flex-col gap-4 overflow-auto">
  <div className="overflow-hidden px-6 pt-6">
    <Table>...</Table>
  </div>
  {/* Paginação com padding */}
  <div className="flex items-center justify-between px-6 pb-6">
    {/* Controles de paginação */}
  </div>
</div>
```

### Tabelas Financeiras - Remover Controles Internos

Para páginas financeiras, **remova todos os controles** (input de busca, filtros, botões) de dentro da tabela. Eles devem estar apenas no `CardHeader`.

**Antes (ERRADO - Controles na Tabela):**
```typescript
<div className="flex flex-col">
  <div className="flex items-center justify-end px-4 lg:px-6 pt-2 pb-4 gap-2">
    <Input placeholder="Buscar..." />
    <Select>...</Select>
    <Button>Nova Conta</Button>
  </div>
  <div className="px-4 lg:px-6">
    <Table>...</Table>
  </div>
</div>
```

**Depois (CORRETO - Controles no CardHeader):**
```typescript
// No componente pai (*-content.tsx)
<CardHeader>
  <div className="flex items-center gap-1.5">
    <Filter className="h-3 w-3" />
    <CardTitle>Lista de Contas a Pagar</CardTitle>
  </div>
  <div className="flex items-center gap-2">
    <Input placeholder="Buscar..." />
    <Select>...</Select>
    <Button>Nova Conta</Button>
  </div>
</CardHeader>

// Na tabela (*-table.tsx)
<div className="flex flex-col gap-4 overflow-auto">
  <div className="overflow-hidden px-6 pt-6">
    <Table>...</Table>
  </div>
  <div className="flex items-center justify-between px-6 pb-6">
    {/* Paginação */}
  </div>
</div>
```

---

## 10. Exemplos por Tipo de Página

### Página de Listagem (Tabela)

```typescript
<div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
  {/* Título e Subtítulo */}
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
      <Icon className="h-6 w-6 text-primary" />
      <h1 className="text-2xl font-semibold text-foreground">Título</h1>
    </div>
    <p className="text-sm text-muted-foreground ml-9">
      Descrição da funcionalidade
    </p>
  </div>

  {/* Card com Tabela */}
  <Card className="bg-white border shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
      <div className="flex items-center gap-1.5">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">Lista de Itens</CardTitle>
      </div>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
        <Plus className="mr-1.5 h-3 w-3" />
        Novo Item
      </Button>
    </CardHeader>
    <CardContent className="p-0">
      {/* Tabela aqui */}
    </CardContent>
  </Card>
</div>
```

### Página de Formulário

```typescript
<div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
  {/* Título e Subtítulo */}
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
      <Icon className="h-6 w-6 text-primary" />
      <h1 className="text-2xl font-semibold text-foreground">Novo Item</h1>
    </div>
    <p className="text-sm text-muted-foreground ml-9">
      Preencha os dados para criar um novo item
    </p>
  </div>

  {/* Card com Formulário */}
  <Card className="bg-white border shadow-sm">
    <CardContent className="p-6">
      {/* Formulário aqui */}
    </CardContent>
  </Card>
</div>
```

---

## 11. Notas Importantes

1. **Breadcrumb é Global**: Não precisa adicionar breadcrumb em cada página, ele já está no header
2. **Consistência Visual**: Mantenha os mesmos tamanhos e espaçamentos em todas as páginas
3. **Responsividade**: Use as classes responsivas (`lg:px-6`, etc.) para diferentes tamanhos de tela
4. **Acessibilidade**: Mantenha os títulos semânticos (h1, h2) e use ícones descritivos
5. **Performance**: Importe apenas os ícones necessários do `lucide-react`

---

## 12. Próximos Passos

1. Atualizar todas as páginas de listagem seguindo este padrão
2. Atualizar páginas de formulário com layout similar
3. Adicionar novas rotas ao mapeamento de breadcrumb conforme necessário
4. Revisar e padronizar ícones usados em cada seção

---

---

## 13. Diferenças entre Páginas de Cadastro e Financeiras

### Páginas de Cadastro (Padrão Simples)
- **CardHeader**: Apenas título (com ícone Filter) e botão de ação
- **Controles**: Apenas botão "Novo" ou "Upload em Massa" no header
- **Exemplos**: Pacientes, Usuários, Médicos, Especialidades, Exames, etc.

### Páginas Financeiras (Padrão Completo)
- **CardHeader**: Título + Input de busca + Filtros + Botão de ação
- **Controles**: Input de busca, filtros (status, tipo, datas) e botão no header
- **Exemplos**: Contas a Pagar, Contas a Receber, Fluxo de Caixa
- **Estado**: Gerenciado no componente pai, passado via props para a tabela

### Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│ PÁGINAS DE CADASTRO                                      │
├─────────────────────────────────────────────────────────┤
│ CardHeader: [Filter] Lista de Itens    [Botão Novo]    │
│ CardContent: [Tabela]                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PÁGINAS FINANCEIRAS                                     │
├─────────────────────────────────────────────────────────┤
│ CardHeader: [Filter] Lista    [Busca] [Filtro] [Botão] │
│ CardContent: [Tabela]                                   │
└─────────────────────────────────────────────────────────┘
```

---

**Última atualização**: 12/02/2026
**Versão**: 1.1
