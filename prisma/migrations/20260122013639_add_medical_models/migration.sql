-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "nomeMae" TEXT,
    "nomePai" TEXT,
    "profissao" TEXT,
    "estadoCivil" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exames" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "principioAtivo" TEXT,
    "laboratorio" TEXT,
    "apresentacao" TEXT,
    "concentracao" TEXT,
    "unidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fornecedor" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "formaPagamentoId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pacienteId" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataRecebimento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "formaPagamentoId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxo_caixa" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "formaPagamentoId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxo_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_medicamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "quantidadeAtual" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMinima" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMaxima" INTEGER,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "localizacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "estoqueId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "observacoes" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "observacoes" TEXT,
    "procedimentoId" TEXT,
    "valor" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuarios" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "consultaId" TEXT,
    "anamnese" TEXT,
    "exameFisico" TEXT,
    "diagnostico" TEXT,
    "conduta" TEXT,
    "evolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prontuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_exames" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "exameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SOLICITADO',
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRealizacao" TIMESTAMP(3),
    "resultado" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_exames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescricoes_medicamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "posologia" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescricoes_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pacientes_clinicaId_idx" ON "pacientes"("clinicaId");

-- CreateIndex
CREATE INDEX "pacientes_cpf_idx" ON "pacientes"("cpf");

-- CreateIndex
CREATE INDEX "pacientes_nome_idx" ON "pacientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_usuarioId_key" ON "medicos"("usuarioId");

-- CreateIndex
CREATE INDEX "medicos_clinicaId_idx" ON "medicos"("clinicaId");

-- CreateIndex
CREATE INDEX "medicos_crm_idx" ON "medicos"("crm");

-- CreateIndex
CREATE INDEX "exames_clinicaId_idx" ON "exames"("clinicaId");

-- CreateIndex
CREATE INDEX "exames_nome_idx" ON "exames"("nome");

-- CreateIndex
CREATE INDEX "medicamentos_clinicaId_idx" ON "medicamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "medicamentos_nome_idx" ON "medicamentos"("nome");

-- CreateIndex
CREATE INDEX "procedimentos_clinicaId_idx" ON "procedimentos"("clinicaId");

-- CreateIndex
CREATE INDEX "procedimentos_codigo_idx" ON "procedimentos"("codigo");

-- CreateIndex
CREATE INDEX "formas_pagamento_clinicaId_idx" ON "formas_pagamento"("clinicaId");

-- CreateIndex
CREATE INDEX "formas_pagamento_nome_idx" ON "formas_pagamento"("nome");

-- CreateIndex
CREATE INDEX "contas_pagar_clinicaId_idx" ON "contas_pagar"("clinicaId");

-- CreateIndex
CREATE INDEX "contas_pagar_status_idx" ON "contas_pagar"("status");

-- CreateIndex
CREATE INDEX "contas_pagar_dataVencimento_idx" ON "contas_pagar"("dataVencimento");

-- CreateIndex
CREATE INDEX "contas_receber_clinicaId_idx" ON "contas_receber"("clinicaId");

-- CreateIndex
CREATE INDEX "contas_receber_status_idx" ON "contas_receber"("status");

-- CreateIndex
CREATE INDEX "contas_receber_dataVencimento_idx" ON "contas_receber"("dataVencimento");

-- CreateIndex
CREATE INDEX "fluxo_caixa_clinicaId_idx" ON "fluxo_caixa"("clinicaId");

-- CreateIndex
CREATE INDEX "fluxo_caixa_tipo_idx" ON "fluxo_caixa"("tipo");

-- CreateIndex
CREATE INDEX "fluxo_caixa_data_idx" ON "fluxo_caixa"("data");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_medicamentos_medicamentoId_key" ON "estoque_medicamentos"("medicamentoId");

-- CreateIndex
CREATE INDEX "estoque_medicamentos_clinicaId_idx" ON "estoque_medicamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "estoque_medicamentos_medicamentoId_idx" ON "estoque_medicamentos"("medicamentoId");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_clinicaId_idx" ON "movimentacoes_estoque"("clinicaId");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_estoqueId_idx" ON "movimentacoes_estoque"("estoqueId");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tipo_idx" ON "movimentacoes_estoque"("tipo");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_data_idx" ON "movimentacoes_estoque"("data");

-- CreateIndex
CREATE INDEX "consultas_clinicaId_idx" ON "consultas"("clinicaId");

-- CreateIndex
CREATE INDEX "consultas_pacienteId_idx" ON "consultas"("pacienteId");

-- CreateIndex
CREATE INDEX "consultas_medicoId_idx" ON "consultas"("medicoId");

-- CreateIndex
CREATE INDEX "consultas_dataHora_idx" ON "consultas"("dataHora");

-- CreateIndex
CREATE INDEX "prontuarios_clinicaId_idx" ON "prontuarios"("clinicaId");

-- CreateIndex
CREATE INDEX "prontuarios_pacienteId_idx" ON "prontuarios"("pacienteId");

-- CreateIndex
CREATE INDEX "prontuarios_medicoId_idx" ON "prontuarios"("medicoId");

-- CreateIndex
CREATE INDEX "solicitacoes_exames_clinicaId_idx" ON "solicitacoes_exames"("clinicaId");

-- CreateIndex
CREATE INDEX "solicitacoes_exames_consultaId_idx" ON "solicitacoes_exames"("consultaId");

-- CreateIndex
CREATE INDEX "solicitacoes_exames_exameId_idx" ON "solicitacoes_exames"("exameId");

-- CreateIndex
CREATE INDEX "prescricoes_medicamentos_clinicaId_idx" ON "prescricoes_medicamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "prescricoes_medicamentos_consultaId_idx" ON "prescricoes_medicamentos"("consultaId");

-- CreateIndex
CREATE INDEX "prescricoes_medicamentos_medicamentoId_idx" ON "prescricoes_medicamentos"("medicamentoId");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exames" ADD CONSTRAINT "exames_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicamentos" ADD CONSTRAINT "medicamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedimentos" ADD CONSTRAINT "procedimentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxo_caixa" ADD CONSTRAINT "fluxo_caixa_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxo_caixa" ADD CONSTRAINT "fluxo_caixa_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_medicamentos" ADD CONSTRAINT "estoque_medicamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_medicamentos" ADD CONSTRAINT "estoque_medicamentos_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "estoque_medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "procedimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_exames" ADD CONSTRAINT "solicitacoes_exames_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_exames" ADD CONSTRAINT "solicitacoes_exames_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_exames" ADD CONSTRAINT "solicitacoes_exames_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "exames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes_medicamentos" ADD CONSTRAINT "prescricoes_medicamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes_medicamentos" ADD CONSTRAINT "prescricoes_medicamentos_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes_medicamentos" ADD CONSTRAINT "prescricoes_medicamentos_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
