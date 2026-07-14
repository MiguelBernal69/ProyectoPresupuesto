import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import ItemsSelector from "./ItemsSelector";

export const dynamic = "force-dynamic";

type ItemsObligatoriosPageProps = {
  searchParams?: Promise<{
    unidadId?: string;
    saved?: string;
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

  const [obligatorios, conteosObligatorios] = await Promise.all([
    gestionActiva && unidadSeleccionada
      ? prisma.itemObligatorio.findMany({
          where: {
            gestionId: gestionActiva.id,
            unidadId: unidadSeleccionada.id,
          },
          select: { itemCodigo: true },
        })
      : [],
    gestionActiva
      ? prisma.itemObligatorio.groupBy({
          by: ["unidadId"],
          where: { gestionId: gestionActiva.id },
          _count: { _all: true },
        })
      : [],
  ]);

  const obligatorioCodigos = obligatorios.map(
    (item: { itemCodigo: string }) => item.itemCodigo,
  );

  // Solo traemos la información detallada de los ítems seleccionados inicialmente
  const itemsIniciales = obligatorioCodigos.length > 0
    ? await prisma.item.findMany({
        where: { codigo: { in: obligatorioCodigos } },
        include: { objeto: true },
        orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
      })
    : [];
  const conteosPorUnidad = new Map(
    conteosObligatorios.map((conteo) => [conteo.unidadId, conteo._count._all]),
  );
  const guardadoCorrectamente = params?.saved === "1";

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
              {guardadoCorrectamente && (
                <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Items obligatorios guardados correctamente.
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {unidades.map((unidad) => {
                  const totalObligatorios = conteosPorUnidad.get(unidad.id) ?? 0;
                  const seleccionada = unidad.id === unidadSeleccionada.id;

                  return (
                    <Link
                      key={unidad.id}
                      href={`/admin/items-obligatorios?unidadId=${unidad.id}`}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                        seleccionada
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{unidad.nombre}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          seleccionada
                            ? "bg-white text-slate-950"
                            : totalObligatorios > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {totalObligatorios}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Configurando obligatorios para:{" "}
                <span className="font-semibold text-slate-900">
                  {unidadSeleccionada.nombre}
                </span>
              </div>

              <ItemsSelector
                key={`${gestionActiva.id}-${unidadSeleccionada.id}`}
                initialSelectedItems={itemsIniciales}
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
