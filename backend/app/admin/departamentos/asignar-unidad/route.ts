"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import prisma from "@/lib/db";

export async function asignarUnidadAction(formData: FormData) {
  await requireRole("ADMIN");

  const departamentoId = Number(formData.get("departamentoId") ?? 0);
  const unidadId = Number(formData.get("unidadId") ?? 0);
  const accion = String(formData.get("accion") ?? "asignar");

  try {
    if (accion === "asignar") {
      await prisma.unidad.update({
        where: { id: unidadId },
        data: { departamentoId },
      });
    } else {
      // Solo quitar si pertenece a este departamento
      await prisma.unidad.updateMany({
        where: { id: unidadId, departamentoId },
        data: { departamentoId: null },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/admin/departamentos?error=${message}`);
  }

  revalidatePath("/admin/departamentos");
  redirect("/admin/departamentos?updated=1");
}
