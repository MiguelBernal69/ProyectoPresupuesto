import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import ItemsSelector from "./ItemsSelector";

export const dynamic = "force-dynamic";

type ItemsObligatoriosPageProps = {
  searchParams?: Promise<{
    unidadId?: string;
  }>;
};

export default async function ItemsObligatoriosPage({
  searchParams,
}: ItemsObligatoriosPageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  const unidades = await prisma.unidad.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
  });

  const unidadIdParam = Number(params?.unidadId ?? 0);
  const unidadSeleccionada =
    unidades.find((unidad) => unidad.id === unidadIdParam) ?? unidades[0] ?? null;

  const [items, obligatorios] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
      include: { objeto: true },
    }),
    gestionActiva && unidadSeleccionada
      ? prisma.itemObligatorio.findMany({
          where: {
            gestionId: gestionActiva.id,
            unidadId: unidadSeleccionada.id,
          },
          select: { itemCodigo: true },
        })
      : [],
  ]);

  const obligatorioCodigos = obligatorios.map(
    (item: { itemCodigo: string }) => item.itemCodigo,
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold">Items obligatorios</h1>
            <p className="text-sm text-slate-500">
              {gestionActiva ? `Gestion ${gestionActiva.anio}` : "Sin gestion abierta"}
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
            Elige un modulo y marca los items que solo ese modulo debe registrar
            obligatoriamente para la gestion activa.
          </p>

          {gestionActiva && unidadSeleccionada ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {unidades.map((unidad) => (
                  <Link
                    key={unidad.id}
                    href={`/admin/items-obligatorios?unidadId=${unidad.id}`}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      unidad.id === unidadSeleccionada.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {unidad.nombre}
                  </Link>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Configurando obligatorios para:{" "}
                <span className="font-semibold text-slate-900">
                  {unidadSeleccionada.nombre}
                </span>
              </div>

              <ItemsSelector
                items={items}
                obligatorioCodigos={obligatorioCodigos}
                gestionId={gestionActiva.id}
                unidadId={unidadSeleccionada.id}
              />
            </>
          ) : (
            <p className="mt-5 text-center text-sm text-slate-400">
              No hay gestion abierta o no existen unidades activas para configurar.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
