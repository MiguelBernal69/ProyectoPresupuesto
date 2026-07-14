import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import {
  listarDetallesPresupuestoOrdenados,
  obtenerResumenUnidad,
} from "@/lib/services/presupuesto";
import TablaConAcciones from "./TablaConAcciones";
import BuscadorYAgregar from "./BuscadorYAgregar";

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

  const [detalles, resumen, itemsObligatorios] = await Promise.all([
    listarDetallesPresupuestoOrdenados(user.unidadId, gestionActiva.id),
    obtenerResumenUnidad(unidad.id, gestionActiva.id),
    prisma.itemObligatorio.findMany({
      where: { gestionId: gestionActiva.id, unidadId: user.unidadId },
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
                <p className="text-xs font-medium text-slate-500">Utilizados</p>
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

        {/* Buscar + Agregar (Componente Cliente) */}
        <BuscadorYAgregar 
          gestionId={gestionActiva.id}
          gestionAnio={gestionActiva.anio}
          itemsObligatorios={itemsObligatorios}
          codigosRegistrados={Array.from(codigosRegistrados)}
        />

        {/* Tabla con acciones (Client Component) */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Mi lista de presupuesto</h2>
              <p className="text-sm text-slate-500">Gestión {gestionActiva.anio}</p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <a
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/api/unidad/presupuesto"
            >
              Descargar CSV
            </a>
            <a
              className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              href="/unidad/reporte"
            >
              Imprimir
            </a>
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
