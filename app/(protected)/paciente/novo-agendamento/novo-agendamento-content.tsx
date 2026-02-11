"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function NovoAgendamentoContent() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Conteúdo com margens laterais */}
        <div className="px-4 lg:px-6 pt-2">
          <Card className="p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-muted-foreground">
                  Funcionalidade de novo agendamento em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
