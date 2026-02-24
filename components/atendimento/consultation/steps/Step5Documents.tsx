"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ClipboardList,
  FlaskConical,
  Send,
  CheckCircle2,
  ExternalLink,
  Printer,
  Loader2,
  Plus,
} from "lucide-react";

interface DocumentModel {
  id: string;
  nome: string;
}

interface DocumentoGerado {
  id: string;
  tipoDocumento: string;
  nomeDocumento: string;
  createdAt: string;
  pdfBlob?: Blob;
}

interface Step5DocumentsProps {
  documentModels: DocumentModel[];
  documentosGerados: DocumentoGerado[];
  handleGenerateDocument: (modelId: string) => Promise<void>;
  documentoSearch: string;
  setDocumentoSearch: (v: string) => void;
  documentoSuggestions: DocumentModel[];
}

// Documentos em destaque no grid
const FEATURED_DOCS = [
  {
    id: "receita-medica",
    label: "Receita Médica",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "atestado-afastamento",
    label: "Atestado Médico",
    icon: ClipboardList,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: "pedido-exames",
    label: "Pedido de Exames",
    icon: FlaskConical,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: "guia-encaminhamento",
    label: "Encaminhamento",
    icon: Send,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

export function Step5Documents({
  documentModels,
  documentosGerados,
  handleGenerateDocument,
  documentoSearch,
  setDocumentoSearch,
  documentoSuggestions,
}: Step5DocumentsProps) {
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [showAllDocs, setShowAllDocs] = useState(false);

  const isGenerated = (id: string) =>
    documentosGerados.some((d) => d.tipoDocumento === id);

  const handleGenerate = async (id: string) => {
    setLoadingDoc(id);
    try {
      await handleGenerateDocument(id);
    } finally {
      setLoadingDoc(null);
    }
  };

  const openDoc = (doc: DocumentoGerado) => {
    if (doc.pdfBlob) {
      const url = URL.createObjectURL(doc.pdfBlob);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid de documentos em destaque */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">Gerar Documentos</span>
          </div>
        </div>

        <div className="p-5">
          {/* Grid 4 colunas dos documentos principais */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {FEATURED_DOCS.map((doc) => {
              const generated = isGenerated(doc.id);
              const loading = loadingDoc === doc.id;
              const Icon = doc.icon;

              return (
                <div
                  key={doc.id}
                  className={`border rounded-xl p-4 flex flex-col items-center text-center gap-3 transition-all ${
                    generated
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:border-[#1E40AF] hover:shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.bg}`}>
                    <Icon className={`w-5 h-5 ${doc.color}`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{doc.label}</p>

                  {generated ? (
                    <div className="space-y-1.5 w-full">
                      <Badge className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 w-full justify-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Gerado
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerate(doc.id)}
                        className="h-6 text-[10px] text-slate-500 hover:text-slate-700 w-full px-1"
                        disabled={loading}
                      >
                        Reabrir
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(doc.id)}
                      disabled={loading}
                      className="h-7 px-3 text-xs gap-1 w-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Gerar"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Outros documentos */}
          <div>
            <button
              onClick={() => setShowAllDocs((v) => !v)}
              className="text-xs text-[#1E40AF] hover:text-[#1e3a8a] font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {showAllDocs ? "Menos documentos" : "Ver todos os documentos disponíveis"}
            </button>

            {showAllDocs && (
              <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                  <input
                    type="text"
                    value={documentoSearch}
                    onChange={(e) => setDocumentoSearch(e.target.value)}
                    placeholder="Buscar documento..."
                    className="w-full text-xs bg-transparent outline-none text-slate-600 placeholder:text-slate-400"
                  />
                </div>
                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                  {(documentoSearch ? documentoSuggestions : documentModels).map((doc) => {
                    const generated = isGenerated(doc.id);
                    const loading = loadingDoc === doc.id;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-700">{doc.nome}</span>
                          {generated && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 h-4">
                              Gerado
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerate(doc.id)}
                          disabled={loading}
                          className="h-6 px-2 text-[10px] border-slate-200 text-slate-600"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : generated ? "Reabrir" : "Gerar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de documentos gerados nesta consulta */}
      {documentosGerados.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">
              Documentos desta consulta
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {documentosGerados.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{doc.nomeDocumento}</p>
                    <p className="text-xs text-slate-400">Gerado às {formatTime(doc.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Gerado
                  </Badge>
                  {doc.pdfBlob && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDoc(doc)}
                        className="h-7 px-2 text-xs gap-1 text-slate-500 hover:text-[#1E40AF]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.print()}
                        className="h-7 px-2 text-xs gap-1 text-slate-500 hover:text-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
