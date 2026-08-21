import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { descifrarCookies } from "../sesion/route";
import { verificarSesion } from "@/lib/automation/pre2027";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("DEPARTAMENTO");

    const sesion = await prisma.sesionCargaExterna.findUnique({
      where: { usuarioId: user.id },
    });

    if (!sesion || sesion.expiresAt < new Date()) {
      return NextResponse.json({ activa: false });
    }

    const cookies = descifrarCookies(sesion.cookiescifradas);
    const activa = await verificarSesion(cookies);

    if (!activa) {
      // Limpiar sesión caducada
      await prisma.sesionCargaExterna.delete({
        where: { usuarioId: user.id },
      });
    }

    return NextResponse.json({ activa });
  } catch (err) {
    console.error("[estado] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ activa: false }, { status: 500 });
  }
}
