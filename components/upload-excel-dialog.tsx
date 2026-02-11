"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  title: string;
  description: string;
  onSuccess?: () => void;
  templateUrl?: string;
}

export function UploadExcelDialog({
  open,
  onOpenChange,
  endpoint,
  title,
  description,
  onSuccess,
  templateUrl,
}: UploadExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validExtensions = [
        ".xlsx",
        ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      const fileExtension = selectedFile.name
        .toLowerCase()
        .substring(selectedFile.name.lastIndexOf("."));
      const isValidType =
        validExtensions.includes(fileExtension) ||
        validExtensions.includes(selectedFile.type);

      if (!isValidType) {
        setError("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecione um arquivo");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "Erro ao processar arquivo";
        
        // Se houver detalhes de validação, formatar e exibir
        if (data.details && Array.isArray(data.details)) {
          const detailsMessages = data.details.map((detail: any) => {
            const field = detail.path?.join(".") || "campo";
            return `${field}: ${detail.message}`;
          }).join("; ");
          errorMessage = `${errorMessage} - ${detailsMessages}`;
        }
        
        throw new Error(errorMessage);
      }

      toast.success(
        `Upload realizado com sucesso! ${data.success || data.criados || 0} registro(s) importado(s).`
      );

      if (data.erros && data.erros.length > 0) {
        console.warn("Erros durante importação:", data.erros);
        const errosPreview = data.erros.slice(0, 3).join("; ");
        const maisErros = data.erros.length > 3 ? ` e mais ${data.erros.length - 3} erro(s)` : "";
        toast.warning(
          `${data.erros.length} registro(s) com erro: ${errosPreview}${maisErros}. Verifique o console para todos os detalhes.`,
          { duration: 8000 }
        );
      }

      setFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      setError(error.message || "Erro ao fazer upload do arquivo");
      toast.error(error.message || "Erro ao fazer upload do arquivo");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (templateUrl) {
      window.open(templateUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo Excel</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {templateUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Baixar Modelo de Planilha
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
