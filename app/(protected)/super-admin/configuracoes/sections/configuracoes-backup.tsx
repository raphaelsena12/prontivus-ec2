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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, Download, Clock, CheckCircle2 } from "lucide-react";

export function ConfiguracoesBackup() {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [formData, setFormData] = useState({
    backupAutomatico: true,
    frequenciaBackup: "daily", // daily, weekly, monthly
    horaBackup: "02:00",
    manterBackups: 30,
    backupAntesAtualizacao: true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/backup", {
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

      toast.success("Configurações de backup salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupManual = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/backup/manual", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar backup");
      }

      toast.success("Backup criado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar backup");
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Backup</CardTitle>
          <CardDescription>
            Configure backups automáticos e gerencie cópias de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backupAutomatico">Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Cria backups automaticamente conforme agendamento
                </p>
              </div>
              <Switch
                id="backupAutomatico"
                checked={formData.backupAutomatico}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, backupAutomatico: checked })
                }
              />
            </div>

            {formData.backupAutomatico && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequenciaBackup">Frequência</Label>
                    <select
                      id="frequenciaBackup"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={formData.frequenciaBackup}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          frequenciaBackup: e.target.value,
                        })
                      }
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horaBackup">Horário do Backup</Label>
                    <Input
                      id="horaBackup"
                      type="time"
                      value={formData.horaBackup}
                      onChange={(e) =>
                        setFormData({ ...formData, horaBackup: e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="manterBackups">
                Manter Backups (dias)
              </Label>
              <Input
                id="manterBackups"
                type="number"
                min="1"
                value={formData.manterBackups}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    manterBackups: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Backups mais antigos serão removidos automaticamente
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backupAntesAtualizacao">
                  Backup antes de Atualizações
                </Label>
                <p className="text-sm text-muted-foreground">
                  Cria backup automático antes de atualizar o sistema
                </p>
              </div>
              <Switch
                id="backupAntesAtualizacao"
                checked={formData.backupAntesAtualizacao}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    backupAntesAtualizacao: checked,
                  })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Último Backup</p>
                <p className="text-xs text-muted-foreground">
                  Não disponível
                </p>
              </div>
              <Badge variant="outline">N/A</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBackupManual}
              disabled={backupLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              {backupLoading ? "Criando..." : "Criar Backup Manual"}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Database className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








