import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { buscarItemsCatalogo } from "@/lib/services/catalogo";
import { obtenerResumenUnidad } from "@/lib/services/presupuesto";
import { agregarDetalleAction } from "./actions";
import TablaConAcciones from "./TablaConAcciones";

export const dynamic = "force-dynamic";

type UnidadPageProps = {
  searchParams?: Promise<{
    q?: string;
    item?: string;
    created?: string;
    updated?: string;
    deleted?: string;
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
    prisma.unidad.findUnique({ where: { id: user.unidadId } }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
  ]);

  if (!unidad || !gestionActiva) {
    notFound();
  }

  const [detalles, resumen, resultados, selectedItem, itemsObligatorios] = await Promise.all([
    prisma.detallePresupuesto.findMany({
      where: { unidadId: user.unidadId, gestionId: gestionActiva.id },
      include: { item: { include: { objeto: true } } },
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
    prisma.itemObligatorio.findMany({
      where: { gestionId: gestionActiva.id },
      include: { item: { include: { objeto: true } } },
    }),
  ]);

  const codigosRegistrados = new Set(detalles.map((d) => d.itemCodigo));
  const obligatoriosPendientes = itemsObligatorios.filter(
    (o) => !codigosRegistrados.has(o.itemCodigo),
  );

  // Serializar detalles para pasar al Client Component (sin objetos Decimal)
  const detallesSerializados = detalles.map((d) => ({
    id: d.id,
    itemCodigo: d.itemCodigo,
    itemNombre: d.item.nombre,
    objetoCodigo: d.item.objetoCodigo,
    objetoDescripcion: d.item.objeto.descripcion,
    cantidad: d.cantidad.toString(),
    precioUnitario: d.precioUnitario.toString(),
    subtotal: d.subtotal.toString(),
  }));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-xl font-semibold">{unidad.nombre}</h1>
          </div>
          
          <div className="hidden flex-1 items-center justify-center gap-4 lg:flex">
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-1.5">
              <div className="px-3 py-1">
                <p className="text-xs font-medium text-slate-500">Tope</p>
                <p className="text-sm font-semibold">{formatMoney(resumen.montoTope)}</p>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="px-3 py-1">
                <p className="text-xs font-medium text-slate-500">Utilizado</p>
                <p className="text-sm font-semibold">{formatMoney(resumen.utilizado)}</p>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="rounded-md bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200/50">
                <p className="text-xs font-medium text-emerald-600">Disponible</p>
                <p className="text-sm font-semibold text-emerald-900">{formatMoney(resumen.disponible)}</p>
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">


        {/* Alertas */}
        {params?.created && <Alert tone="success" message="Ítem agregado correctamente." />}
        {params?.updated && <Alert tone="success" message="Ítem actualizado correctamente." />}
        {params?.deleted && <Alert tone="success" message="Ítem eliminado correctamente." />}
        {params?.error && (
          <Alert tone="error" message={decodeURIComponent(params.error)} />
        )}

        {/* Bloque de ítems obligatorios */}
        {itemsObligatorios.length > 0 && (
          <details
            className={`group rounded-lg border p-5 ${
              obligatoriosPendientes.length === 0
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
            open={obligatoriosPendientes.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 outline-none [&::-webkit-details-marker]:hidden">
              <span className="mt-0.5 text-lg">
                {obligatoriosPendientes.length === 0 ? "✅" : "⚠️"}
              </span>
              <div className="flex-1">
                <h2
                  className={`text-sm font-semibold ${
                    obligatoriosPendientes.length === 0 ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  Ítems obligatorios — Gestión {gestionActiva.anio}
                </h2>
                {obligatoriosPendientes.length === 0 ? (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Todos los ítems obligatorios ya están registrados. Haz clic para ver detalles.
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-amber-700">
                    El administrador requiere que registres estos ítems. Los marcados en verde ya
                    están en tu presupuesto.
                  </p>
                )}
              </div>
              <div className="mt-0.5 text-slate-400 transition-transform group-open:rotate-180">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </summary>
            
            <div className="mt-4 border-t border-black/5 pt-4">
              <ul className="grid gap-2 sm:grid-cols-2">
                {itemsObligatorios.map((o) => {
                  const completado = codigosRegistrados.has(o.itemCodigo);
                  return (
                    <li
                      key={o.itemCodigo}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                        completado
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-white text-amber-900"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">{completado ? "✅" : "🔲"}</span>
                      <span>
                        <span className="font-medium">
                          {o.itemCodigo} — {o.item.nombre}
                        </span>
                        <span className="block text-amber-600">
                          {o.item.objetoCodigo} — {o.item.objeto.descripcion}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {obligatoriosPendientes.length > 0 && (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  Faltan {obligatoriosPendientes.length} de {itemsObligatorios.length} ítems
                  obligatorios.
                </p>
              )}
            </div>
          </details>
        )}

        {/* Buscar + Agregar */}
        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Panel izquierdo: Buscar */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Buscar ítem</h2>
            <p className="mt-1 text-sm text-slate-500">
              Busca por código, descripción, objeto o nombre.
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
              {query && resultados.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No se encontraron ítems.
                </p>
              )}
              {resultados.map((item) => (
                <a
                  key={item.codigo}
                  className={`rounded-md border px-3 py-3 text-sm hover:bg-slate-50 ${
                    item.codigo === selectedItemCode
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200"
                  }`}
                  href={`/unidad?q=${encodeURIComponent(query)}&item=${encodeURIComponent(item.codigo)}`}
                >
                  <p className="font-medium">
                    {item.codigo} — {item.nombre}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {item.objetoCodigo} — {item.objeto.descripcion}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* Panel derecho: Agregar */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Agregar a mi presupuesto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona un ítem y registra cantidad y precio unitario.
            </p>

            {selectedItem ? (
              <div className="mt-4 rounded-md bg-slate-50 p-4">
                <p className="text-sm font-medium">
                  {selectedItem.objetoCodigo} — {selectedItem.objeto.descripcion}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedItem.codigo} — {selectedItem.nombre}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                Elige un ítem de la lista de búsqueda para habilitar el formulario.
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
                Agregar ítem
              </button>
            </form>
          </div>
        </section>

        {/* Tabla con acciones (Client Component) */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Mi lista de presupuesto</h2>
              <p className="text-sm text-slate-500">Gestión {gestionActiva.anio}</p>
            </div>
          </div>
          <TablaConAcciones detalles={detallesSerializados} />
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
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{message}</div>
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
