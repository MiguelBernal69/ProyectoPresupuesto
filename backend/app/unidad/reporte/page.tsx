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

  const total = detalles.reduce((sum, detalle) => sum + Number(detalle.subtotal), 0);
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
  ).sort((a, b) => a.objetoCodigo.localeCompare(b.objetoCodigo));

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

        <header className="mb-5 border-b border-slate-300 pb-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Presupuesto por items
          </p>
          <h1 className="mt-1 text-2xl font-bold">{unidad.nombre}</h1>
          <div className="mt-1 grid grid-cols-4 gap-3 text-sm">
            <Summary label="Gestion" value={String(gestionActiva.anio)} />
            <Summary label="Tope" value={formatMoney(resumen.montoTope)} />
            <Summary label="Utilizado" value={formatMoney(resumen.utilizado)} />
            <Summary label="Disponible" value={formatMoney(resumen.disponible)} />
          </div>
        </header>

        <section className="print-section print-view-detallada">
          <h2 className="mb-3 text-lg font-semibold print:mb-2 print:text-base">
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
                detalles.map((detalle, index) => (
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
                      {formatMoney(detalle.precioUnitario)}
                    </td>
                    <td className="border border-slate-300 px-2 py-0 text-right font-semibold">
                      {formatMoney(detalle.subtotal)}
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
          <h2 className="mb-3 text-lg font-semibold print:mb-2 print:text-base">
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
                agrupadosPorObjeto.map((grupo, index) => (
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
                      {formatMoney(grupo.total)}
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
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-300 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
