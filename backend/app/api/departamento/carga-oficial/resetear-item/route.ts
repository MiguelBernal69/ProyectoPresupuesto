import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import prisma from "@/lib/db";

// POST /api/departamento/carga-oficial/resetear-item
// Resetea un registro individual a PENDIENTE para reintento
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("DEPARTAMENTO");

    const body = await req.json();
    const { registroId } = body as { registroId?: number };

    if (!registroId) {
      return NextResponse.json(
        { ok: false, error: "ID de registro requerido." },
        { status: 400 }
      );
    }

    // Verificar que pertenece al departamento del usuario
    const registro = await prisma.registroCarga.findUnique({
      where: { id: registroId },
    });

    if (!registro || registro.departamentoId !== user.departamentoId) {
      return NextResponse.json(
        { ok: false, error: "Registro no encontrado." },
        { status: 404 }
      );
    }

    await prisma.registroCarga.update({
      where: { id: registroId },
      data: {
        estado: "PENDIENTE",
        mensajeError: null,
        idExterno: null,
        fechaCarga: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resetear-item] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
