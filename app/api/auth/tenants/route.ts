import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { getUserTenants } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const tenants = await getUserTenants();
    
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("Erro ao buscar tenants:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tenants" },
      { status: 500 }
    );
  }
}
