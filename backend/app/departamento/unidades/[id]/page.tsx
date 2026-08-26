import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { listarDetallesPresupuestoOrdenados } from "@/lib/services/presupuesto";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VerUnidadDepartamentoPage({ params }: PageProps) {
  const user = await requireRole("DEPARTAMENTO");
  const { id } = await params;
  const unidadId = Number(id);

  if (!user.departamentoId) notFound();

  const [unidad, gestionActiva] = await Promise.all([
    prisma.unidad.findUnique({
      where: { id: unidadId },
      include: {
        usuarios: { select: { nombreCompleto: true, username: true } },
        topes: true,
      },
    }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
  ]);

  // Security: the unit must belong to the user's department
  if (!unidad || unidad.departamentoId !== user.departamentoId) {
    notFound();
  }

  if (!gestionActiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center">
          <p className="text-slate-500">No hay gestión abierta.</p>
          <Link href="/departamento/unidades" className="mt-4 inline-block rounded-md border px-4 py-2 text-sm">Volver</Link>
        </div>
      </div>
    );
  }

  const detalles = await listarDetallesPresupuestoOrdenados(unidadId, gestionActiva.id);
  const tope = unidad.topes.find((t) => t.gestionId === gestionActiva.id);
  const total = detalles.reduce((s, d) => s.plus(d.subtotal), new Prisma.Decimal(0));
  const montoTope = tope?.montoTope ?? new Prisma.Decimal(0);
  const disponible = montoTope.minus(total);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-xl font-semibold">{unidad.nombre}</h1>
            <p className="text-xs text-slate-400">
              {(unidad as any).usuarios?.nombreCompleto ?? "Sin responsable"} · @{(unidad as any).usuarios?.username ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
              <div className="px-3 py-1">
                <p className="text-xs text-slate-500">Tope</p>
                <p className="text-sm font-semibold">{formatMoney(montoTope)}</p>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="px-3 py-1">
                <p className="text-xs text-slate-500">Utilizado</p>
                <p className="text-sm font-semibold">{formatMoney(total)}</p>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="px-3 py-1">
                <p className="text-xs text-emerald-600">Disponible</p>
                <p className="text-sm font-semibold text-emerald-800">{formatMoney(disponible)}</p>
              </div>
            </div>
            <Link
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/departamento/unidades"
            >
              Volver
            </Link>
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Lista de presupuesto</h2>
              <p className="text-sm text-slate-500">Gestión {gestionActiva.anio} · {detalles.length} ítem(s)</p>
            </div>
          </div>

          {detalles.length === 0 ? (
            <div className="rounded-md border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Esta unidad aún no ha registrado ítems en la gestión activa.
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
                    <th className="border border-slate-300 px-2 py-2 text-right">PRECIO UNIT.</th>
                    <th className="border border-slate-300 px-2 py-2 text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-xs">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-xs">
                        <span className="font-semibold">{d.item.objetoCodigo}</span>
                        <span className="ml-1 text-slate-500">{d.item.objeto.descripcion}</span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-xs">
                        <span className="font-semibold">{d.itemCodigo}</span>
                        <span className="ml-1 text-slate-500">{d.item.nombre}</span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs">{formatDecimal(d.cantidad)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs">{formatDecimal(d.precioUnitario)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">{formatDecimal(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL</td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-bold">{formatMoney(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatMoney(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(
    Number(value.toString())
  );
}

function formatDecimal(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(value.toString())
  );
}
