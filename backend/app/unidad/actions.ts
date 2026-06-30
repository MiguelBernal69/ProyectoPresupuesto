"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { crearDetallePresupuesto } from "@/lib/services/presupuesto";

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
