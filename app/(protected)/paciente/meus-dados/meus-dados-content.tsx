"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DSARSection } from "@/components/lgpd/dsar-section";

export function MeusDadosContent() {
  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={ShieldCheck}
        title="Meus Dados"
        subtitle="Gerencie seus dados pessoais conforme a LGPD (Art. 18)"
      />

      <DSARSection />
    </div>
  );
}
