"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  crearDepartamento,
  editarDepartamento,
  toggleActivaDepartamento,
} from "@/lib/services/departamentos";

export async function crearDepartamentoAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await crearDepartamento({
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/admin/departamentos?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/departamentos");
  redirect("/admin/departamentos?created=1");
}

export async function editarDepartamentoAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await editarDepartamento({
      departamentoId: Number(formData.get("departamentoId") ?? 0),
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: formData.get("password") ? String(formData.get("password")) : undefined,
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/admin/departamentos?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/departamentos");
  redirect("/admin/departamentos?updated=1");
}

export async function toggleActivaDepartamentoAction(formData: FormData) {
  await requireRole("ADMIN");

  try {
    await toggleActivaDepartamento(Number(formData.get("departamentoId") ?? 0));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/admin/departamentos?error=${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/departamentos");
  redirect("/admin/departamentos?updated=1");
}

export async function asignarUnidadDepartamentoAction(formData: FormData) {
  await requireRole("ADMIN");

  const departamentoId = Number(formData.get("departamentoId") ?? 0);
  const unidadId = Number(formData.get("unidadId") ?? 0);
  const accion = String(formData.get("accion") ?? "asignar");

  try {
    const { default: prisma } = await import("@/lib/db");
    if (accion === "asignar") {
      await prisma.unidad.update({
        where: { id: unidadId },
        data: { departamentoId },
      });
    } else {
      await prisma.unidad.updateMany({
        where: { id: unidadId, departamentoId },
        data: { departamentoId: null },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/admin/departamentos?error=${message}`);
  }

  revalidatePath("/admin/departamentos");
  redirect("/admin/departamentos?updated=1");
}
