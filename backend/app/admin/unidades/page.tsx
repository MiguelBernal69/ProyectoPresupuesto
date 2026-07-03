import Link from "next/link";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { actualizarTopeAction, crearUnidadAction } from "./actions";

export const dynamic = "force-dynamic";

type UnidadesPageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function AdminUnidadesPage({
  searchParams,
}: UnidadesPageProps) {
  const user = await requireRole("ADMIN");
  const params = await searchParams;

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  const unidades = gestionActiva
    ? await prisma.unidad.findMany({
        orderBy: { nombre: "asc" },
        include: {
          usuarios: {
            select: {
              id: true,
              username: true,
              nombreCompleto: true,
              activo: true,
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
    : [];

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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {user.nombreCompleto}
              </p>
              <h1 className="text-2xl font-semibold">Unidades y topes</h1>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
              <BudgetSummaryCard label="Tope" value={formatMoney(resumen.tope)} />
              <BudgetSummaryCard
                label="Utilizado"
                value={formatMoney(resumen.utilizado)}
              />
              <BudgetSummaryCard
                label="Disponible"
                value={formatMoney(disponible)}
              />
              <Link
                className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                href="/admin"
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
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-base font-semibold">Nueva unidad</h2>
              <p className="mt-1 text-sm text-slate-500">
                Se crea la unidad, su usuario y el tope para la gestion activa.
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
              {gestionActiva ? `Gestion ${gestionActiva.anio}` : "Sin gestion abierta"}
            </span>
          </div>

          {params?.created ? (
            <Alert tone="success" message="Unidad creada correctamente." />
          ) : null}

          {params?.updated ? (
            <Alert tone="success" message="Tope actualizado correctamente." />
          ) : null}

          {params?.error ? (
            <Alert tone="error" message={decodeURIComponent(params.error)} />
          ) : null}

          <form
            action={crearUnidadAction}
            className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_180px]"
          >
            <input
              name="gestionId"
              type="hidden"
              value={gestionActiva?.id ?? ""}
            />

            <label className="grid gap-1 text-sm font-medium">
              Unidad
              <input
                name="nombre"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="Recursos Humanos"
                disabled={!gestionActiva}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Responsable
              <input
                name="nombreUsuario"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="Usuario RRHH"
                disabled={!gestionActiva}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Usuario
              <input
                name="username"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="unidad.rrhh"
                autoComplete="off"
                disabled={!gestionActiva}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Contrasena
              <input
                name="password"
                type="password"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="Minimo 6"
                autoComplete="new-password"
                disabled={!gestionActiva}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Tope
              <input
                name="montoTope"
                type="number"
                min="0.01"
                step="0.01"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="100000"
                disabled={!gestionActiva}
              />
            </label>

            <button
              className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 lg:col-start-5"
              disabled={!gestionActiva}
            >
              Crear unidad
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Lista de unidades</h2>
              <p className="text-sm text-slate-500">
                {unidades.length} unidades con presupuesto de la gestion activa
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {unidades.map((unidad) => {
              const tope = unidad.topes[0]?.montoTope ?? new Prisma.Decimal(0);
              const utilizado = unidad.detallesPresupuesto.reduce(
                (total, detalle) => total.plus(detalle.subtotal),
                new Prisma.Decimal(0),
              );
              const disponible = tope.minus(utilizado);

              return (
                <article
                  className="rounded-md border border-slate-200 px-4 py-4"
                  key={unidad.id}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_150px_150px_150px_230px] lg:items-end">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{unidad.nombre}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {unidad.activa ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {unidad.usuarios[0]?.nombreCompleto ?? "Sin responsable"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Usuario: {unidad.usuarios[0]?.username ?? "-"}
                      </p>
                    </div>

                    <BudgetValue label="Tope" value={formatMoney(tope)} />
                    <BudgetValue label="Utilizado" value={formatMoney(utilizado)} />
                    <BudgetValue label="Disponible" value={formatMoney(disponible)} />

                    <form action={actualizarTopeAction} className="grid gap-2">
                      <input name="unidadId" type="hidden" value={unidad.id} />
                      <input
                        name="gestionId"
                        type="hidden"
                        value={gestionActiva?.id ?? ""}
                      />
                      <label className="grid gap-1 text-sm font-medium">
                        Modificar tope
                        <input
                          name="montoTope"
                          type="number"
                          min="0.01"
                          step="0.01"
                          defaultValue={tope.toString()}
                          className="h-10 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                        />
                      </label>
                      <button className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                        Guardar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function Alert({ tone, message }: { tone: "success" | "error"; message: string }) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${styles}`}>
      {message}
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

function BudgetSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
