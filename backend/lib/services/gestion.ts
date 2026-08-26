import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { Gestion } from "@prisma/client";

/**
 * Retorna la gestión (año) seleccionada por el usuario a través de la cookie,
 * o la gestión ABIERTA actual por defecto.
 */
export async function getGestionContexto(): Promise<Gestion | null> {
  const cookieStore = await cookies();
  const seleccion = cookieStore.get("gestion_seleccionada")?.value;

  if (seleccion) {
    const anio = parseInt(seleccion);
    if (!isNaN(anio)) {
      const gestion = await prisma.gestion.findUnique({
        where: { anio },
      });
      if (gestion) return gestion;
    }
  }

  // Fallback: Retorna la gestión abierta
  return prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });
}
