import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function ItemsObligatoriosPage() {
  await requireRole("ADMIN");

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  const [items, obligatorios] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
      include: { objeto: true },
    }),
    gestionActiva
      ? prisma.itemObligatorio.findMany({
          where: { gestionId: gestionActiva.id },
          select: { itemCodigo: true },
        })
      : [],
  ]);

  const obligatoriosSet = new Set(obligatorios.map((item) => item.itemCodigo));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold">Items obligatorios</h1>
            <p className="text-sm text-slate-500">
              {gestionActiva ? `Gestion ${gestionActiva.anio}` : "Sin gestion abierta"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50" href="/admin">
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
          <p className="text-sm text-slate-500">
            Marca los ítems que todas las unidades deben registrar obligatoriamente para la gestión activa.
          </p>

          <form action="/api/admin/items-obligatorios" method="post" className="mt-5 grid gap-3">
            <input type="hidden" name="gestionId" value={gestionActiva?.id ?? ""} />
            {items.map((item) => (
              <label key={item.codigo} className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3">
                <input
                  type="checkbox"
                  name="itemCodigo"
                  value={item.codigo}
                  defaultChecked={obligatoriosSet.has(item.codigo)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="font-medium">{item.codigo} - {item.nombre}</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {item.objetoCodigo} - {item.objeto.descripcion}
                  </span>
                </span>
              </label>
            ))}

            <button className="mt-2 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
              Guardar items obligatorios
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
