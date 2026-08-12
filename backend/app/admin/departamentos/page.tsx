import Link from "next/link";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import {
  crearDepartamentoAction,
  editarDepartamentoAction,
  toggleActivaDepartamentoAction,
  asignarUnidadDepartamentoAction,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function AdminDepartamentosPage({ searchParams }: PageProps) {
  const user = await requireRole("ADMIN");
  const params = await searchParams;

  const [departamentos, unidades] = await Promise.all([
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      include: {
        usuarios: { select: { username: true, nombreCompleto: true } },
        unidades: { select: { id: true, nombre: true } },
      },
    }),
    prisma.unidad.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, departamentoId: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{user.nombreCompleto}</p>
            <h1 className="text-2xl font-semibold">Departamentos</h1>
          </div>
          <div className="flex gap-2">
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
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        {/* Crear nuevo departamento */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Nuevo Departamento</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea un departamento con su usuario responsable para gestionar múltiples unidades.
          </p>

          {params?.created && <Alert tone="success" message="Departamento creado correctamente." />}
          {params?.updated && <Alert tone="success" message="Departamento actualizado correctamente." />}
          {params?.error && <Alert tone="error" message={decodeURIComponent(params.error)} />}

          <form
            action={crearDepartamentoAction}
            className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_160px]"
          >
            <label className="grid gap-1 text-sm font-medium">
              Departamento
              <input
                name="nombre"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="Ej: Administración"
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
                placeholder="dpto.admin"
                autoComplete="off"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Contraseña
              <input
                name="password"
                type="password"
                className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 lg:col-start-5"
            >
              Crear
            </button>
          </form>
        </section>

        {/* Lista de departamentos */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">Lista de Departamentos ({departamentos.length})</h2>

          {departamentos.length === 0 ? (
            <div className="rounded-md border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No hay departamentos registrados aún.
            </div>
          ) : (
            <div className="grid gap-4">
              {departamentos.map((dept) => {
                const usuario = dept.usuarios[0];
                return (
                  <details
                    key={dept.id}
                    className="rounded-md border border-slate-200"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dept.nombre}</span>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${dept.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {dept.activa ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {usuario?.nombreCompleto ?? "Sin responsable"} · {dept.unidades.length} unidad(es)
                        </p>
                      </div>
                      <span className="text-sm text-slate-400">▼</span>
                    </summary>

                    <div className="border-t border-slate-100 px-4 py-4">
                      {/* Editar departamento */}
                      <form action={editarDepartamentoAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <input type="hidden" name="departamentoId" value={dept.id} />
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Nombre
                          <input
                            name="nombre"
                            defaultValue={dept.nombre}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-slate-900"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Responsable
                          <input
                            name="nombreUsuario"
                            defaultValue={usuario?.nombreCompleto ?? ""}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-slate-900"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Usuario
                          <input
                            name="username"
                            defaultValue={usuario?.username ?? ""}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-slate-900"
                            autoComplete="off"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Nueva contraseña (opcional)
                          <input
                            name="password"
                            type="password"
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-slate-900"
                            placeholder="Dejar vacío para no cambiar"
                            autoComplete="new-password"
                          />
                        </label>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Guardar
                          </button>
                        </div>
                      </form>

                      {/* Asignar/quitar unidades */}
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unidades asignadas a este departamento
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {unidades.map((u) => {
                            const asignada = u.departamentoId === dept.id;
                            const deOtroDpto = u.departamentoId !== null && u.departamentoId !== dept.id;
                            return (
                              <form key={u.id} action={asignarUnidadDepartamentoAction}>
                                <input type="hidden" name="departamentoId" value={dept.id} />
                                <input type="hidden" name="unidadId" value={u.id} />
                                <input type="hidden" name="accion" value={asignada ? "quitar" : "asignar"} />
                                <button
                                  type="submit"
                                  disabled={deOtroDpto}
                                  title={deOtroDpto ? "Pertenece a otro departamento" : undefined}
                                  className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium text-left ${
                                    asignada
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : deOtroDpto
                                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {asignada ? "✓ " : deOtroDpto ? "⊘ " : "+ "}{u.nombre}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </div>

                      {/* Toggle activo */}
                      <div className="mt-3 flex justify-end">
                        <form action={toggleActivaDepartamentoAction}>
                          <input type="hidden" name="departamentoId" value={dept.id} />
                          <button
                            type="submit"
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                              dept.activa
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {dept.activa ? "Desactivar departamento" : "Activar departamento"}
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
