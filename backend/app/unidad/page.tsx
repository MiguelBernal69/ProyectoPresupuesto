import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { buscarItemsCatalogo } from "@/lib/services/catalogo";
import { obtenerResumenUnidad } from "@/lib/services/presupuesto";
import { agregarDetalleAction } from "./actions";

export const dynamic = "force-dynamic";

type UnidadPageProps = {
  searchParams?: Promise<{
    q?: string;
    item?: string;
    created?: string;
    error?: string;
  }>;
};

export default async function UnidadPage({ searchParams }: UnidadPageProps) {
  const user = await requireRole("UNIDAD");
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const selectedItemCode = params?.item ?? "";

  if (!user.unidadId) {
    notFound();
  }

  const [unidad, gestionActiva] = await Promise.all([
    prisma.unidad.findUnique({
      where: { id: user.unidadId },
    }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
  ]);

  if (!unidad || !gestionActiva) {
    notFound();
  }

  const [detalles, resumen, resultados, selectedItem] = await Promise.all([
    prisma.detallePresupuesto.findMany({
      where: {
        unidadId: user.unidadId,
        gestionId: gestionActiva.id,
      },
      include: {
        item: {
          include: {
            objeto: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    obtenerResumenUnidad(unidad.id, gestionActiva.id),
    buscarItemsCatalogo(query, 12),
    selectedItemCode
      ? prisma.item.findUnique({
          where: { codigo: selectedItemCode },
          include: { objeto: true },
        })
      : null,
  ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {user.nombreCompleto}
            </p>
            <h1 className="text-2xl font-semibold">{unidad.nombre}</h1>
          </div>
          <form action={logoutAction}>
            <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Tope" value={formatMoney(resumen.montoTope)} />
          <Metric label="Utilizado" value={formatMoney(resumen.utilizado)} />
          <Metric label="Disponible" value={formatMoney(resumen.disponible)} />
        </div>

        {params?.created ? (
          <Alert tone="success" message="Item agregado correctamente." />
        ) : null}

        {params?.error ? (
          <Alert tone="error" message={decodeURIComponent(params.error)} />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Buscar item</h2>
            <p className="mt-1 text-sm text-slate-500">
              Busca por codigo, descripcion, objeto o nombre del item.
            </p>

            <form className="mt-4 flex gap-2">
              <input
                name="q"
                defaultValue={query}
                className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                placeholder="Ej. courier, 211, comunicaciones"
              />
              <button className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                Buscar
              </button>
            </form>

            <div className="mt-4 grid gap-2">
              {query && resultados.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No se encontraron items.
                </p>
              ) : null}

              {resultados.map((item) => (
                <a
                  className={`rounded-md border px-3 py-3 text-sm hover:bg-slate-50 ${
                    item.codigo === selectedItemCode
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200"
                  }`}
                  href={`/unidad?q=${encodeURIComponent(query)}&item=${encodeURIComponent(
                    item.codigo,
                  )}`}
                  key={item.codigo}
                >
                  <p className="font-medium">
                    {item.codigo} - {item.nombre}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {item.objetoCodigo} - {item.objeto.descripcion}
                  </p>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Agregar a mi presupuesto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona un item y registra cantidad y precio unitario.
            </p>

            {selectedItem ? (
              <div className="mt-4 rounded-md bg-slate-50 p-4">
                <p className="text-sm font-medium">
                  {selectedItem.objetoCodigo} - {selectedItem.objeto.descripcion}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedItem.codigo} - {selectedItem.nombre}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                Elige un item de la lista de busqueda para habilitar el formulario.
              </div>
            )}

            <form action={agregarDetalleAction} className="mt-5 grid gap-4 sm:grid-cols-3">
              <input name="gestionId" type="hidden" value={gestionActiva.id} />
              <input name="itemCodigo" type="hidden" value={selectedItem?.codigo ?? ""} />

              <label className="grid gap-1 text-sm font-medium">
                Cantidad
                <input
                  name="cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="12.00"
                  disabled={!selectedItem}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Precio unitario
                <input
                  name="precioUnitario"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="30.00"
                  disabled={!selectedItem}
                />
              </label>

              <button
                className="mt-6 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!selectedItem}
              >
                Agregar item
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Mi lista de presupuesto</h2>
              <p className="text-sm text-slate-500">Gestion {gestionActiva.anio}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">NRO</th>
                  <th className="px-3 py-2 font-medium">OBJETO</th>
                  <th className="px-3 py-2 font-medium">OBJETO DESCRIPCION</th>
                  <th className="px-3 py-2 font-medium">ITEM</th>
                  <th className="px-3 py-2 text-right font-medium">CANTIDAD</th>
                  <th className="px-3 py-2 text-right font-medium">PRECIO UNITARIO</th>
                  <th className="px-3 py-2 text-right font-medium">MONTO</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                      Todavia no hay items en tu lista.
                    </td>
                  </tr>
                ) : (
                  detalles.map((detalle, index) => (
                    <tr className="border-t border-slate-200" key={detalle.id}>
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3">{detalle.item.objetoCodigo}</td>
                      <td className="px-3 py-3">{detalle.item.objeto.descripcion}</td>
                      <td className="px-3 py-3">
                        {detalle.itemCodigo} - {detalle.item.nombre}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {detalle.cantidad.toString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatMoney(detalle.precioUnitario)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatMoney(detalle.subtotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function Alert({ tone, message }: { tone: "success" | "error"; message: string }) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {message}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
