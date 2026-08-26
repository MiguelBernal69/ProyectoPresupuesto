import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import PrintButton from "@/app/unidad/reporte/PrintButton";
import { getGestionContexto } from "@/lib/services/gestion";

export const dynamic = "force-dynamic";

export default async function ReporteDepartamentoPage() {
  const user = await requireRole("DEPARTAMENTO");

  if (!user.departamentoId) {
    notFound();
  }

  const gestionActiva = await getGestionContexto();

  if (!gestionActiva) notFound();

  const departamento = await prisma.departamento.findUnique({
    where: { id: user.departamentoId },
    include: {
      unidades: {
        include: {
          detallesPresupuesto: {
            where: { gestionId: gestionActiva.id },
            include: {
              item: { include: { objeto: true } },
            },
          },
          topes: {
            where: { gestionId: gestionActiva.id },
          },
        },
      },
    },
  });

  if (!departamento) {
    notFound();
  }

  // Consolidar ítems
  type ItemConsolidado = {
    itemCodigo: string;
    itemNombre: string;
    objetoCodigo: string;
    objetoDescripcion: string;
    cantidadTotal: Prisma.Decimal;
    subtotalTotal: Prisma.Decimal;
  };

  const itemMap = new Map<string, ItemConsolidado>();

  for (const unidad of departamento.unidades) {
    for (const det of unidad.detallesPresupuesto) {
      if (det.gestionId !== gestionActiva.id) continue;
      const prev = itemMap.get(det.itemCodigo);
      if (prev) {
        prev.cantidadTotal = prev.cantidadTotal.plus(det.cantidad);
        prev.subtotalTotal = prev.subtotalTotal.plus(det.subtotal);
      } else {
        itemMap.set(det.itemCodigo, {
          itemCodigo: det.itemCodigo,
          itemNombre: det.item.nombre,
          objetoCodigo: det.item.objetoCodigo,
          objetoDescripcion: det.item.objeto.descripcion,
          cantidadTotal: new Prisma.Decimal(det.cantidad),
          subtotalTotal: new Prisma.Decimal(det.subtotal),
        });
      }
    }
  }

  const itemsConsolidados = Array.from(itemMap.values())
    .map((item) => ({
      ...item,
      precioPromedioPonderado: item.cantidadTotal.gt(0)
        ? item.subtotalTotal.div(item.cantidadTotal)
        : new Prisma.Decimal(0),
    }))
    .sort((a, b) => {
      const obj = a.objetoCodigo.localeCompare(b.objetoCodigo, "es", { numeric: true });
      if (obj !== 0) return obj;
      return a.itemCodigo.localeCompare(b.itemCodigo, "es", { numeric: true });
    });

  const totalGeneral = itemsConsolidados.reduce(
    (s, i) => s.plus(i.subtotalTotal),
    new Prisma.Decimal(0)
  );

  // Agrupar por objeto para resumen
  type GrupoObjeto = { objetoCodigo: string; objetoDescripcion: string; total: Prisma.Decimal };
  const objetoMap = new Map<string, GrupoObjeto>();
  for (const item of itemsConsolidados) {
    const prev = objetoMap.get(item.objetoCodigo);
    if (prev) {
      prev.total = prev.total.plus(item.subtotalTotal);
    } else {
      objetoMap.set(item.objetoCodigo, {
        objetoCodigo: item.objetoCodigo,
        objetoDescripcion: item.objetoDescripcion,
        total: new Prisma.Decimal(item.subtotalTotal),
      });
    }
  }
  const agrupadosPorObjeto = Array.from(objetoMap.values()).sort((a, b) =>
    a.objetoCodigo.localeCompare(b.objetoCodigo, "es", { numeric: true })
  );

  const topeTotal = departamento.unidades.reduce((s, u) => {
    const t = u.topes.find((tp) => tp.gestionId === gestionActiva.id);
    return s.plus(t?.montoTope ?? 0);
  }, new Prisma.Decimal(0));

  return (
    <main className="min-h-screen bg-white p-3 text-slate-950 print:p-0">
      <style>
        {`
          @page {
            size: Carta landscape;
            margin: 10mm;
          }
          @media print {
            body { background: white; }
            html[data-print-view="agrupada"] .print-view-detallada { display: none !important; }
            html[data-print-view="detallada"] .print-view-agrupada { display: none !important; }
            html:not([data-print-view]) .print-section + .print-section { break-before: page; }
            .total-final { break-inside: avoid; break-before: avoid; }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <a
            className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            href="/departamento"
          >
            Volver
          </a>
          <div className="flex gap-2">
            <PrintButton label="Imprimir detalle" view="detallada" />
            <PrintButton label="Imprimir agrupado" view="agrupada" />
          </div>
        </div>

        <header className="mb-6 border-b border-slate-300 pb-4 text-center print:text-left">
          <h1 className="text-lg font-bold uppercase tracking-widest">
            Presupuesto Consolidado — {departamento.nombre}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">GESTIÓN {gestionActiva.anio}</p>
          <p className="mt-1 text-sm text-slate-500">
            Tope total: {formatMoney(topeTotal)} · {departamento.unidades.length} unidad(es)
          </p>
        </header>

        {/* Vista detallada */}
        <section className="print-section print-view-detallada">
          <h2 className="mb-3 text-lg font-semibold print:hidden">Vista detallada consolidada</h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-1 py-1">NRO</th>
                <th className="border border-slate-300 px-1 py-1">OBJETO</th>
                <th className="border border-slate-300 px-1 py-1">DESC. OBJETO</th>
                <th className="border border-slate-300 px-1 py-1">ÍTEM</th>
                <th className="border border-slate-300 px-1 py-1 text-right">CANTIDAD</th>
                <th className="border border-slate-300 px-1 py-1 text-right">PRECIO PROM.</th>
                <th className="border border-slate-300 px-1 py-1 text-right">MONTO</th>
              </tr>
            </thead>
            <tbody>
              {itemsConsolidados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-slate-300 px-2 py-6 text-center">
                    No hay ítems registrados.
                  </td>
                </tr>
              ) : (
                itemsConsolidados.map((item, idx) => (
                  <tr key={item.itemCodigo} className="break-inside-avoid">
                    <td className="border border-slate-300 px-1 py-0">{idx + 1}</td>
                    <td className="border border-slate-300 px-1 py-0">{item.objetoCodigo}</td>
                    <td className="border border-slate-300 px-1 py-0">{item.objetoDescripcion}</td>
                    <td className="border border-slate-300 px-1 py-0">
                      <span className="font-semibold">{item.itemCodigo}</span>
                      <span> - {item.itemNombre}</span>
                    </td>
                    <td className="border border-slate-300 px-1 py-0 text-right">{formatDecimal(item.cantidadTotal)}</td>
                    <td className="border border-slate-300 px-1 py-0 text-right">{formatDecimal(item.precioPromedioPonderado)}</td>
                    <td className="border border-slate-300 px-1 py-0 text-right font-semibold">{formatDecimal(item.subtotalTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {itemsConsolidados.length > 0 && (
            <table className="total-final w-full border-collapse text-[10px]">
              <tbody>
                <tr className="bg-slate-100">
                  <td colSpan={6} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL</td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-bold">{formatMoney(totalGeneral)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        {/* Vista agrupada por objeto */}
        <section className="print-section print-view-agrupada mt-8 print:mt-0">
          <h2 className="mb-3 text-lg font-semibold print:hidden">Resumen por objeto</h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-2 py-2 text-center w-8">NRO</th>
                <th className="border border-slate-300 px-2 py-2">OBJETO</th>
                <th className="border border-slate-300 px-2 py-2">DESCRIPCIÓN</th>
                <th className="border border-slate-300 px-2 py-2 text-right">MONTO TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {agrupadosPorObjeto.map((grupo, idx) => (
                <tr key={grupo.objetoCodigo} className="break-inside-avoid">
                  <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 px-1 py-1 font-semibold">{grupo.objetoCodigo}</td>
                  <td className="border border-slate-300 px-1 py-1">{grupo.objetoDescripcion}</td>
                  <td className="border border-slate-300 px-1 py-1 text-right font-semibold">{formatDecimal(grupo.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {agrupadosPorObjeto.length > 0 && (
            <table className="total-final w-full border-collapse text-[11px]">
              <tbody>
                <tr className="bg-slate-100">
                  <td colSpan={3} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL</td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-bold">{formatMoney(totalGeneral)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        {/* Firmas */}
        <div className="mt-16 grid grid-cols-2 gap-16 break-inside-avoid print:mt-24">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full border-b-2 border-slate-950"></div>
            <p className="text-xs font-medium uppercase tracking-wide">{user.nombreCompleto}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Responsable del Departamento</p>
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
