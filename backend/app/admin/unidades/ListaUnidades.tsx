"use client";

import { useState } from "react";
import { actualizarTopeAction, editarUnidadAction, toggleActivaUnidadAction } from "./actions";

type UnidadRow = {
  id: number;
  nombre: string;
  activa: boolean;
  username: string;
  nombreUsuario: string;
  tope: string;
  utilizado: string;
  disponible: string;
};

function formatMoney(value: string) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(value));
}

function BudgetValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function ListaUnidades({
  unidades,
  gestionActivaId,
}: {
  unidades: UnidadRow[];
  gestionActivaId: number | null;
}) {
  const [editando, setEditando] = useState<UnidadRow | null>(null);

  const cerrarModal = () => setEditando(null);

  return (
    <>
      <div className="mt-4 grid gap-3">
        {unidades.map((unidad) => (
          <article
            className="rounded-md border border-slate-200 px-4 py-4"
            key={unidad.id}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_150px_150px_150px_230px] lg:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{unidad.nombre}</h3>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                    unidad.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {unidad.activa ? "Activa" : "Inactiva"}
                  </span>
                  <div className="ml-2 flex items-center gap-1">
                    <button
                      onClick={() => setEditando(unidad)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-600"
                      title="Editar datos de unidad"
                    >
                      ✏️
                    </button>
                    <form action={toggleActivaUnidadAction}>
                      <input type="hidden" name="unidadId" value={unidad.id} />
                      <button
                        title={unidad.activa ? "Desactivar unidad" : "Activar unidad"}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-red-600"
                      >
                        {unidad.activa ? "⛔" : "✅"}
                      </button>
                    </form>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {unidad.nombreUsuario || "Sin responsable"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Usuario: {unidad.username || "-"}
                </p>
              </div>

              <BudgetValue label="Tope" value={formatMoney(unidad.tope)} />
              <BudgetValue label="Utilizado" value={formatMoney(unidad.utilizado)} />
              <BudgetValue label="Disponible" value={formatMoney(unidad.disponible)} />

              <form action={actualizarTopeAction} className="grid gap-2">
                <input name="unidadId" type="hidden" value={unidad.id} />
                <input
                  name="gestionId"
                  type="hidden"
                  value={gestionActivaId ?? ""}
                />
                <label className="grid gap-1 text-sm font-medium">
                  Modificar tope
                  <input
                    name="montoTope"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={unidad.tope}
                    className="h-10 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  />
                </label>
                <button className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                  Guardar tope
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Modificar datos de unidad
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form action={editarUnidadAction} className="px-6 pb-6 pt-4 grid gap-4">
              <input type="hidden" name="unidadId" value={editando.id} />

              <label className="grid gap-1 text-sm font-medium">
                Unidad
                <input
                  name="nombre"
                  defaultValue={editando.nombre}
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Responsable
                <input
                  name="nombreUsuario"
                  defaultValue={editando.nombreUsuario}
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Usuario
                <input
                  name="username"
                  defaultValue={editando.username}
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Nueva Contraseña
                <input
                  name="password"
                  type="password"
                  className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
                  placeholder="Dejar en blanco para no cambiar"
                  autoComplete="new-password"
                />
              </label>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-lg bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
