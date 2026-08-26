"use client";

import { useState, useMemo } from "react";
import { editarDetalleAction, eliminarDetalleAction } from "./actions";

type DetalleRow = {
  id: number;
  itemCodigo: string;
  itemNombre: string;
  objetoCodigo: string;
  objetoDescripcion: string;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
};

function formatMoney(valor: string) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(Number(valor));
}

export default function TablaConAcciones({ detalles, soloLectura = false }: { detalles: DetalleRow[]; soloLectura?: boolean }) {
  const [editando, setEditando] = useState<DetalleRow | null>(null);
  const [vista, setVista] = useState<"lista" | "agrupada">("lista");

  const cerrarModal = () => setEditando(null);

  const groupedData = useMemo(() => {
    const groups = new Map<string, {
      objetoCodigo: string;
      objetoDescripcion: string;
      total: number;
    }>();

    for (const d of detalles) {
      const current = groups.get(d.objetoCodigo) || {
        objetoCodigo: d.objetoCodigo,
        objetoDescripcion: d.objetoDescripcion,
        total: 0,
      };
      current.total += Number(d.subtotal);
      groups.set(d.objetoCodigo, current);
    }
    
    return Array.from(groups.values()).sort((a, b) => a.objetoCodigo.localeCompare(b.objetoCodigo));
  }, [detalles]);

  return (
    <>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setVista("lista")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            vista === "lista"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Vista Detallada
        </button>
        <button
          onClick={() => setVista("agrupada")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            vista === "agrupada"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Agrupado por Objeto
        </button>
      </div>
      {/* ── Tablas ─────────────────────────────────────────────── */}
      {vista === "lista" ? (
        <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">NRO</th>
              <th className="px-3 py-2 font-medium">OBJETO</th>
              <th className="px-3 py-2 font-medium">OBJETO DESCRIPCIÓN</th>
              <th className="px-3 py-2 font-medium">ÍTEM</th>
              <th className="px-3 py-2 text-right font-medium">CANTIDAD</th>
              <th className="px-3 py-2 text-right font-medium">PRECIO UNIT.</th>
              <th className="px-3 py-2 font-medium">MONTO</th>
              {!soloLectura && <th className="px-3 py-2 text-center font-medium">ACCIONES</th>}
            </tr>
          </thead>
          <tbody>
            {detalles.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400" colSpan={8}>
                  Todavía no hay ítems en tu lista.
                </td>
              </tr>
            ) : (
              detalles.map((d, index) => (
                <tr className="border-t border-slate-200 hover:bg-slate-50" key={d.id}>
                  <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-3">{d.objetoCodigo}</td>
                  <td className="px-3 py-3">{d.objetoDescripcion}</td>
                  <td className="px-3 py-3">
                    <span className="font-medium">{d.itemCodigo}</span>
                    <span className="text-slate-500"> - {d.itemNombre}</span>
                  </td>
                  <td className="px-3 py-3 text-right">{d.cantidad}</td>
                  <td className="px-3 py-3 text-right">{formatMoney(d.precioUnitario)}</td>
                  <td className="px-3 py-3 text-right font-medium">{formatMoney(d.subtotal)}</td>
                  {!soloLectura && (
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Editar */}
                        <button
                          type="button"
                          title="Editar ítem"
                          onClick={() => setEditando(d)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          ✏️
                        </button>

                        {/* Eliminar */}
                        <form
                          action={eliminarDetalleAction}
                          onSubmit={(e) => {
                            if (!confirm("¿Seguro que deseas eliminar este ítem del presupuesto?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="detalleId" value={d.id} />
                          <button
                            type="submit"
                            title="Eliminar ítem"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          >
                            🗑️
                          </button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium w-10 text-center">NRO</th>
                <th className="px-3 py-2 font-medium">OBJETO</th>
                <th className="px-3 py-2 font-medium">DESCRIPCIÓN</th>
                <th className="px-3 py-2 text-right font-medium">MONTO TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-400" colSpan={4}>
                    Todavía no hay ítems en tu lista.
                  </td>
                </tr>
              ) : (
                groupedData.map((g, index) => (
                  <tr className="border-t border-slate-200 hover:bg-slate-50" key={g.objetoCodigo}>
                    <td className="px-3 py-3 text-center text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 font-medium">{g.objetoCodigo}</td>
                    <td className="px-3 py-3">{g.objetoDescripcion}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatMoney(g.total.toString())}</td>
                  </tr>
                ))
              )}
            </tbody>
            {groupedData.length > 0 && (
              <tfoot className="bg-slate-50">
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="px-3 py-3 text-right font-medium text-slate-500">TOTAL PRESUPUESTO</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(groupedData.reduce((acc, g) => acc + g.total, 0).toString())}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Modal de edición ───────────────────────────────────── */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header del modal */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Modificar ítem</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Ajusta la cantidad o el precio unitario.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Info del ítem (no editable) */}
            <div className="mx-6 mt-4 rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {editando.objetoCodigo} — {editando.objetoDescripcion}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {editando.itemCodigo} — {editando.itemNombre}
              </p>
            </div>

            {/* Formulario */}
            <form action={editarDetalleAction} className="px-6 pb-6 pt-4">
              <input type="hidden" name="detalleId" value={editando.id} />

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Cantidad</span>
                  <input
                    name="cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editando.cantidad}
                    className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Precio unitario</span>
                  <input
                    name="precioUnitario"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editando.precioUnitario}
                    className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Monto actual: {formatMoney(editando.subtotal)}
              </p>

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
