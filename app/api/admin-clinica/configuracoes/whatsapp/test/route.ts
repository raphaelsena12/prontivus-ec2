import { NextResponse } from "next/server";
import { checkClinicaAuth } from "@/lib/api-helpers";
import { getClinicaWhatsAppService } from "@/lib/whatsapp";

export async function POST() {
  const auth = await checkClinicaAuth();
  if (!auth.authorized) return auth.response!;

  const service = await getClinicaWhatsAppService(auth.clinicaId!);

  if (!service) {
    return NextResponse.json(
      { error: "WhatsApp não configurado. Salve as credenciais antes de testar." },
      { status: 400 }
    );
  }

  const ok = await service.verifyConfiguration();

  if (!ok) {
    return NextResponse.json(
      { error: "Credenciais inválidas ou sem permissão. Verifique o Phone Number ID e o Access Token." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
