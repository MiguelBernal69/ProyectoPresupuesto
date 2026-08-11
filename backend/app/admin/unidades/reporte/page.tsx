import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import PrintButton from "@/app/unidad/reporte/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReporteUnidadesPage() {
  await requireRole("ADMIN");

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  if (!gestionActiva) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay gestión abierta para generar este reporte.
      </div>
    );
  }

  const unidades = await prisma.unidad.findMany({
    orderBy: { nombre: "asc" },
    include: {
      usuarios: {
        select: {
          username: true,
          nombreCompleto: true,
        },
      },
      topes: {
        where: {
          gestionId: gestionActiva.id,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-white p-6 text-slate-950 print:p-0">
      <style>
        {`
          @page {
            size: Carta;
            margin: 15mm;
          }

          @media print {
            body {
              background: white;
            }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <a
            className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            href="/admin/unidades"
          >
            Volver
          </a>
          <div className="flex gap-2">
            <PrintButton label="Imprimir reporte" view="default" />
          </div>
        </div>

        <header className="mb-6 border-b border-slate-300 pb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-widest">
            Credenciales y Topes de Unidades
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            GESTIÓN {gestionActiva.anio}
          </p>
        </header>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-3 py-2 w-10 text-center">NRO</th>
                <th className="border border-slate-300 px-3 py-2">UNIDAD</th>
                <th className="border border-slate-300 px-3 py-2">RESPONSABLE</th>
                <th className="border border-slate-300 px-3 py-2">USUARIO</th>
                <th className="border border-slate-300 px-3 py-2 text-right">TOPE ASIGNADO</th>
              </tr>
            </thead>
            <tbody>
              {unidades.length === 0 ? (
                <tr>
                  <td className="border border-slate-300 px-3 py-6 text-center" colSpan={5}>
                    No hay unidades registradas.
                  </td>
                </tr>
              ) : (
                unidades.map((unidad, index) => {
                  const tope = unidad.topes[0]?.montoTope?.toString() ?? "0";
                  const usuario = unidad.usuarios[0];

                  return (
                    <tr key={unidad.id} className="break-inside-avoid">
                      <td className="border border-slate-300 px-3 py-2 text-center">{index + 1}</td>
                      <td className="border border-slate-300 px-3 py-2 font-medium">{unidad.nombre}</td>
                      <td className="border border-slate-300 px-3 py-2">{usuario?.nombreCompleto || "-"}</td>
                      <td className="border border-slate-300 px-3 py-2 font-mono text-xs">{usuario?.username || "-"}</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-semibold">
                        {formatMoney(tope)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
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
