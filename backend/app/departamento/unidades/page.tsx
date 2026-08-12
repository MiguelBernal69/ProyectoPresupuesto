import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import {
  crearUnidadDepartamentoAction,
  editarUnidadDepartamentoAction,
  actualizarTopeDepartamentoAction,
  toggleActivaUnidadDepartamentoAction,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function DepartamentoUnidadesPage({ searchParams }: PageProps) {
  const user = await requireRole("DEPARTAMENTO");
  const params = await searchParams;

  if (!user.departamentoId) {
    notFound();
  }

  const [departamento, gestionActiva] = await Promise.all([
    prisma.departamento.findUnique({
      where: { id: user.departamentoId },
      include: {
        unidades: {
          orderBy: { nombre: "asc" },
          include: {
            usuarios: { select: { username: true, nombreCompleto: true, activo: true } },
            topes: true,
            detallesPresupuesto: { select: { subtotal: true, gestionId: true } },
          },
        },
      },
    }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
  ]);

  if (!departamento) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-2xl font-semibold">Gestionar Unidades — {departamento.nombre}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              href="/departamento"
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

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        {/* Crear nueva unidad */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Nueva Unidad</h2>
          <p className="mt-1 text-sm text-slate-500">
            Se creará la unidad, su usuario y el tope para la gestión activa, y se asignará automáticamente a {departamento.nombre}.
          </p>

          {params?.created && <Alert tone="success" message="Unidad creada y asignada al departamento." />}
          {params?.updated && <Alert tone="success" message="Unidad actualizada correctamente." />}
          {params?.error && <Alert tone="error" message={decodeURIComponent(params.error)} />}

          {!gestionActiva ? (
            <p className="mt-4 text-sm text-amber-600">⚠️ No hay gestión abierta. No se pueden crear unidades.</p>
          ) : (
            <form
              action={crearUnidadDepartamentoAction}
              className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_160px]"
            >
              <label className="grid gap-1 text-sm font-medium">
                Nombre de la unidad
                <input
                  name="nombre"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="Ej: Contabilidad"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Responsable
                <input
                  name="nombreUsuario"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="Nombre completo"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Usuario
                <input
                  name="username"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="unidad.contab"
                  autoComplete="off"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Contraseña
                <input
                  name="password"
                  type="password"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="Mínimo 6"
                  autoComplete="new-password"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Tope presupuestario
                <input
                  name="montoTope"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="100000"
                />
              </label>
              <button
                type="submit"
                className="h-11 self-end rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Crear
              </button>
            </form>
          )}
        </section>

        {/* Lista de unidades */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">
            Unidades del departamento ({departamento.unidades.length})
          </h2>

          {departamento.unidades.length === 0 ? (
            <div className="rounded-md border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay unidades asignadas a este departamento.
            </div>
          ) : (
            <div className="grid gap-4">
              {departamento.unidades.map((unidad) => {
                const usuario = unidad.usuarios[0];
                const tope = unidad.topes.find((t) => t.gestionId === gestionActiva?.id);
                const utilizado = unidad.detallesPresupuesto
                  .filter((d) => d.gestionId === gestionActiva?.id)
                  .reduce((s, d) => s.plus(d.subtotal), new Prisma.Decimal(0));
                const disponible = (tope?.montoTope ?? new Prisma.Decimal(0)).minus(utilizado);

                return (
                  <details key={unidad.id} className="rounded-md border border-slate-200">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{unidad.nombre}</span>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${unidad.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {unidad.activa ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {usuario?.nombreCompleto ?? "Sin responsable"} · @{usuario?.username ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-slate-500">Tope</p>
                          <p className="text-sm font-semibold">{formatMoney(tope?.montoTope ?? 0)}</p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-emerald-600">Disponible</p>
                          <p className="text-sm font-semibold text-emerald-800">{formatMoney(disponible)}</p>
                        </div>
                        <Link
                          href={`/departamento/unidades/${unidad.id}`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          Ver lista
                        </Link>
                        <span className="text-sm text-slate-400">▼</span>
                      </div>
                    </summary>

                    <div className="border-t border-slate-100 px-4 py-4">
                      {/* Editar unidad */}
                      <form action={editarUnidadDepartamentoAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <input type="hidden" name="unidadId" value={unidad.id} />
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Nombre
                          <input
                            name="nombre"
                            defaultValue={unidad.nombre}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Responsable
                          <input
                            name="nombreUsuario"
                            defaultValue={usuario?.nombreCompleto ?? ""}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Usuario
                          <input
                            name="username"
                            defaultValue={usuario?.username ?? ""}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Nueva contraseña (opcional)
                          <input
                            name="password"
                            type="password"
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                            placeholder="Dejar vacío para no cambiar"
                          />
                        </label>
                        <div className="flex items-end">
                          <button type="submit" className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                            Guardar
                          </button>
                        </div>
                      </form>

                      {/* Actualizar tope */}
                      {gestionActiva && (
                        <form action={actualizarTopeDepartamentoAction} className="mt-3 flex items-end gap-3">
                          <input type="hidden" name="unidadId" value={unidad.id} />
                          <input type="hidden" name="gestionId" value={gestionActiva.id} />
                          <label className="grid gap-1 text-xs font-medium text-slate-600">
                            Tope gestión {gestionActiva.anio}
                            <input
                              name="montoTope"
                              type="number"
                              min="0.01"
                              step="0.01"
                              defaultValue={tope?.montoTope?.toString() ?? ""}
                              className="h-9 w-44 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                            />
                          </label>
                          <button type="submit" className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                            Actualizar tope
                          </button>
                        </form>
                      )}

                      {/* Toggle activo */}
                      <div className="mt-3 flex justify-end">
                        <form action={toggleActivaUnidadDepartamentoAction}>
                          <input type="hidden" name="unidadId" value={unidad.id} />
                          <button
                            type="submit"
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                              unidad.activa
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {unidad.activa ? "Desactivar unidad" : "Activar unidad"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
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
    <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${styles}`}>{message}</div>
  );
}

function formatMoney(value: { toString(): string } | number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value.toString()));
}
