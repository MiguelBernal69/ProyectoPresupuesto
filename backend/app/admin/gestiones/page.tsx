import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { abrirNuevaGestionAction, cerrarGestionAction, reabrirGestionAction } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    closed?: string;
    reopened?: string;
    error?: string;
  }>;
};

export default async function AdminGestionesPage({ searchParams }: PageProps) {
  const user = await requireRole("ADMIN");
  const params = await searchParams;

  const gestiones = await prisma.gestion.findMany({
    orderBy: { anio: "desc" },
    include: {
      _count: {
        select: {
          topes: true,
          registrosCarga: true,
          detallesPresupuesto: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-2xl font-semibold">Gestiones</h1>
          </div>
          <div className="flex gap-2">
            <Link
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 flex items-center justify-center"
              href="/admin"
            >
              Volver
            </Link>
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Administración de Gestiones (Años)</h2>
        </div>

        {params?.created && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Nueva gestión aperturada con éxito.
          </div>
        )}
        {params?.closed && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Gestión cerrada con éxito.
          </div>
        )}
        {params?.reopened && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Gestión reabierta con éxito.
          </div>
        )}
        {params?.error === "ya-existe" && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Ese año de gestión ya existe.
          </div>
        )}
        {params?.error === "anio-invalido" && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Año inválido.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[300px_1fr] items-start">
          <form
            action={abrirNuevaGestionAction}
            className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5"
          >
            <div>
              <h3 className="font-semibold mb-1">Aperturar nueva gestión</h3>
              <p className="text-sm text-slate-500 mb-4">Cerrará la gestión actualmente abierta de forma automática.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="anio" className="text-sm font-medium">
                Año
              </label>
              <input
                id="anio"
                name="anio"
                type="number"
                min="2020"
                max="2100"
                defaultValue={new Date().getFullYear() + 1}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-950"
              />
            </div>
            <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                id="clonar_items"
                name="clonar_items"
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Clonar ítems de la gestión anterior</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copia todos los ítems de cada unidad con cantidad y precio en cero, para que solo actualicen los montos.
                </p>
              </div>
            </label>
            <button className="h-10 rounded-md bg-emerald-600 font-medium text-white hover:bg-emerald-700 transition-colors">
              Abrir nueva gestión
            </button>
          </form>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium uppercase text-xs">Gestión</th>
                  <th className="px-4 py-3 font-medium uppercase text-xs">Estado</th>
                  <th className="px-4 py-3 font-medium uppercase text-xs">Fecha Creación</th>
                  <th className="px-4 py-3 font-medium uppercase text-xs">Fecha Cierre</th>
                  <th className="px-4 py-3 font-medium uppercase text-xs">Estadísticas</th>
                  <th className="px-4 py-3 font-medium uppercase text-xs text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gestiones.map((gestion) => (
                  <tr key={gestion.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-base">{gestion.anio}</td>
                    <td className="px-4 py-4">
                      {gestion.estado === "ABIERTA" ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          ABIERTA
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          CERRADA
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(gestion.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {gestion.fechaCierre ? new Date(gestion.fechaCierre).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 space-y-1">
                      <div>Topes asig.: {gestion._count.topes}</div>
                      <div>Ítems pto.: {gestion._count.detallesPresupuesto}</div>
                      <div>Cargas ofic.: {gestion._count.registrosCarga}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {gestion.estado === "ABIERTA" ? (
                        <form action={cerrarGestionAction.bind(null, gestion.id)}>
                          <button
                            type="submit"
                            title="Cerrar gestión"
                            className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
                          >
                            Cerrar
                          </button>
                        </form>
                      ) : (
                        <form action={reabrirGestionAction.bind(null, gestion.id)}>
                          <button
                            type="submit"
                            title="Reabrir gestión"
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors"
                          >
                            Reabrir
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {gestiones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay gestiones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
