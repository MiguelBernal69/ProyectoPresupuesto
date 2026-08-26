import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { descifrarCookies } from "../sesion/route";
import { cargarItemAlSistema } from "@/lib/automation/pre2027";
import {
  actualizarEstadoRegistro,
  marcarComoCargando,
  yaFueCargadoExitosamente,
} from "@/lib/services/carga-oficial";
import { bankersRound } from "@/lib/utils/math";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("DEPARTAMENTO");

    // Verificar sesión externa
    const sesion = await prisma.sesionCargaExterna.findUnique({
      where: { usuarioId: user.id },
    });

    if (!sesion || sesion.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "No hay sesión activa. Por favor inicie sesión." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { registroId, forzar } = body as {
      registroId?: number;
      forzar?: boolean;
    };

    if (!registroId) {
      return NextResponse.json(
        { ok: false, error: "ID de registro requerido." },
        { status: 400 }
      );
    }

    // Obtener el registro
    const registro = await prisma.registroCarga.findUnique({
      where: { id: registroId },
    });

    if (!registro || registro.departamentoId !== user.departamentoId) {
      return NextResponse.json(
        { ok: false, error: "Registro no encontrado." },
        { status: 404 }
      );
    }

    // Prevención de duplicados
    if (!forzar) {
      if (registro.estado === "EXITOSO") {
        return NextResponse.json({
          ok: true,
          estado: "EXITOSO",
          mensaje: "Registro ya estaba cargado.",
        });
      }

      const yaCargado = await yaFueCargadoExitosamente(
        registro.departamentoId,
        registro.gestionId,
        registro.itemCodigo
      );

      if (yaCargado) {
        await actualizarEstadoRegistro(registro.id, "OMITIDO", {
          mensajeError: "Omitido por prevención de duplicado.",
        });
        return NextResponse.json({
          ok: true,
          estado: "OMITIDO",
          mensaje: "Registro omitido (ya existe otro exitoso).",
        });
      }
    }

    // Marcar como cargando
    const intento = registro.intento + 1;
    await marcarComoCargando(registro.id, intento);

    // Aplicar redondeo del banquero (Banker's Rounding) según requerimiento del sistema externo
    const cantidadRedondeada = bankersRound(registro.cantidad.toNumber());
    const precioRedondeado = bankersRound(registro.precioUnitario.toNumber());
    const subtotalCalculado = cantidadRedondeada * precioRedondeado;

    // Cargar en sistema externo
    const cookies = descifrarCookies(sesion.cookiescifradas);
    const resultado = await cargarItemAlSistema(cookies, {
      objetoCodigo: registro.objetoCodigo,
      itemCodigo: registro.itemCodigo,
      cantidad: cantidadRedondeada.toString(),
      precioUnitario: precioRedondeado.toString(),
      subtotal: subtotalCalculado.toString(),
    });

    if (resultado.ok) {
      await actualizarEstadoRegistro(registro.id, "EXITOSO", {
        idExterno: resultado.idExterno,
      });
      return NextResponse.json({ ok: true, estado: "EXITOSO" });
    } else {
      await actualizarEstadoRegistro(registro.id, "ERROR", {
        mensajeError: resultado.error,
      });

      if (resultado.requiereIntervencion) {
        return NextResponse.json(
          {
            ok: false,
            estado: "ERROR",
            error: resultado.error,
            requiereIntervencion: true,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        ok: false,
        estado: "ERROR",
        error: resultado.error,
      });
    }
  } catch (err) {
    console.error("[cargar-item] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Error interno procesando la carga." },
      { status: 500 }
    );
  }
}
