"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  crearDetallePresupuesto,
  actualizarDetallePresupuesto,
  eliminarDetallePresupuesto,
} from "@/lib/services/presupuesto";
import { buscarItemsCatalogo } from "@/lib/services/catalogo";

export async function buscarItemsServerAction(query: string) {
  await requireRole("UNIDAD");
  return buscarItemsCatalogo(query);
}

export async function agregarDetalleAction(formData: FormData) {
  const user = await requireRole("UNIDAD");

  if (!user.unidadId) {
    redirect("/login");
  }

  try {
    await crearDetallePresupuesto({
      unidadId: user.unidadId,
      gestionId: Number(formData.get("gestionId") ?? 0),
      itemCodigo: String(formData.get("itemCodigo") ?? ""),
      cantidad: Number(formData.get("cantidad") ?? 0),
      precioUnitario: Number(formData.get("precioUnitario") ?? 0),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/unidad?error=${message}`);
  }

  revalidatePath("/unidad");
  revalidatePath("/admin");
  redirect("/unidad?created=1");
}

export async function editarDetalleAction(formData: FormData) {
  const user = await requireRole("UNIDAD");

  if (!user.unidadId) {
    redirect("/login");
  }

  const id = Number(formData.get("detalleId") ?? 0);

  try {
    await actualizarDetallePresupuesto({
      id,
      unidadId: user.unidadId,
      cantidad: Number(formData.get("cantidad") ?? 0),
      precioUnitario: Number(formData.get("precioUnitario") ?? 0),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/unidad?error=${message}`);
  }

  revalidatePath("/unidad");
  revalidatePath("/admin");
  redirect("/unidad?updated=1");
}

export async function eliminarDetalleAction(formData: FormData) {
  const user = await requireRole("UNIDAD");

  if (!user.unidadId) {
    redirect("/login");
  }

  const id = Number(formData.get("detalleId") ?? 0);

  try {
    await eliminarDetallePresupuesto(id, user.unidadId);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/unidad?error=${message}`);
  }

  revalidatePath("/unidad");
  revalidatePath("/admin");
  redirect("/unidad?deleted=1");
}
