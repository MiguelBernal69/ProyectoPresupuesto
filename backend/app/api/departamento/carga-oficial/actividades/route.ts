import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { obtenerActividades } from "@/lib/automation/pre2027";

export async function GET(req: NextRequest) {
  try {
    await requireRole("DEPARTAMENTO");

    const searchParams = req.nextUrl.searchParams;
    const dirId = searchParams.get("dirId");

    if (!dirId) {
      return NextResponse.json(
        { ok: false, error: "Falta parámetro dirId" },
        { status: 400 }
      );
    }

    const actividades = await obtenerActividades(dirId);

    return NextResponse.json({ ok: true, actividades });
  } catch (err) {
    console.error("[actividades] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
