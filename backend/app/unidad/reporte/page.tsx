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

  return (
    <main className="min-h-screen bg-white p-6 text-slate-950 print:p-0">
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          @media print {
            body {
              background: white;
            }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <a
            className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
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
            <PrintButton />
          </div>
        </div>

        <header className="mb-5 border-b border-slate-300 pb-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Presupuesto por items
          </p>
          <h1 className="mt-1 text-2xl font-bold">{unidad.nombre}</h1>
          <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
            <Summary label="Gestion" value={String(gestionActiva.anio)} />
            <Summary label="Tope" value={formatMoney(resumen.montoTope)} />
            <Summary label="Utilizado" value={formatMoney(resumen.utilizado)} />
            <Summary label="Disponible" value={formatMoney(resumen.disponible)} />
          </div>
        </header>

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-2 py-2">NRO</th>
              <th className="border border-slate-300 px-2 py-2">OBJETO</th>
              <th className="border border-slate-300 px-2 py-2">OBJETO DESCRIPCION</th>
              <th className="border border-slate-300 px-2 py-2">ITEM</th>
              <th className="border border-slate-300 px-2 py-2 text-right">CANTIDAD</th>
              <th className="border border-slate-300 px-2 py-2 text-right">
                PRECIO UNITARIO
              </th>
              <th className="border border-slate-300 px-2 py-2 text-right">MONTO</th>
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
                  <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                  <td className="border border-slate-300 px-2 py-2">
                    {detalle.item.objetoCodigo}
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {detalle.item.objeto.descripcion}
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <span className="font-semibold">{detalle.itemCodigo}</span>
                    <span> - {detalle.item.nombre}</span>
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {detalle.cantidad.toString()}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatMoney(detalle.precioUnitario)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-semibold">
                    {formatMoney(detalle.subtotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {detalles.length > 0 ? (
            <tfoot>
              <tr className="bg-slate-100">
                <td className="border border-slate-300 px-2 py-2 text-right font-bold" colSpan={6}>
                  TOTAL
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right font-bold">
                  {formatMoney(total)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
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
