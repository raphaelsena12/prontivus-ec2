"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cloud, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export function ConfiguracoesAWS() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    accessKeyId: "",
    secretAccessKey: "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/aws", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configurações");
      }

      toast.success("Configurações AWS salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const awsRegions = [
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "Europe (Ireland)" },
    { value: "sa-east-1", label: "South America (São Paulo)" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações AWS</CardTitle>
          <CardDescription>
            Configure as credenciais AWS para Transcribe e Comprehend Medical
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Atenção: Credenciais Sensíveis
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  As credenciais AWS são informações sensíveis. Certifique-se de
                  que estão sendo armazenadas de forma segura. O AWS Comprehend
                  Medical está disponível apenas em us-east-1, us-west-2 ou
                  eu-west-1.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="region">Região AWS *</Label>
              <select
                id="region"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
              >
                {awsRegions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessKeyId">Access Key ID *</Label>
              <Input
                id="accessKeyId"
                type="text"
                value={formData.accessKeyId}
                onChange={(e) =>
                  setFormData({ ...formData, accessKeyId: e.target.value })
                }
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="secretAccessKey">Secret Access Key *</Label>
              <Input
                id="secretAccessKey"
                type="password"
                value={formData.secretAccessKey}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    secretAccessKey: e.target.value,
                  })
                }
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a chave atual
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Serviços AWS</p>
              <p className="text-xs text-muted-foreground">
                Transcribe e Comprehend Medical
              </p>
            </div>
            <Badge variant="outline">Configurado</Badge>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Cloud className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}








