import prisma from "@/lib/db";
import { getGestionContexto } from "@/lib/services/gestion";
import GestionDropdown from "./GestionDropdown";

export default async function SelectorGestionWrapper() {
  const [gestiones, gestionActual] = await Promise.all([
    prisma.gestion.findMany({
      orderBy: { anio: "desc" },
      select: { id: true, anio: true, estado: true },
    }),
    getGestionContexto(),
  ]);

  if (gestiones.length === 0) return null;

  return <GestionDropdown gestiones={gestiones} gestionActivaId={gestionActual?.id || null} />;
}
