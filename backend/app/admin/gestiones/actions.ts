"use server";

import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function abrirNuevaGestionAction(formData: FormData) {
  await requireRole("ADMIN");

  const anioStr = formData.get("anio") as string;
  const anio = parseInt(anioStr);
  const clonarItems = formData.get("clonar_items") === "on";

  if (!anio || isNaN(anio) || anio < 2020 || anio > 2100) {
    redirect("/admin/gestiones?error=anio-invalido");
  }

  // Verificar que no exista ya
  const existe = await prisma.gestion.findUnique({ where: { anio } });
  if (existe) {
    redirect("/admin/gestiones?error=ya-existe");
  }

  // Obtener la gestión actualmente ABIERTA antes de cerrarla (para clonar sus ítems)
  const gestionAnterior = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  // Cerrar todas las gestiones abiertas
  await prisma.gestion.updateMany({
    where: { estado: "ABIERTA" },
    data: { estado: "CERRADA", fechaCierre: new Date() },
  });

  // Crear la nueva gestión abierta
  const nuevaGestion = await prisma.gestion.create({
    data: { anio, estado: "ABIERTA" },
  });

  // Si el admin eligió clonar y hay una gestión anterior, copiar ítems y obligatorios
  if (clonarItems && gestionAnterior) {
    // 1. Obtener todos los ítems de presupuesto de la gestión anterior
    const detallesAnteriores = await prisma.detallePresupuesto.findMany({
      where: { gestionId: gestionAnterior.id },
      select: { unidadId: true, itemCodigo: true },
    });

    // 2. Crear las entradas para la nueva gestión con cantidad=0 y precio=0
    if (detallesAnteriores.length > 0) {
      await prisma.detallePresupuesto.createMany({
        data: detallesAnteriores.map((d) => ({
          unidadId: d.unidadId,
          gestionId: nuevaGestion.id,
          itemCodigo: d.itemCodigo,
          cantidad: 0,
          precioUnitario: 0,
          subtotal: 0,
        })),
        skipDuplicates: true,
      });
    }

    // 3. Clonar también los ítems obligatorios de la gestión anterior
    const obligatoriosAnteriores = await prisma.itemObligatorio.findMany({
      where: { gestionId: gestionAnterior.id },
      select: { unidadId: true, itemCodigo: true },
    });

    if (obligatoriosAnteriores.length > 0) {
      await prisma.itemObligatorio.createMany({
        data: obligatoriosAnteriores.map((o) => ({
          unidadId: o.unidadId,
          gestionId: nuevaGestion.id,
          itemCodigo: o.itemCodigo,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Actualizar la cookie para que todos vean la nueva gestión automáticamente
  const cookieStore = await cookies();
  cookieStore.set("gestion_seleccionada", String(anio), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/admin/gestiones?created=1");
}


export async function cerrarGestionAction(gestionId: number) {
  await requireRole("ADMIN");

  await prisma.gestion.update({
    where: { id: gestionId },
    data: { estado: "CERRADA", fechaCierre: new Date() },
  });

  redirect("/admin/gestiones?closed=1");
}

export async function reabrirGestionAction(gestionId: number) {
  await requireRole("ADMIN");

  // Obtener el año de la gestión a reabrir
  const gestion = await prisma.gestion.findUnique({
    where: { id: gestionId },
    select: { anio: true },
  });

  // Cerrar todas las abiertas primero
  await prisma.gestion.updateMany({
    where: { estado: "ABIERTA" },
    data: { estado: "CERRADA", fechaCierre: new Date() },
  });

  // Reabrir la seleccionada
  await prisma.gestion.update({
    where: { id: gestionId },
    data: { estado: "ABIERTA", fechaCierre: null },
  });

  // Actualizar la cookie para apuntar a la gestión reabierta
  if (gestion) {
    const cookieStore = await cookies();
    cookieStore.set("gestion_seleccionada", String(gestion.anio), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect("/admin/gestiones?reopened=1");
}
