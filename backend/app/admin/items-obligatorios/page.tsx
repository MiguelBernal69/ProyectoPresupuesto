import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import ItemsSelector from "./ItemsSelector";

export const dynamic = "force-dynamic";

export default async function ItemsObligatoriosPage() {
  await requireRole("ADMIN");

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  const [items, obligatorios] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
      include: { objeto: true },
    }),
    gestionActiva
      ? prisma.itemObligatorio.findMany({
          where: { gestionId: gestionActiva.id },
          select: { itemCodigo: true },
        })
      : [],
  ]);

  const obligatorioCodigos = obligatorios.map((item) => item.itemCodigo);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold">Ítems obligatorios</h1>
            <p className="text-sm text-slate-500">
              {gestionActiva ? `Gestión ${gestionActiva.anio}` : "Sin gestión abierta"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/admin"
            >
              Volver
            </Link>
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Marca los ítems que todas las unidades deben registrar obligatoriamente para la gestión
            activa. Usa el buscador para encontrar ítems rápidamente.
          </p>

          {gestionActiva ? (
            <ItemsSelector
              items={items}
              obligatorioCodigos={obligatorioCodigos}
              gestionId={gestionActiva.id}
            />
          ) : (
            <p className="mt-5 text-center text-sm text-slate-400">
              No hay ninguna gestión abierta. Abre una gestión para poder configurar ítems
              obligatorios.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
