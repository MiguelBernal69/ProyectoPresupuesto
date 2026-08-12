"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  crearUnidadConUsuario,
  actualizarTopeUnidad,
  editarUnidadYUsuario,
  toggleActivaUnidad,
} from "@/lib/services/unidades";
import prisma from "@/lib/db";

async function getDeptGestion(user: { departamentoId: number | null }) {
  if (!user.departamentoId) throw new Error("Sin departamento asignado.");
  const gestion = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });
  if (!gestion) throw new Error("No hay gestión abierta.");
  return { departamentoId: user.departamentoId, gestion };
}

export async function crearUnidadDepartamentoAction(formData: FormData) {
  const user = await requireRole("DEPARTAMENTO");

  try {
    const { departamentoId, gestion } = await getDeptGestion(user);

    const unidadResult = await crearUnidadConUsuario({
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
      gestionId: gestion.id,
      montoTope: String(formData.get("montoTope") ?? ""),
    });

    // Asignar automáticamente al departamento
    await prisma.unidad.update({
      where: { id: unidadResult.unidad.id },
      data: { departamentoId },
    });
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/departamento/unidades?error=${message}`);
  }

  revalidatePath("/departamento");
  revalidatePath("/departamento/unidades");
  redirect("/departamento/unidades?created=1");
}

export async function editarUnidadDepartamentoAction(formData: FormData) {
  const user = await requireRole("DEPARTAMENTO");

  const unidadId = Number(formData.get("unidadId") ?? 0);

  try {
    // Verify the unit belongs to this department
    const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } });
    if (!unidad || unidad.departamentoId !== user.departamentoId) {
      throw new Error("No tienes permiso para editar esta unidad.");
    }

    await editarUnidadYUsuario({
      unidadId,
      nombre: String(formData.get("nombre") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: formData.get("password") ? String(formData.get("password")) : undefined,
      nombreUsuario: String(formData.get("nombreUsuario") ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/departamento/unidades?error=${message}`);
  }

  revalidatePath("/departamento");
  revalidatePath("/departamento/unidades");
  redirect("/departamento/unidades?updated=1");
}

export async function actualizarTopeDepartamentoAction(formData: FormData) {
  const user = await requireRole("DEPARTAMENTO");

  const unidadId = Number(formData.get("unidadId") ?? 0);
  const gestionId = Number(formData.get("gestionId") ?? 0);

  try {
    const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } });
    if (!unidad || unidad.departamentoId !== user.departamentoId) {
      throw new Error("No tienes permiso para editar esta unidad.");
    }

    await actualizarTopeUnidad({
      unidadId,
      gestionId,
      montoTope: String(formData.get("montoTope") ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/departamento/unidades?error=${message}`);
  }

  revalidatePath("/departamento");
  revalidatePath("/departamento/unidades");
  redirect("/departamento/unidades?updated=1");
}

export async function toggleActivaUnidadDepartamentoAction(formData: FormData) {
  const user = await requireRole("DEPARTAMENTO");

  const unidadId = Number(formData.get("unidadId") ?? 0);

  try {
    const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } });
    if (!unidad || unidad.departamentoId !== user.departamentoId) {
      throw new Error("No tienes permiso para modificar esta unidad.");
    }
    await toggleActivaUnidad(unidadId);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "error";
    redirect(`/departamento/unidades?error=${message}`);
  }

  revalidatePath("/departamento");
  revalidatePath("/departamento/unidades");
  redirect("/departamento/unidades?updated=1");
}
