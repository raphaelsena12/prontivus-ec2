"use client";

import { useState, useEffect } from "react";
import { Phone, Mail, Globe } from "lucide-react";

interface ClinicaData {
  nome: string;
  cnpj: string;
  telefone: string | null;
  email: string;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  site: string | null;
}

function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return cnpj;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

interface ReportHeaderPreviewProps {
  avatarUrl: string | null | undefined;
}

export function ReportHeaderPreview({ avatarUrl }: ReportHeaderPreviewProps) {
  const [clinica, setClinica] = useState<ClinicaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin-clinica/dados-clinica");
        if (res.ok) {
          const data = await res.json();
          setClinica(data.clinica);
        }
      } catch (e) {
        console.error("Erro ao carregar dados da cl\u00ednica:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !clinica) return null;

  const endereco = [
    clinica.endereco,
    clinica.numero ? `n\u00ba ${clinica.numero}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const enderecoComBairro = [endereco, clinica.bairro]
    .filter(Boolean)
    .join(" \u2014 ");

  const cidadeEstado = [clinica.cidade, clinica.estado]
    .filter(Boolean)
    .join(" / ");

  const cidadeEstadoCep = [
    cidadeEstado,
    clinica.cep ? `CEP ${clinica.cep}` : null,
  ]
    .filter(Boolean)
    .join("   ");

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">
        Preview do cabe{"ç"}alho nos relat{"ó"}rios e documentos
      </p>

      {/* Layout Moderno (com titulo) - usado em receitas, atestados, etc. */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Documentos do atendimento (receitas, atestados, etc.)
        </p>
        <div className="rounded border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-6">
            {/* Logo esquerda - proporção fiel ao PDF (maxH=28mm, maxW~77mm) */}
            <div className="flex shrink-0 items-center justify-center" style={{ width: 200, height: 100 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Logo"
                  style={{ maxWidth: 200, maxHeight: 100 }}
                  className="object-contain"
                />
              ) : (
                <span className="text-base font-bold text-slate-800">
                  {clinica.nome}
                </span>
              )}
            </div>

            {/* Divider vertical */}
            <div className="w-px self-stretch bg-slate-200" />

            {/* Info direita com icones */}
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {clinica.nome}
              </p>
              {clinica.telefone && (
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-600">
                    <Phone className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {clinica.telefone}
                  </span>
                </div>
              )}
              {clinica.email && (
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center bg-blue-600">
                    <Mail className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {clinica.email}
                  </span>
                </div>
              )}
              {clinica.site && (
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
                    <Globe className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {clinica.site}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Padrao (sem titulo) - usado em relatórios da clínica */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {"Relatórios da clínica (faturamento, estoque, etc.)"}
        </p>
        <div className="rounded border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo esquerda - proporção fiel ao PDF (maxH=25mm, maxW~79mm) */}
            <div className="flex shrink-0 items-center justify-start" style={{ width: 200, height: 90 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Logo"
                  style={{ maxWidth: 200, maxHeight: 90 }}
                  className="object-contain"
                />
              ) : (
                <span className="text-base font-bold text-slate-800">
                  {clinica.nome}
                </span>
              )}
            </div>

            {/* Info direita alinhada a direita */}
            <div className="flex flex-col items-end gap-0.5 text-right min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {clinica.nome}
              </p>
              {enderecoComBairro && (
                <p className="text-[10px] text-slate-600">{enderecoComBairro}</p>
              )}
              {cidadeEstadoCep && (
                <p className="text-[10px] text-slate-600">{cidadeEstadoCep}</p>
              )}
              {clinica.email && (
                <p className="text-[10px] text-slate-600">{clinica.email}</p>
              )}
              <p className="text-[10px] text-slate-600">
                CNPJ: {formatCNPJ(clinica.cnpj)}
              </p>
              {clinica.telefone && (
                <p className="text-[10px] text-slate-600">
                  Tel: {clinica.telefone}
                </p>
              )}
            </div>
          </div>
          {/* Linha separadora */}
          <div className="mt-3 border-t border-slate-200" />
        </div>
      </div>
    </div>
  );
}
