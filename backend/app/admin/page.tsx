import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  const [gestiones, unidades, usuarios, topes] = await Promise.all([
    prisma.gestion.findMany({
      orderBy: { anio: "desc" },
    }),
    prisma.unidad.findMany({
      orderBy: { nombre: "asc" },
      include: {
        usuarios: {
          select: {
            username: true,
            activo: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.topeUnidad.findMany({
      include: {
        unidad: true,
        gestion: true,
      },
      orderBy: [{ gestion: { anio: "desc" } }, { unidad: { nombre: "asc" } }],
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Header title="Panel administrador" name={user.nombreCompleto} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Gestiones" value={gestiones.length} />
          <Metric label="Unidades" value={unidades.length} />
          <Metric label="Usuarios" value={usuarios} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Unidades registradas</h2>
              <Link
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                href="/admin/unidades"
              >
                Nueva unidad
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {unidades.map((unidad) => (
                <div
                  className="rounded-md border border-slate-200 px-3 py-3"
                  key={unidad.id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{unidad.nombre}</p>
                    <span className="text-sm text-slate-500">
                      {unidad.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Usuario: {unidad.usuarios[0]?.username ?? "Sin usuario"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Topes por gestion</h2>
            <div className="mt-4 grid gap-3">
              {topes.map((tope) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-3"
                  key={tope.id}
                >
                  <div>
                    <p className="font-medium">{tope.unidad.nombre}</p>
                    <p className="text-sm text-slate-500">
                      Gestion {tope.gestion.anio}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(tope.montoTope)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Header({ title, name }: { title: string; name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{name}</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        <form action={logoutAction}>
          <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
