"use client";

import React from "react";

interface VitalSign {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  status: string;
  iconColor: string;
}

interface Consulta {
  id: string;
  dataHora: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
    email: string | null;
    dataNascimento: string;
    observacoes?: string | null;
    numeroProntuario: number | null;
  };
  codigoTuss: { codigoTuss: string; descricao: string } | null;
  tipoConsulta: { nome: string } | null;
}

interface PatientHeaderProps {
  consulta: Consulta;
  vitals: VitalSign[];
  allergies: string[];
  sessionDuration: string;
  saving: boolean;
  isTelemedicina: boolean;
  onOpenResumoClinico: () => void;
  onFinalizar: () => void;
  onEnterTelemedicina?: () => void;
}

export function PatientHeader({
  consulta,
  vitals,
  allergies,
  sessionDuration,
  saving,
  isTelemedicina,
  onOpenResumoClinico,
  onFinalizar,
  onEnterTelemedicina,
}: PatientHeaderProps) {
  return null;
}
