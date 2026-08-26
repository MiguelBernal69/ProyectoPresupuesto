"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setGestionSeleccionadaAction } from "@/app/actions/gestion-actions";

type GestionDropdownProps = {
  gestiones: { id: number; anio: number; estado: string }[];
  gestionActivaId: number | null;
};

export default function GestionDropdown({ gestiones, gestionActivaId }: GestionDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const anioSeleccionado = e.target.value;
    startTransition(async () => {
      await setGestionSeleccionadaAction(anioSeleccionado);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="gestion-selector" className="text-sm font-medium text-slate-600">
        Gestión:
      </label>
      <select
        id="gestion-selector"
        disabled={isPending}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        value={gestiones.find((g) => g.id === gestionActivaId)?.anio || ""}
        onChange={handleChange}
      >
        {gestiones.map((g) => (
          <option key={g.id} value={g.anio}>
            {g.anio} {g.estado === "CERRADA" ? "(Cerrada - Solo Lectura)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
