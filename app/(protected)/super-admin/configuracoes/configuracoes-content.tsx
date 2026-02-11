"use client";

import { GestaoPlanos } from "./sections/gestao-planos";

interface Plano {
  id: string;
  nome: string;
  tokensMensais: number;
  preco: number;
  telemedicineHabilitada: boolean;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EstatisticaPlano {
  id: string;
  nome: string;
  totalClinicas: number;
}

interface ConfiguracoesContentProps {
  planos: Plano[];
  estatisticasPlanos: EstatisticaPlano[];
}

export function ConfiguracoesContent({
  planos,
  estatisticasPlanos,
}: ConfiguracoesContentProps) {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        <div className="px-4 lg:px-6 pt-2">
          <GestaoPlanos
            planos={planos}
            estatisticasPlanos={estatisticasPlanos}
          />
        </div>
      </div>
    </div>
  );
}

