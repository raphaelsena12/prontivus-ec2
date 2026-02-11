"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";

interface AvatarWithS3Props {
  avatar: string | null | undefined;
  alt: string;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
}

export function AvatarWithS3({
  avatar,
  alt,
  fallback,
  className,
  fallbackClassName,
}: AvatarWithS3Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAvatar = async () => {
      setLoading(true);
      if (!avatar) {
        setAvatarUrl(undefined);
        setLoading(false);
        return;
      }

      // Se for uma key do S3, buscar URL assinada
      if (avatar.startsWith("usuarios/")) {
        try {
          const url = await getAvatarUrl(avatar);
          if (url) {
            setAvatarUrl(url);
          } else {
            console.warn("Não foi possível obter URL do avatar:", avatar);
            setAvatarUrl(undefined);
          }
        } catch (error) {
          console.error("Erro ao carregar avatar:", error);
          setAvatarUrl(undefined);
        }
      } else {
        // Se for base64 ou URL direta, usar diretamente
        setAvatarUrl(avatar);
      }
      setLoading(false);
    };

    loadAvatar();
  }, [avatar]);

  return (
    <Avatar className={className}>
      {avatarUrl && !loading ? (
        <AvatarImage 
          src={avatarUrl} 
          alt={alt} 
          className="object-cover"
          onError={(e) => {
            console.error("Erro ao carregar imagem do avatar:", avatarUrl);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
          onLoad={() => {
            console.log("Avatar carregado com sucesso:", avatarUrl);
          }}
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
    </Avatar>
  );
}
