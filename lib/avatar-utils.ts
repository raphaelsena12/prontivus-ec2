/**
 * Obtém a URL do avatar, gerando URL assinada se necessário
 * @param avatar - Pode ser uma key do S3 (usuarios/xxx) ou uma URL (base64 ou https)
 * @returns URL do avatar que pode ser usada diretamente em <img src>
 */
export async function getAvatarUrl(avatar: string | null | undefined): Promise<string | undefined> {
  if (!avatar) {
    return undefined;
  }

  // Se for uma key do S3 (formato: usuarios/xxx)
  if (avatar.startsWith("usuarios/")) {
    try {
      const response = await fetch(`/api/usuarios/avatar-url?key=${encodeURIComponent(avatar)}`);
      if (response.ok) {
        const data = await response.json();
        console.log("URL assinada obtida com sucesso:", data.url?.substring(0, 50) + "...");
        return data.url;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro ao obter URL assinada:", response.status, errorData);
        return undefined;
      }
    } catch (error) {
      console.error("Erro ao obter URL assinada do avatar:", error);
      return undefined;
    }
  }

  // Se for uma URL (base64 ou https), retorna diretamente
  return avatar;
}
