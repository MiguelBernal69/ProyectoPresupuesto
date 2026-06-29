import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { obtenerResumenUnidad } from "@/lib/services/presupuesto";

export const dynamic = "force-dynamic";

export default async function UnidadPage() {
  const user = await requireRole("UNIDAD");

  if (!user.unidadId) {
    notFound();
  }

  const [unidad, gestionActiva, detalles] = await Promise.all([
    prisma.unidad.findUnique({
      where: { id: user.unidadId },
    }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
    prisma.detallePresupuesto.findMany({
      where: { unidadId: user.unidadId },
      include: {
        gestion: true,
        item: {
          include: {
            objeto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!unidad || !gestionActiva) {
    notFound();
  }

  const resumen = await obtenerResumenUnidad(unidad.id, gestionActiva.id);

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

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                Ultimos detalles cargados
              </h2>
              <p className="text-sm text-slate-500">
                Gestion {gestionActiva.anio}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Objeto</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={3}>
                      Todavia no hay detalles cargados.
                    </td>
                  </tr>
                ) : (
                  detalles.map((detalle) => (
                    <tr className="border-t border-slate-200" key={detalle.id}>
                      <td className="px-3 py-3">
                        {detalle.item.objetoCodigo} - {detalle.item.objeto.descripcion}
                      </td>
                      <td className="px-3 py-3">
                        {detalle.itemCodigo} - {detalle.item.nombre}
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
