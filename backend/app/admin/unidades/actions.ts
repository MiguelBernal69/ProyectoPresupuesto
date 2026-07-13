"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  actualizarTopeUnidad,
  crearUnidadConUsuario,
  editarUnidadYUsuario,
  toggleActivaUnidad,
} from "@/lib/services/unidades";

export async function crearUnidadAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await crearUnidadConUsuario({
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
      gestionId: Number(formData.get("gestionId") ?? 0),
      montoTope: String(formData.get("montoTope") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/admin/unidades?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/unidades");
  redirect("/admin/unidades?created=1");
}

export async function actualizarTopeAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await actualizarTopeUnidad({
      unidadId: Number(formData.get("unidadId") ?? 0),
      gestionId: Number(formData.get("gestionId") ?? 0),
      montoTope: String(formData.get("montoTope") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/admin/unidades?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/unidades");
  redirect("/admin/unidades?updated=1");
}

export async function editarUnidadAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await editarUnidadYUsuario({
      unidadId: Number(formData.get("unidadId") ?? 0),
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: formData.get("password") ? String(formData.get("password")) : undefined,
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/admin/unidades?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/unidades");
  redirect("/admin/unidades?updated=1");
}

export async function toggleActivaUnidadAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await toggleActivaUnidad(Number(formData.get("unidadId") ?? 0));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";

    redirect(`/admin/unidades?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/unidades");
  redirect("/admin/unidades?updated=1");
}
