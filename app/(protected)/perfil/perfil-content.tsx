"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarWithS3 } from "@/components/avatar-with-s3";
import { ReportHeaderPreview } from "@/components/report-header-preview";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { formatCPF } from "@/lib/utils";
import { Loader2, Camera, Lock, Upload, ZoomIn, UserCircle, Eye as EyeIcon, Trash2, FileText, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFieldArray } from "react-hook-form";
// UX: usamos `datalist` (busca nativa) para seleção com filtro sem adicionar dependências novas
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  crm: string | null;
  telefone: string | null;
  avatar: string | null;
  tipo: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface Categoria {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface RelacaoEspecialidadeCategoria {
  especialidadeId: string;
  categoriaId: string;
}

interface DocumentoUpload {
  file: File;
  tipoDocumento: string;
  preview?: string;
}

interface DocumentoExistente {
  id: string;
  nomeDocumento: string;
  tipoDocumento: string;
  mimeType: string;
  tamanho: number;
  createdAt: string;
  s3Key: string;
}

// Validação de telefone brasileiro
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  }
  return value;
};

const updatePerfilSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z
    .string()
    .refine((val) => val.replace(/\D/g, "").length === 11, "CPF deve conter 11 dígitos"),
  crm: z.string().optional(),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(formatPhone(val)),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
});

const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
  novaSenha: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmarSenha: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type PerfilFormValues = z.infer<typeof updatePerfilSchema>;
type PasswordFormValues = z.infer<typeof changePasswordSchema>;

export function PerfilContent() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [certInfo, setCertInfo] = useState<{
    configured: boolean;
    certificado: null | {
      validTo: string | null;
      subject: string | null;
      issuer: string | null;
      serialNumber: string | null;
      createdAt: string;
      updatedAt: string;
    };
  } | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState("");
  const [certUploading, setCertUploading] = useState(false);
  const [certDeleting, setCertDeleting] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarImageSize, setAvatarImageSize] = useState({ width: 1, height: 1 });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingAvatarMimeType, setPendingAvatarMimeType] = useState("image/jpeg");
  const [pendingAvatarExtension, setPendingAvatarExtension] = useState("jpg");
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const avatarDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const AVATAR_PREVIEW_SIZE = 288;
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(null);
  const [medicoEspecialidadesLoading, setMedicoEspecialidadesLoading] = useState(false);
  const [especialidadesCatalogo, setEspecialidadesCatalogo] = useState<Especialidade[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<Categoria[]>([]);
  const [relacoesCatalogo, setRelacoesCatalogo] = useState<RelacaoEspecialidadeCategoria[]>([]);

  const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
  const [documentosExistentes, setDocumentosExistentes] = useState<DocumentoExistente[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const getAvatarDragBounds = (zoom = avatarZoom) => {
    const baseScale = Math.max(
      AVATAR_PREVIEW_SIZE / avatarImageSize.width,
      AVATAR_PREVIEW_SIZE / avatarImageSize.height
    );
    const displayedWidth = avatarImageSize.width * baseScale * zoom;
    const displayedHeight = avatarImageSize.height * baseScale * zoom;
    return {
      displayedWidth,
      displayedHeight,
      maxOffsetX: Math.max(0, (displayedWidth - AVATAR_PREVIEW_SIZE) / 2),
      maxOffsetY: Math.max(0, (displayedHeight - AVATAR_PREVIEW_SIZE) / 2),
    };
  };
  const clampAvatarOffset = (x: number, y: number, zoom = avatarZoom) => {
    const { maxOffsetX, maxOffsetY } = getAvatarDragBounds(zoom);
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  };
  const attachCameraStream = (stream: MediaStream | null) => {
    const video = cameraVideoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.play().catch(() => {
      // Alguns navegadores podem bloquear temporariamente; o usuário já interagiu.
    });
  };

  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(updatePerfilSchema),
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const medicoEspecialidadesForm = useForm<any>({
    defaultValues: {
      especialidades: [{ especialidadeId: "", categoriaId: null, rqe: "" }],
    },
  });

  const { fields: meFields, append: meAppend, remove: meRemove } = useFieldArray({
    control: medicoEspecialidadesForm.control,
    name: "especialidades",
  });

  const categoriasPorEspecialidade = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of relacoesCatalogo) {
      if (!map.has(r.especialidadeId)) map.set(r.especialidadeId, new Set());
      map.get(r.especialidadeId)!.add(r.categoriaId);
    }
    return map;
  }, [relacoesCatalogo]);

  const especialidadeDisplayToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of especialidadesCatalogo) {
      map.set(`${e.codigo} — ${e.nome}`.trim(), e.id);
    }
    return map;
  }, [especialidadesCatalogo]);

  const categoriaDisplayToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriasCatalogo) {
      map.set(`${c.codigo} — ${c.nome}`.trim(), c.id);
    }
    return map;
  }, [categoriasCatalogo]);

  useEffect(() => {
    loadPerfil();
  }, []);

  useEffect(() => {
    attachCameraStream(cameraStream);
  }, [cameraStream, cameraDialogOpen]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [cameraStream, avatarPreviewUrl]);

  // Resolver URL do avatar para o preview do cabeçalho (admin-clínica)
  useEffect(() => {
    if (usuario?.tipo !== "ADMIN_CLINICA" || !usuario.avatar) {
      setResolvedAvatarUrl(null);
      return;
    }
    getAvatarUrl(usuario.avatar).then((url) => setResolvedAvatarUrl(url ?? null));
  }, [usuario?.avatar, usuario?.tipo]);

  const loadCertificado = async () => {
    setCertLoading(true);
    try {
      const res = await fetch("/api/medico/certificado");
      if (!res.ok) {
        // Se não for médico ou não existir rota para o usuário, apenas não exibe erro global
        setCertInfo(null);
        return;
      }
      const data = await res.json();
      setCertInfo(data);
    } catch (e) {
      console.error("Erro ao carregar certificado:", e);
      setCertInfo(null);
    } finally {
      setCertLoading(false);
    }
  };

  const loadPerfil = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/perfil");
      if (!response.ok) {
        throw new Error("Erro ao carregar perfil");
      }
      const data = await response.json();
      setUsuario(data.usuario);
      perfilForm.reset({
        nome: data.usuario.nome,
        email: data.usuario.email,
        cpf: formatCPF(data.usuario.cpf),
        crm: data.usuario.crm || "",
        telefone: data.usuario.telefone
          ? formatPhone(data.usuario.telefone)
          : "",
      });

      if (data.usuario?.tipo === "MEDICO") {
        loadCertificado();
        await Promise.all([loadMedicoEspecialidades(), loadCatalogos(), loadDocumentosMedico()]);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogos = async () => {
    try {
      const [resEsp, resCat, resRel] = await Promise.all([
        fetch("/api/admin-clinica/especialidades?ativo=true"),
        fetch("/api/admin-clinica/especialidades-categorias?ativo=true"),
        fetch("/api/admin-clinica/especialidades-categorias-itens?limit=5000"),
      ]);
      if (resEsp.ok) {
        const data = await resEsp.json();
        setEspecialidadesCatalogo(data.especialidades || []);
      }
      if (resCat.ok) {
        const data = await resCat.json();
        setCategoriasCatalogo(data.categorias || []);
      }
      if (resRel.ok) {
        const data = await resRel.json();
        setRelacoesCatalogo((data.itens || []).map((it: any) => ({ especialidadeId: it.especialidadeId, categoriaId: it.categoriaId })));
      }
    } catch (e) {
      console.error("Erro ao carregar catálogos:", e);
    }
  };

  const loadMedicoEspecialidades = async () => {
    setMedicoEspecialidadesLoading(true);
    try {
      const res = await fetch("/api/medico/perfil/especialidades");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.medicoEspecialidades || []).map((me: any) => ({
        especialidadeId: me.especialidade.id,
        categoriaId: me.categoria?.id ?? null,
        rqe: me.rqe || "",
      }));
      medicoEspecialidadesForm.reset({
        especialidades: list.length ? list : [{ especialidadeId: "", categoriaId: null, rqe: "" }],
      });
    } catch (e) {
      console.error("Erro ao carregar especialidades do médico:", e);
    } finally {
      setMedicoEspecialidadesLoading(false);
    }
  };

  const handleSaveMedicoEspecialidades = async (values: any) => {
    try {
      setMedicoEspecialidadesLoading(true);
      const payload = {
        especialidades: (values.especialidades || []).map((it: any) => ({
          especialidadeId: it.especialidadeId,
          categoriaId: it.categoriaId || null,
          rqe: String(it.rqe || "").trim(),
        })),
      };
      const res = await fetch("/api/medico/perfil/especialidades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar especialidades");
      toast.success("Especialidades atualizadas!");
      await loadMedicoEspecialidades();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar especialidades");
    } finally {
      setMedicoEspecialidadesLoading(false);
    }
  };

  const handleFileChangeDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newDocs: DocumentoUpload[] = files.map((file) => {
      const tipoDocumento = file.name.toLowerCase().includes("certificado")
        ? "certificado"
        : file.name.toLowerCase().includes("diploma")
        ? "diploma"
        : "registro-profissional";
      let preview: string | undefined;
      if (file.type.startsWith("image/")) preview = URL.createObjectURL(file);
      return { file, tipoDocumento, preview };
    });
    setDocumentos((prev) => [...prev, ...newDocs]);
  };

  const removeDocumento = (index: number) => {
    const doc = documentos[index];
    if (doc.preview) URL.revokeObjectURL(doc.preview);
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const loadDocumentosMedico = async () => {
    setLoadingDocumentos(true);
    try {
      const res = await fetch("/api/medico/medico-documentos");
      if (!res.ok) return;
      const data = await res.json();
      setDocumentosExistentes(data.documentos || []);
    } catch (e) {
      console.error("Erro ao carregar documentos do médico:", e);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  const uploadDocumentosMedico = async () => {
    if (documentos.length === 0) return;
    setUploadingDocs(true);
    try {
      for (const doc of documentos) {
        const formData = new FormData();
        formData.append("file", doc.file);
        formData.append("tipoDocumento", doc.tipoDocumento);
        const res = await fetch("/api/medico/medico-documentos", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erro ao enviar documento");
      }
      toast.success("Documentos enviados!");
      setDocumentos([]);
      await loadDocumentosMedico();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar documentos");
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleViewDocumentoMedico = async (doc: DocumentoExistente) => {
    setLoadingUrl(doc.id);
    try {
      const res = await fetch(`/api/medico/medico-documentos/${doc.id}/url`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao buscar URL");
      if (data.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao visualizar documento");
    } finally {
      setLoadingUrl(null);
    }
  };

  const handleDeleteDocumentoMedico = async (docId: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    setDeletingDoc(docId);
    try {
      const res = await fetch(`/api/medico/medico-documentos/${docId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao excluir documento");
      toast.success("Documento excluído!");
      await loadDocumentosMedico();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir documento");
    } finally {
      setDeletingDoc(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUpdatePerfil = async (data: PerfilFormValues) => {
    setIsSubmitting(true);
    try {
      const telefoneLimpo = data.telefone?.replace(/\D/g, "") || null;
      const cpfLimpo = data.cpf.replace(/\D/g, "");
      const crmLimpo = data.crm?.trim() || "";

      if (usuario?.tipo === "MEDICO" && !crmLimpo) {
        perfilForm.setError("crm", { message: "CRM é obrigatório para médicos" });
        return;
      }

      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          email: data.email,
          cpf: cpfLimpo,
          crm: crmLimpo || undefined,
          telefone: telefoneLimpo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar perfil");
      }

      const result = await response.json();
      setUsuario(result.usuario);
      
      // Atualizar sessão
      await update({
        ...session,
        user: {
          ...session?.user,
          nome: result.usuario.nome,
          email: result.usuario.email,
        },
      });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar perfil"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/perfil/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senhaAtual: data.senhaAtual,
          novaSenha: data.novaSenha,
          confirmarSenha: data.confirmarSenha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao alterar senha");
      }

      passwordForm.reset();
      setPasswordModalOpen(false);
      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar senha"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/perfil/avatar", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao atualizar avatar");
    }

    const result = await response.json();
    setUsuario(result.usuario);

    await update({
      ...session,
      user: {
        ...session?.user,
        avatar: result.usuario.avatar,
      },
    });
  };

  const openAvatarEditorWithFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setAvatarImageSize({
        width: Math.max(1, img.naturalWidth || img.width || 1),
        height: Math.max(1, img.naturalHeight || img.height || 1),
      });
      setPendingAvatarExtension(extension);
      setPendingAvatarMimeType(file.type || "image/jpeg");
      setAvatarPreviewUrl(objectUrl);
      setAvatarZoom(1);
      setAvatarOffset({ x: 0, y: 0 });
      setAvatarEditorOpen(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Não foi possível carregar esta imagem");
    };
    img.src = objectUrl;
  };

  const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    openAvatarEditorWithFile(file);
    event.target.value = "";
  };

  const startCameraCapture = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setCameraReady(false);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch {
        // Fallback para navegadores/dispositivos que não respeitam facingMode.
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      setCameraStream(stream);
      setCameraDialogOpen(true);
      // Garante binding mesmo se o vídeo montar um pouco depois.
      setTimeout(() => attachCameraStream(stream), 50);
      setTimeout(() => attachCameraStream(stream), 250);
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      toast.error("Não foi possível acessar a câmera");
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraCapture = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraReady(false);
    setCameraDialogOpen(false);
  };

  const handleTakePhotoNow = async () => {
    const video = cameraVideoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Câmera ainda não está pronta");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Erro ao capturar imagem da câmera");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );
    if (!blob) {
      toast.error("Não foi possível capturar a foto");
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopCameraCapture();
    openAvatarEditorWithFile(file);
  };

  const createCroppedAvatarFile = async (): Promise<File> => {
    if (!avatarPreviewUrl) {
      throw new Error("Nenhuma imagem selecionada");
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = avatarPreviewUrl;
    });

    const outputSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Erro ao preparar imagem");
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const baseScale = Math.max(AVATAR_PREVIEW_SIZE / width, AVATAR_PREVIEW_SIZE / height);
    const displayScale = baseScale * Math.max(1, avatarZoom);
    const displayedWidth = width * displayScale;
    const displayedHeight = height * displayScale;
    const imageLeft = AVATAR_PREVIEW_SIZE / 2 - displayedWidth / 2 + avatarOffset.x;
    const imageTop = AVATAR_PREVIEW_SIZE / 2 - displayedHeight / 2 + avatarOffset.y;
    const sx = Math.max(
      0,
      Math.min(width, (0 - imageLeft) / displayScale)
    );
    const sy = Math.max(
      0,
      Math.min(height, (0 - imageTop) / displayScale)
    );
    const sourceSize = Math.min(width - sx, height - sy, AVATAR_PREVIEW_SIZE / displayScale);

    ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

    const mimeType = pendingAvatarMimeType.startsWith("image/")
      ? pendingAvatarMimeType
      : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, 0.95)
    );

    if (!blob) {
      throw new Error("Erro ao processar imagem");
    }

    return new File([blob], `avatar-${Date.now()}.${pendingAvatarExtension || "jpg"}`, {
      type: mimeType,
    });
  };

  const handleSaveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const file = await createCroppedAvatarFile();
      await uploadAvatarFile(file);
      toast.success("Foto atualizada com sucesso!");
      setAvatarEditorOpen(false);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl(null);
      setAvatarOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar avatar"
      );
    } finally {
      setUploadingAvatar(false);
    }
  };
  const handleAvatarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!avatarPreviewUrl) return;
    event.preventDefault();
    avatarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: avatarOffset.x,
      startOffsetY: avatarOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleAvatarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = avatarDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    setAvatarOffset(
      clampAvatarOffset(dragState.startOffsetX + dx, dragState.startOffsetY + dy)
    );
  };
  const handleAvatarPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (avatarDragRef.current?.pointerId !== event.pointerId) return;
    avatarDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleUploadCertificado = async () => {
    if (!certFile) {
      toast.error("Selecione um arquivo .pfx");
      return;
    }
    if (!certSenha) {
      toast.error("Informe a senha do certificado");
      return;
    }

    setCertUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", certFile);
      formData.append("senha", certSenha);

      const res = await fetch("/api/medico/certificado/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao enviar certificado");
      }

      toast.success("Certificado enviado com sucesso!");
      setCertFile(null);
      setCertSenha("");
      await loadCertificado();
    } catch (e: any) {
      console.error("Erro ao enviar certificado:", e);
      toast.error(e?.message || "Erro ao enviar certificado");
    } finally {
      setCertUploading(false);
    }
  };

  const handleDeleteCertificado = async () => {
    const confirmed = window.confirm("Remover o certificado digital deste usuário?");
    if (!confirmed) return;

    setCertDeleting(true);
    try {
      const res = await fetch("/api/medico/certificado", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover certificado");
      }
      toast.success("Certificado removido!");
      await loadCertificado();
    } catch (e: any) {
      console.error("Erro ao remover certificado:", e);
      toast.error(e?.message || "Erro ao remover certificado");
    } finally {
      setCertDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar perfil</p>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={UserCircle}
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais, senha e certificado digital"
      />

      <Tabs defaultValue="pessoal" className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pessoal">Informações pessoais</TabsTrigger>
            {usuario?.tipo === "MEDICO" && (
              <>
                <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="certificado">Certificado Digital</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="pessoal">
          <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Informações Pessoais</CardTitle>
                    <CardDescription className="text-xs">
                      Atualize sua foto e os dados de contato em um único painel
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPasswordModalOpen(true)}
                  >
                    <Lock className="mr-1 h-3.5 w-3.5" />
                    Alterar Senha
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="rounded-lg bg-muted/20 p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="relative">
                          <AvatarWithS3
                            avatar={usuario.avatar}
                            alt={usuario.nome}
                            fallback={getInitials(usuario.nome)}
                            className="h-32 w-32"
                            fallbackClassName="bg-gradient-to-br from-primary/20 to-primary/10 font-semibold text-2xl"
                          />
                          <div className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full">
                            <Camera className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          JPG, PNG ou WEBP. Maximo de 5MB.
                        </p>
                        <div className="mt-3 flex w-full flex-col gap-2">
                          <label htmlFor="avatar-upload-file" className="w-full">
                            <Button type="button" variant="outline" size="sm" className="h-8 w-full text-xs" asChild>
                              <span>
                                <Upload className="mr-1 h-3.5 w-3.5" />
                                Carregar foto
                              </span>
                            </Button>
                          </label>
                          <input
                            id="avatar-upload-file"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarFileSelected}
                            disabled={uploadingAvatar}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-full text-xs"
                            onClick={startCameraCapture}
                            disabled={uploadingAvatar || cameraLoading}
                          >
                            <Camera className="mr-1 h-3.5 w-3.5" />
                            Tirar foto
                          </Button>
                        </div>
                        {uploadingAvatar && (
                          <p className="text-xs text-primary mt-3 flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Enviando...
                          </p>
                        )}
                        {cameraError && (
                          <p className="text-xs text-destructive mt-2">{cameraError}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Form {...perfilForm}>
                        <form
                          onSubmit={perfilForm.handleSubmit(handleUpdatePerfil)}
                          className="space-y-4"
                        >
                          <FormField
                            control={perfilForm.control}
                            name="nome"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={perfilForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder="seu@email.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={perfilForm.control}
                              name="telefone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telefone</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="(00) 00000-0000"
                                      {...field}
                                      onChange={(e) => {
                                        const formatted = formatPhone(e.target.value);
                                        field.onChange(formatted);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {usuario?.tipo === "MEDICO" && (
                              <FormField
                                control={perfilForm.control}
                                name="crm"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      CRM <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ex: CRM-SP 123456"
                                        {...field}
                                        value={field.value || ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={perfilForm.control}
                              name="cpf"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CPF</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="000.000.000-00"
                                      {...field}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 11);
                                        field.onChange(formatCPF(cleaned));
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormItem>
                              <FormLabel>Tipo de Usuário</FormLabel>
                              <FormControl>
                                <Input
                                  value={usuario.tipo}
                                  disabled
                                  className="bg-muted"
                                />
                              </FormControl>
                            </FormItem>
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => router.back()}
                              disabled={isSubmitting}
                              className="text-xs"
                            >
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="text-xs">
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Salvar Alterações"
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </div>
                </CardContent>
          </Card>

          {usuario?.tipo === "ADMIN_CLINICA" && (
            <Card className="mt-4">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xl">Preview nos Relatórios</CardTitle>
                <CardDescription className="text-xs">
                  Veja como sua foto de perfil aparecerá como logo nos documentos e relatórios gerados
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <ReportHeaderPreview avatarUrl={resolvedAvatarUrl} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {usuario?.tipo === "MEDICO" && (
          <TabsContent value="certificado">
            <Card>
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-xl">Certificado Digital (.pfx)</CardTitle>
                  <CardDescription className="text-xs">
                    Envie seu certificado para assinar digitalmente os documentos gerados no atendimento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                    {certLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Carregando status do certificado...
                      </div>
                    ) : certInfo?.configured ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-700">
                          <span className="font-medium">Status:</span>{" "}
                          <span className="text-emerald-700">Configurado</span>
                        </div>
                        {certInfo.certificado?.validTo && (
                          <div className="text-xs text-slate-700">
                            <span className="font-medium">Validade:</span> {certInfo.certificado.validTo}
                          </div>
                        )}
                        {certInfo.certificado?.subject && (
                          <div className="text-xs text-slate-700 break-words">
                            <span className="font-medium">Titular:</span> {certInfo.certificado.subject}
                          </div>
                        )}
                        {certInfo.certificado?.issuer && (
                          <div className="text-xs text-slate-700 break-words">
                            <span className="font-medium">Emissor:</span> {certInfo.certificado.issuer}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteCertificado}
                            disabled={certDeleting}
                            className="text-xs"
                          >
                            {certDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Removendo...
                              </>
                            ) : (
                              "Remover certificado"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Nenhum certificado configurado.
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Arquivo .pfx
                        </label>
                          <Input
                            type="file"
                            accept=".pfx,.p12"
                            onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                            className="cursor-pointer text-xs"
                          />
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: .pfx / .p12
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Senha do certificado
                        </label>
                        <Input
                          type="password"
                          placeholder="Senha do .pfx"
                          value={certSenha}
                          onChange={(e) => setCertSenha(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleUploadCertificado}
                        disabled={certUploading || !certFile || !certSenha}
                        className="text-xs"
                      >
                        {certUploading ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar certificado"
                        )}
                      </Button>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        )}

        {usuario?.tipo === "MEDICO" && (
          <TabsContent value="especialidades">
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-xl">Especialidades</CardTitle>
              <CardDescription className="text-xs">
                Adicione quantas especialidades quiser. Para cada especialidade, informe a categoria (opcional) e o RQE (obrigatório).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {medicoEspecialidadesLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando...
                </div>
              )}
              <form
                onSubmit={medicoEspecialidadesForm.handleSubmit(handleSaveMedicoEspecialidades)}
                className="space-y-2"
              >
                <div className="hidden md:grid grid-cols-[1fr_1fr_220px_92px] gap-3 text-[11px] text-muted-foreground font-medium">
                  <div>Especialidade</div>
                  <div>Categoria (opcional)</div>
                  <div>RQE *</div>
                  <div className="text-right">Ações</div>
                </div>

                {meFields.map((f, idx) => {
                  const espId = medicoEspecialidadesForm.watch(`especialidades.${idx}.especialidadeId`);
                  const allowedCats = espId ? categoriasPorEspecialidade.get(espId) : undefined;
                  const cats = allowedCats
                    ? categoriasCatalogo.filter((c) => allowedCats.has(c.id))
                    : categoriasCatalogo;
                  const esp = espId ? especialidadesCatalogo.find((e) => e.id === espId) : null;
                  const especialidadeLabel = esp ? `${esp.codigo} — ${esp.nome}` : "";
                  const categoriaId = medicoEspecialidadesForm.watch(`especialidades.${idx}.categoriaId`);
                  const cat = categoriaId ? categoriasCatalogo.find((c) => c.id === categoriaId) : null;
                  const categoriaLabel = cat ? `${cat.codigo} — ${cat.nome}` : "";

                  return (
                    <div key={f.id} className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_220px_92px] gap-3 items-start">
                        <div>
                          <Input
                            list="especialidades-datalist"
                            placeholder="Especialidade (digite para buscar...)"
                            value={especialidadeLabel}
                            onChange={(e) => {
                              const label = e.target.value;
                              const id = especialidadeDisplayToId.get(label);
                              if (id) {
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.especialidadeId`, id);
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.categoriaId`, null);
                              } else {
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.especialidadeId`, "");
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.categoriaId`, null);
                              }
                            }}
                            disabled={medicoEspecialidadesLoading}
                          />
                        </div>

                        <div>
                          <Input
                            list={`categorias-datalist-${idx}`}
                            placeholder={espId ? "Categoria (opcional)" : "Selecione a especialidade"}
                            value={categoriaLabel}
                            onChange={(e) => {
                              const label = e.target.value;
                              if (!label) {
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.categoriaId`, null);
                                return;
                              }
                              const id = categoriaDisplayToId.get(label);
                              if (id) {
                                medicoEspecialidadesForm.setValue(`especialidades.${idx}.categoriaId`, id);
                              }
                            }}
                            disabled={medicoEspecialidadesLoading || !espId}
                          />
                          <datalist id={`categorias-datalist-${idx}`}>
                            {cats.map((c) => (
                              <option key={c.id} value={`${c.codigo} — ${c.nome}`} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <Input
                            value={medicoEspecialidadesForm.watch(`especialidades.${idx}.rqe`) || ""}
                            onChange={(e) => medicoEspecialidadesForm.setValue(`especialidades.${idx}.rqe`, e.target.value)}
                            placeholder="RQE (obrigatório)"
                            disabled={medicoEspecialidadesLoading}
                          />
                        </div>

                        <div className="flex justify-end md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => meRemove(idx)}
                          disabled={medicoEspecialidadesLoading || meFields.length === 1}
                          className="h-9 text-xs w-full md:w-auto"
                        >
                          Remover
                        </Button>
                        </div>
                      </div>

                      {idx !== meFields.length - 1 && <Separator className="mt-3" />}
                    </div>
                  );
                })}

                <datalist id="especialidades-datalist">
                  {especialidadesCatalogo.map((e) => (
                    <option key={e.id} value={`${e.codigo} — ${e.nome}`} />
                  ))}
                </datalist>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => meAppend({ especialidadeId: "", categoriaId: null, rqe: "" })}
                    disabled={medicoEspecialidadesLoading}
                    className="h-8 text-xs"
                  >
                    Adicionar especialidade
                  </Button>
                  <Button type="submit" disabled={medicoEspecialidadesLoading} className="h-8 text-xs">
                    {medicoEspecialidadesLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar especialidades"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {usuario?.tipo === "MEDICO" && (
          <TabsContent value="documentos">
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-xl">Documentos do Médico</CardTitle>
              <CardDescription className="text-xs">
                Anexe certificados, diplomas e registros profissionais (imagem ou PDF).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {loadingDocumentos ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando documentos...
                </div>
              ) : documentosExistentes.length > 0 ? (
                <div className="space-y-2">
                  {documentosExistentes.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {doc.mimeType.startsWith("image/") ? (
                          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nomeDocumento}</p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.tamanho / 1024).toFixed(2)} KB • {doc.tipoDocumento}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocumentoMedico(doc)}
                          disabled={loadingUrl === doc.id}
                        >
                          {loadingUrl === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocumentoMedico(doc.id)}
                          disabled={deletingDoc === doc.id}
                        >
                          {deletingDoc === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
              )}

              <Separator />

              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="medico-documentos"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChangeDocs}
                  disabled={uploadingDocs}
                  className="hidden"
                />
                <label htmlFor="medico-documentos" className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para anexar documentos (imagem ou PDF)
                  </span>
                </label>
              </div>

              {documentos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Arquivos selecionados:</p>
                  {documentos.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {doc.preview ? (
                          <img src={doc.preview} alt={doc.file.name} className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file.name}</p>
                          <p className="text-xs text-muted-foreground">{(doc.file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumento(index)} disabled={uploadingDocs}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button type="button" onClick={uploadDocumentosMedico} disabled={uploadingDocs} className="text-xs">
                      {uploadingDocs ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar documentos"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}
      </Tabs>

          <Dialog open={cameraDialogOpen} onOpenChange={(open) => !open && stopCameraCapture()}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Tirar foto</DialogTitle>
                <DialogDescription>
                  Posicione seu rosto e capture a imagem para continuar.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border bg-black/90">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-[300px] w-full object-cover"
                  onLoadedMetadata={() => setCameraReady(true)}
                  onCanPlay={() => setCameraReady(true)}
                  onPlaying={() => setCameraReady(true)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={stopCameraCapture}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleTakePhotoNow}>
                  Capturar foto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={passwordModalOpen}
            onOpenChange={(open) => {
              if (!isChangingPassword) {
                setPasswordModalOpen(open);
                if (!open) passwordForm.reset();
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Alterar Senha</DialogTitle>
                <DialogDescription>
                  Digite sua senha atual e escolha uma nova senha.
                </DialogDescription>
              </DialogHeader>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handleChangePassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="senhaAtual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Digite sua senha atual"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={passwordForm.control}
                    name="novaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmarSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Digite a nova senha novamente"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordModalOpen(false);
                        passwordForm.reset();
                      }}
                      disabled={isChangingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        "Alterar Senha"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={avatarEditorOpen}
            onOpenChange={(open) => {
              if (!uploadingAvatar) setAvatarEditorOpen(open);
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Ajustar foto de perfil</DialogTitle>
                <DialogDescription>
                  Ajuste o zoom e arraste a foto para enquadrar como preferir.
                </DialogDescription>
              </DialogHeader>
              {avatarPreviewUrl && (
                <div className="space-y-4">
                  {(() => {
                    const { displayedWidth, displayedHeight } = getAvatarDragBounds();
                    return (
                      <div
                        className="mx-auto relative h-72 w-72 overflow-hidden rounded-xl border bg-muted touch-none cursor-grab active:cursor-grabbing"
                        onPointerDown={handleAvatarPointerDown}
                        onPointerMove={handleAvatarPointerMove}
                        onPointerUp={handleAvatarPointerEnd}
                        onPointerCancel={handleAvatarPointerEnd}
                        onDragStart={(event) => event.preventDefault()}
                        style={{ touchAction: "none" }}
                      >
                        <div
                          className="absolute left-1/2 top-1/2"
                          style={{
                            width: displayedWidth,
                            height: displayedHeight,
                            transform: `translate3d(calc(-50% + ${avatarOffset.x}px), calc(-50% + ${avatarOffset.y}px), 0)`,
                          }}
                        >
                          <img
                            src={avatarPreviewUrl}
                            alt="Prévia da foto"
                            className="h-full w-full object-cover select-none pointer-events-none"
                            draggable={false}
                            onDragStart={(event) => event.preventDefault()}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ZoomIn className="h-3.5 w-3.5" />
                      Zoom: {avatarZoom.toFixed(1)}x
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={avatarZoom}
                      onChange={(e) => {
                        const nextZoom = Number(e.target.value);
                        setAvatarZoom(nextZoom);
                        setAvatarOffset((prev) => clampAvatarOffset(prev.x, prev.y, nextZoom));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAvatarEditorOpen(false)}
                  disabled={uploadingAvatar}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveAvatar} disabled={uploadingAvatar}>
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar foto"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </div>
  );
}

