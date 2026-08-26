import Link from "next/link";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import SelectorGestionWrapper from "@/components/SelectorGestionWrapper";
import { getGestionContexto } from "@/lib/services/gestion";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  const gestionActiva = await getGestionContexto();

  const [gestiones, unidades, usuarios] = await Promise.all([
    prisma.gestion.findMany({
      orderBy: { anio: "desc" },
    }),
    gestionActiva
      ? prisma.unidad.findMany({
          orderBy: { nombre: "asc" },
          include: {
            usuarios: {
              select: {
                username: true,
                activo: true,
                nombreCompleto: true,
              },
            },
            topes: {
              where: {
                gestionId: gestionActiva.id,
              },
            },
            detallesPresupuesto: {
              where: {
                gestionId: gestionActiva.id,
              },
              select: {
                subtotal: true,
              },
            },
          },
        })
      : [],
    prisma.user.count(),
  ]);

  const resumen = unidades.reduce(
    (total, unidad) => {
      const tope = unidad.topes[0]?.montoTope ?? new Prisma.Decimal(0);
      const utilizado = unidad.detallesPresupuesto.reduce(
        (subtotal, detalle) => subtotal.plus(detalle.subtotal),
        new Prisma.Decimal(0),
      );

      return {
        tope: total.tope.plus(tope),
        utilizado: total.utilizado.plus(utilizado),
      };
    },
    {
      tope: new Prisma.Decimal(0),
      utilizado: new Prisma.Decimal(0),
    },
  );

  const disponible = resumen.tope.minus(resumen.utilizado);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Header title="Panel administrador" name={user.nombreCompleto} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Gestiones" value={String(gestiones.length)} />
          <Metric label="Unidades" value={String(unidades.length)} />
          <Metric label="Usuarios" value={String(usuarios)} />
          <Metric label="Presupuesto total" value={formatMoney(resumen.tope)} />
          <Metric label="Disponible total" value={formatMoney(disponible)} />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-base font-semibold">Presupuesto por unidad</h2>
              <p className="mt-1 text-sm text-slate-500">
                {gestionActiva
                  ? `Resumen de la gestion ${gestionActiva.anio}`
                  : "No hay una gestion abierta"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="h-10 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                href="/admin/gestiones"
              >
                Gestiones
              </Link>
              <Link
                className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                href="/admin/unidades"
              >
                Administrar unidades
              </Link>
              <Link
                className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                href="/admin/departamentos"
              >
                Departamentos
              </Link>
              <Link
                className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                href="/admin/items-obligatorios"
              >
                Items obligatorios
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {unidades.length === 0 ? (
              <div className="rounded-md border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Aun no hay unidades con presupuesto para la gestion activa.
              </div>
            ) : (
              unidades.map((unidad) => {
                const tope = unidad.topes[0]?.montoTope ?? new Prisma.Decimal(0);
                const utilizado = unidad.detallesPresupuesto.reduce(
                  (total, detalle) => total.plus(detalle.subtotal),
                  new Prisma.Decimal(0),
                );
                const unidadDisponible = tope.minus(utilizado);

                return (
                  <article
                    className="rounded-md border border-slate-200 px-4 py-4"
                    key={unidad.id}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_160px] lg:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{unidad.nombre}</h3>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {unidad.activa ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {(unidad.usuarios as {nombreCompleto: string; username: string; activo: boolean}[])[0]?.nombreCompleto ?? "Sin responsable"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Usuario: {(unidad.usuarios as {nombreCompleto: string; username: string; activo: boolean}[])[0]?.username ?? "Sin usuario"}
                        </p>
                      </div>

                      <BudgetValue label="Presupuesto" value={formatMoney(tope)} />
                      <BudgetValue label="Usado" value={formatMoney(utilizado)} />
                      <BudgetValue
                        label="Disponible"
                        value={formatMoney(unidadDisponible)}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Header({ title, name }: { title: string; name: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{name}</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        <div className="flex gap-4 items-center">
          <SelectorGestionWrapper />
          <form action={logoutAction}>
            <button className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
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

function BudgetValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
