"use server";

import { cookies } from "next/headers";

export async function setGestionSeleccionadaAction(anio: string) {
  const cookieStore = await cookies();
  cookieStore.set("gestion_seleccionada", anio, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
