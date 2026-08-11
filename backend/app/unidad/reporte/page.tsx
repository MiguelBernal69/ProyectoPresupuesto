import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  listarDetallesPresupuestoOrdenados,
  obtenerResumenUnidad,
} from "@/lib/services/presupuesto";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ReportePresupuestoPage() {
  const user = await requireRole("UNIDAD");

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

  const [detalles, resumen] = await Promise.all([
    listarDetallesPresupuestoOrdenados(unidad.id, gestionActiva.id),
    obtenerResumenUnidad(unidad.id, gestionActiva.id),
  ]);

  if (resumen.disponible.gt(0)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-bold text-red-600">Acción denegada</h2>
          <p className="mb-6 text-slate-600">
            Aún tienes saldo disponible en tu presupuesto. Debes utilizar todo el presupuesto asignado a tu unidad antes de poder imprimir la memoria de cálculo.
          </p>
          <a
            href="/unidad"
            className="inline-block rounded-md bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800"
          >
            Volver a la lista
          </a>
        </div>
      </div>
    );
  }

  const total = detalles.reduce((sum: number, detalle: typeof detalles[number]) => sum + Number(detalle.subtotal), 0);
  const agrupadosPorObjeto = Array.from(
    detalles
      .reduce(
        (groups, detalle) => {
          const current = groups.get(detalle.item.objetoCodigo) ?? {
            objetoCodigo: detalle.item.objetoCodigo,
            objetoDescripcion: detalle.item.objeto.descripcion,
            total: 0,
          };

          current.total += Number(detalle.subtotal);
          groups.set(detalle.item.objetoCodigo, current);
          return groups;
        },
        new Map<
          string,
          {
            objetoCodigo: string;
            objetoDescripcion: string;
            total: number;
          }
        >(),
      )
      .values(),
  ).sort((a: { objetoCodigo: string; objetoDescripcion: string; total: number }, b: { objetoCodigo: string; objetoDescripcion: string; total: number }) => a.objetoCodigo.localeCompare(b.objetoCodigo));

  return (
    <main className="min-h-screen bg-white p-3 text-slate-950 print:p-0">
      <style>
        {`
          @page {
            size: Carta landscape;
            margin: 10mm;
          }

          @media print {
            body {
              background: white;
            }

            html[data-print-view="detallada"] .print-view-agrupada,
            html[data-print-view="agrupada"] .print-view-detallada {
              display: none !important;
            }

            html:not([data-print-view]) .print-section + .print-section {
              break-before: page;
            }

            .total-final {
              break-inside: avoid;
              break-before: avoid;
            }

            /* Títulos del header según vista de impresión */
            .print-header-default { display: none; }
            .print-header-detallada { display: none; }
            .print-header-agrupada { display: none; }

            html[data-print-view="detallada"] .print-header-detallada { display: block; }
            html[data-print-view="agrupada"] .print-header-agrupada { display: block; }

            html:not([data-print-view]) .print-header-default { display: block; }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <a
            className="h-10 rounded-md border border-slate-300 px-1 py-2 text-sm font-medium hover:bg-slate-50"
            href="/unidad"
          >
            Volver
          </a>
          <div className="flex gap-2">
            <a
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/api/unidad/presupuesto"
            >
              Descargar CSV
            </a>
            <PrintButton label="Imprimir detalle" view="detallada" />
            <PrintButton label="Imprimir agrupado" view="agrupada" />
          </div>
        </div>

        <header className="mb-6 border-b border-slate-300 pb-4">
          {/* En pantalla */}
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500 print:hidden">
            PRESUPUESTO 2027
          </p>
          {/* Al imprimir: según vista */}
          <p className="print-header-default hidden text-center text-sm font-bold uppercase tracking-widest mb-1">
            PRESUPUESTO 2027
          </p>
          <p className="print-header-detallada hidden text-center text-sm font-bold uppercase tracking-widest mb-1">
            PRESUPUESTO 2027 — MEMORIA DE CÁLCULO
          </p>
          <p className="print-header-agrupada hidden text-center text-sm font-bold uppercase tracking-widest mb-1">
            PRESUPUESTO 2027 — MEMORIA DE CÁLCULO / RESUMEN POR OBJETO
          </p>
          <h3 className="mt-1 text-sm font-bold">Dirección Administrativa: 8 FACULTAD DE MEDICINA </h3>
          <h3 className="mt-1 text-sm font-semibold">Actividad: {unidad.nombre}</h3>
          <h3 className="mt-1 text-sm font-semibold">Techo: {formatMoney(resumen.montoTope)}</h3>

        </header>

        <section className="print-section print-view-detallada">
          <h2 className="mb-3 text-lg font-semibold print:hidden">
            Vista detallada
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-1 py-0">NRO</th>
                <th className="border border-slate-300 px-1 py-1">OBJETO</th>
                <th className="border border-slate-300 px-1 py-1">OBJETO DESCRIPCION</th>
                <th className="border border-slate-300 px-1 py-1">ITEM</th>
                <th className="border border-slate-300 px-1 py-1 text-right">CANTIDAD</th>
                <th className="border border-slate-300 px-1 py-1 text-right">
                  PRECIO UNITARIO
                </th>
                <th className="border border-slate-300 px-1 py-1 text-right">MONTO</th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr>
                  <td className="border border-slate-300 px-2 py-6 text-center" colSpan={7}>
                    No hay items registrados.
                  </td>
                </tr>
              ) : (
                detalles.map((detalle: typeof detalles[number], index: number) => (
                  <tr key={detalle.id} className="break-inside-avoid">
                    <td className="border border-slate-300 px-2 py-0">{index + 1}</td>
                    <td className="border border-slate-300 px-2 py-0">
                      {detalle.item.objetoCodigo}
                    </td>
                    <td className="border border-slate-300 px-2 py-0">
                      {detalle.item.objeto.descripcion}
                    </td>
                    <td className="border border-slate-300 px-2 py-0">
                      <span className="font-semibold">{detalle.itemCodigo}</span>
                      <span> - {detalle.item.nombre}</span>
                    </td>
                    <td className="border border-slate-300 px-2 py-0 text-right">
                      {detalle.cantidad.toString()}
                    </td>
                    <td className="border border-slate-300 px-2 py-0 text-right">
                      {formatDecimal(detalle.precioUnitario)}
                    </td>
                    <td className="border border-slate-300 px-2 py-0 text-right font-semibold">
                      {formatDecimal(detalle.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {detalles.length > 0 ? (
            <table className="total-final w-full border-collapse text-[10px]">
              <tbody>
                <tr className="bg-slate-100">
                  <td
                    className="border border-slate-300 px-2 py-2 text-right font-bold"
                    colSpan={6}
                  >
                    TOTAL
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-bold">
                    {formatMoney(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="print-section print-view-agrupada mt-8 print:mt-0">
          <h2 className="mb-3 text-lg font-semibold print:hidden">
            Vista agrupada por objeto
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-2 py-2 text-center w-8">NRO</th>
                <th className="border border-slate-300 px-2 py-2">OBJETO</th>
                <th className="border border-slate-300 px-2 py-2">DESCRIPCION</th>
                <th className="border border-slate-300 px-2 py-2 text-right">MONTO TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {agrupadosPorObjeto.length === 0 ? (
                <tr>
                  <td className="border border-slate-300 px-2 py-6 text-center" colSpan={4}>
                    No hay items registrados.
                  </td>
                </tr>
              ) : (
                agrupadosPorObjeto.map((grupo: { objetoCodigo: string; objetoDescripcion: string; total: number }, index: number) => (
                  <tr key={grupo.objetoCodigo} className="break-inside-avoid">
                    <td className="border border-slate-300 px-1 py-1 text-center">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 font-semibold">
                      {grupo.objetoCodigo}
                    </td>
                    <td className="border border-slate-300 px-1 py-1">
                      {grupo.objetoDescripcion}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 text-right font-semibold">
                      {formatDecimal(grupo.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {agrupadosPorObjeto.length > 0 ? (
            <table className="total-final w-full border-collapse text-[11px]">
              <tbody>
                <tr className="bg-slate-100">
                  <td
                    className="border border-slate-300 px-1 py-1 text-right font-bold"
                    colSpan={3}
                  >
                    TOTAL
                  </td>
                  <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                    {formatMoney(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </section>

        {/* Firmas */}
        <div className="mt-16 grid grid-cols-2 gap-16 break-inside-avoid print:mt-24">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full border-b-2 border-slate-950"></div>
            <p className="text-xs font-medium uppercase tracking-wide">{user.nombreCompleto}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Responsable de la Unidad</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-full border-b-2 border-slate-950"></div>
            <p className="text-xs font-bold uppercase tracking-wide">V.B. (Visto Bueno)</p>
          </div>
        </div>

      </div>
    </main>
  );
}


function formatMoney(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}

function formatDecimal(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value.toString()));
}
