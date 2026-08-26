import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import SelectorGestionWrapper from "@/components/SelectorGestionWrapper";
import { getGestionContexto } from "@/lib/services/gestion";

export const dynamic = "force-dynamic";

export default async function DepartamentoPage() {
  const user = await requireRole("DEPARTAMENTO");

  if (!user.departamentoId) {
    notFound();
  }

  const gestionActiva = await getGestionContexto();

  const [departamento] = await Promise.all([
    prisma.departamento.findUnique({
      where: { id: user.departamentoId },
      include: {
        unidades: {
          include: {
            topes: {
              where: { gestionId: gestionActiva?.id || 0 },
            },
            detallesPresupuesto: {
              where: { gestionId: gestionActiva?.id || 0 },
              include: {
                item: { include: { objeto: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!departamento) {
    notFound();
  }

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

  // Filtrar solo unidades con tope en esta gestión
  const unidadesConDatos = departamento.unidades.map((unidad) => {
    const tope = unidad.topes.find((t) => t.gestionId === gestionActiva.id);
    const detallesGestion = unidad.detallesPresupuesto.filter(
      (d) => d.gestionId === gestionActiva.id
    );
    const utilizado = detallesGestion.reduce(
      (s, d) => s.plus(d.subtotal),
      new Prisma.Decimal(0)
    );
    return {
      id: unidad.id,
      nombre: unidad.nombre,
      activa: unidad.activa,
      montoTope: tope?.montoTope ?? new Prisma.Decimal(0),
      utilizado,
      disponible: (tope?.montoTope ?? new Prisma.Decimal(0)).minus(utilizado),
      itemCount: detallesGestion.length,
    };
  });

  // Consolidar ítems de todas las unidades: suma cantidades, precio = media ponderada
  type ItemConsolidado = {
    itemCodigo: string;
    itemNombre: string;
    objetoCodigo: string;
    objetoDescripcion: string;
    cantidadTotal: Prisma.Decimal;
    subtotalTotal: Prisma.Decimal;
    precioPromedioPonderado: Prisma.Decimal;
  };

  const itemMap = new Map<string, ItemConsolidado>();

  for (const unidad of departamento.unidades) {
    for (const det of unidad.detallesPresupuesto) {
      if (det.gestionId !== gestionActiva.id) continue;
      const prev = itemMap.get(det.itemCodigo);
      if (prev) {
        prev.cantidadTotal = prev.cantidadTotal.plus(det.cantidad);
        prev.subtotalTotal = prev.subtotalTotal.plus(det.subtotal);
        // Precio ponderado = subtotal_total / cantidad_total (se recalcula al final)
      } else {
        itemMap.set(det.itemCodigo, {
          itemCodigo: det.itemCodigo,
          itemNombre: det.item.nombre,
          objetoCodigo: det.item.objetoCodigo,
          objetoDescripcion: det.item.objeto.descripcion,
          cantidadTotal: new Prisma.Decimal(det.cantidad),
          subtotalTotal: new Prisma.Decimal(det.subtotal),
          precioPromedioPonderado: new Prisma.Decimal(0),
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
  const topeTotal = unidadesConDatos.reduce(
    (s, u) => s.plus(u.montoTope),
    new Prisma.Decimal(0)
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-xl font-semibold">{departamento.nombre}</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <SelectorGestionWrapper />
            <Link
              href="/departamento/unidades"
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Gestionar Unidades
            </Link>
            <Link
              href="/departamento/reporte"
              className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Imprimir Consolidado
            </Link>
            <Link
              href="/departamento/carga-oficial"
              className="h-10 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/ বাতাসে" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              Carga Oficial
            </Link>
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        {/* Resumen de unidades */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unidadesConDatos.map((u) => (
            <Link
              key={u.id}
              href={`/departamento/unidades/${u.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{u.nombre}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${u.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {u.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">Tope</p>
                  <p className="text-xs font-semibold">{formatMoney(u.montoTope)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Utilizado</p>
                  <p className="text-xs font-semibold">{formatMoney(u.utilizado)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-600">Disponible</p>
                  <p className="text-xs font-semibold text-emerald-800">{formatMoney(u.disponible)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{u.itemCount} ítem(s) registrado(s)</p>
            </Link>
          ))}
        </div>

        {/* Tabla consolidada */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Presupuesto Consolidado del Departamento</h2>
              <p className="text-sm text-slate-500">
                Gestión {gestionActiva.anio} · {itemsConsolidados.length} ítem(s) de {unidadesConDatos.length} unidad(es)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Tope total</p>
                <p className="text-sm font-semibold">{formatMoney(topeTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600">Total consolidado</p>
                <p className="text-sm font-bold text-emerald-900">{formatMoney(totalGeneral)}</p>
              </div>
            </div>
          </div>

          {itemsConsolidados.length === 0 ? (
            <div className="rounded-md border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Ninguna unidad ha registrado ítems en la gestión activa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 px-2 py-2 text-center w-8">NRO</th>
                    <th className="border border-slate-300 px-2 py-2">OBJETO</th>
                    <th className="border border-slate-300 px-2 py-2">ÍTEM</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">CANTIDAD</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">PRECIO PROM.</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConsolidados.map((item, idx) => (
                    <tr key={item.itemCodigo} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-xs">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-xs">
                        <span className="font-semibold">{item.objetoCodigo}</span>
                        <span className="ml-1 text-slate-500">{item.objetoDescripcion}</span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-xs">
                        <span className="font-semibold">{item.itemCodigo}</span>
                        <span className="ml-1 text-slate-500">{item.itemNombre}</span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs">{formatDecimal(item.cantidadTotal)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs">{formatDecimal(item.precioPromedioPonderado)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">{formatDecimal(item.subtotalTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL</td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-bold">{formatMoney(totalGeneral)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </section>
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
