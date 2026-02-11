"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Stethoscope,
  Microscope,
  CheckCircle2,
} from "lucide-react";

interface CIDCode {
  code: string;
  description: string;
  score: number;
}

interface Exame {
  nome: string;
  tipo: string;
  justificativa: string;
}

interface MedicalAnalysisResultsProps {
  anamnese: string;
  cidCodes: CIDCode[];
  exames: Exame[];
}

export function MedicalAnalysisResults({
  anamnese,
  cidCodes,
  exames,
}: MedicalAnalysisResultsProps) {
  // Garantir que são arrays válidos
  const validCidCodes = Array.isArray(cidCodes) ? cidCodes : [];
  const validExames = Array.isArray(exames) ? exames : [];
  const validAnamnese = anamnese || "";

  // Debug: verificar dados recebidos
  console.log("=== MedicalAnalysisResults - Dados Recebidos ===");
  console.log("CID Codes original:", cidCodes);
  console.log("CID Codes validado:", validCidCodes);
  console.log("CID Codes length:", validCidCodes.length);
  console.log("CID Codes é array?", Array.isArray(validCidCodes));
  if (validCidCodes.length > 0) {
    console.log("Primeiro CID:", validCidCodes[0]);
  }
  console.log("Exames original:", exames);
  console.log("Exames validado:", validExames);
  console.log("Exames length:", validExames.length);
  console.log("Anamnese length:", validAnamnese.length);
  console.log("================================================");

  // Verificar se há dados para renderizar
  const hasCidCodes = validCidCodes.length > 0;
  const hasExames = validExames.length > 0;
  
  console.log("=== Renderizando MedicalAnalysisResults ===");
  console.log("hasCidCodes:", hasCidCodes, "count:", validCidCodes.length);
  console.log("hasExames:", hasExames, "count:", validExames.length);
  console.log("validCidCodes:", validCidCodes);
  console.log("validExames:", validExames);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Anamnese */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-2 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                Anamnese Gerada
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-white">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[280px] pr-3">
            <div className="bg-white rounded border border-slate-200 p-4">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed">
                {validAnamnese}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Grid de CID e Exames */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Códigos CID-10 */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-2 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-600" />
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Códigos CID-10
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-white">
                {validCidCodes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-2.5">
                {validCidCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Nenhum código identificado</p>
                    <p className="text-xs text-slate-400 mt-1">Os códigos CID-10 aparecerão aqui após a análise</p>
                  </div>
                ) : (
                  validCidCodes.map((cid, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge className="bg-slate-700 text-white font-mono text-xs font-medium px-2 py-0.5">
                          {cid.code}
                        </Badge>
                        <span className="text-xs text-slate-500 font-medium">
                          {Math.round(cid.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {cid.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Exames Sugeridos */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-2 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Microscope className="w-4 h-4 text-slate-600" />
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Exames Sugeridos
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-white">
                {validExames.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-2.5">
                {validExames.length === 0 ? (
                  <div className="text-center py-8">
                    <Microscope className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Nenhum exame sugerido</p>
                    <p className="text-xs text-slate-400 mt-1">Os exames sugeridos aparecerão aqui após a análise</p>
                  </div>
                ) : (
                  validExames.map((exame, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-xs text-slate-800 mb-1.5">
                            {exame.nome}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-xs border-slate-300 text-slate-600 bg-slate-50"
                          >
                            {exame.tipo}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="my-2 bg-slate-200" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {exame.justificativa}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
