import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import TablaConAcciones from "./TablaConAcciones";
import BuscadorYAgregar from "./BuscadorYAgregar";
import Alert from "@/components/Alert";
import { formatMoney } from "@/lib/utils/format";
import SelectorGestionWrapper from "@/components/SelectorGestionWrapper";
import { getGestionContexto } from "@/lib/services/gestion";

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

  const gestionActiva = await getGestionContexto();

  if (!gestionActiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center">
          <h2 className="text-lg font-semibold">Sin gestión activa</h2>
          <p className="mt-2 text-sm text-slate-500">No hay una gestión abierta en este momento.</p>
        </div>
      </div>
    );
  }

  const [unidad] = await Promise.all([
    prisma.unidad.findUnique({
      where: { id: user.unidadId },
      include: {
        topes: {
          where: { gestionId: gestionActiva.id },
        },
        detallesPresupuesto: {
          where: { gestionId: gestionActiva.id },
          include: {
            item: {
              include: {
                objeto: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!unidad) {
    notFound();
  }

  // === Resumen ===
  const tope = unidad.topes[0]?.montoTope ?? new Prisma.Decimal(0);
  const utilizado = unidad.detallesPresupuesto.reduce(
    (total, det) => total.plus(det.subtotal),
    new Prisma.Decimal(0)
  );
  const resumen = {
    montoTope: tope,
    utilizado,
    disponible: tope.minus(utilizado),
  };

  const detallesFlat = unidad.detallesPresupuesto.map((det) => ({
    id: det.id,
    itemCodigo: det.item.codigo,
    itemNombre: det.item.nombre,
    objetoCodigo: det.item.objeto.codigo,
    objetoDescripcion: det.item.objeto.descripcion,
    precioUnitario: det.precioUnitario.toString(),
    cantidad: det.cantidad.toString(),
    subtotal: det.subtotal.toString(),
  }));

  // Obtener ítems obligatorios para esta gestión (para el modal agregar)
  const itemsObligatorios = await prisma.itemObligatorio.findMany({
    where: {
      unidadId: unidad.id,
      gestionId: gestionActiva.id,
    },
    include: { item: { include: { objeto: true } } },
  });

  const codigosRegistrados = new Set(detallesFlat.map((d) => d.itemCodigo));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
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

          <div className="flex flex-wrap gap-2 items-center">
            <SelectorGestionWrapper />
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Detalle de presupuesto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gestión {gestionActiva.anio} {gestionActiva.estado === "CERRADA" ? "(Cerrada - Solo Lectura)" : ""}
            </p>
          </div>
          <Link
            href="/unidad/reporte"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Imprimir Reporte
          </Link>
        </div>

        {/* Alertas */}
        {params?.created && <Alert tone="success" message="Ítem agregado correctamente." />}
        {params?.updated && <Alert tone="success" message="Ítem actualizado correctamente." />}
        {params?.deleted && <Alert tone="success" message="Ítem eliminado correctamente." />}
        {params?.error && (
          <Alert tone="error" message={decodeURIComponent(params.error)} />
        )}

        {/* Buscar + Agregar (Componente Cliente) */}
        {gestionActiva.estado === "ABIERTA" && (
          <BuscadorYAgregar
            gestionId={gestionActiva.id}
            gestionAnio={gestionActiva.anio}
            itemsObligatorios={itemsObligatorios as any}
            codigosRegistrados={Array.from(codigosRegistrados)}
          />
        )}

        {/* Tabla con acciones (Client Component) */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Mi lista de presupuesto</h2>
              <p className="text-sm text-slate-500">Gestión {gestionActiva.anio}</p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <a
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/api/unidad/presupuesto"
            >
              Descargar CSV
            </a>
            {resumen.disponible.gt(0) ? (
              <div className="flex items-center gap-3">
                <button
                  disabled
                  className="h-10 rounded-md bg-slate-300 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
                  title="Debes utilizar todo el presupuesto disponible antes de imprimir"
                >
                  Imprimir
                </button>
                <span className="text-sm font-medium text-amber-600">
                  ⚠️ Debes agotar tu saldo disponible para imprimir la memoria de cálculo.
                </span>
              </div>
            ) : (
              <a
                className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                href="/unidad/reporte"
              >
                Imprimir
              </a>
            )}
          </div>
          <TablaConAcciones detalles={detallesFlat} soloLectura={gestionActiva.estado !== "ABIERTA"} />
        </section>
      </section>
    </main>
  );
}
