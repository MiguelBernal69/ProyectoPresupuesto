"use client";

import { useState, useEffect, useTransition } from "react";
import { buscarItemsServerAction, agregarDetalleAction } from "./actions";

type Item = {
  codigo: string;
  nombre: string;
  objetoCodigo: string;
  objeto: { descripcion: string };
};

type BuscadorProps = {
  gestionId: number;
  gestionAnio: number;
  itemsObligatorios: {
    itemCodigo: string;
    item: Item;
  }[];
  codigosRegistrados: string[];
};

export default function BuscadorYAgregar({
  gestionId,
  gestionAnio,
  itemsObligatorios,
  codigosRegistrados,
}: BuscadorProps) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isPending, startTransition] = useTransition();

  const codigosSet = new Set(codigosRegistrados);
  const obligatoriosPendientes = itemsObligatorios.filter(
    (o) => !codigosSet.has(o.itemCodigo)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await buscarItemsServerAction(query);
          setResultados(res);
        } catch (e) {
          console.error(e);
        }
      });
    }, 250); // Debounce de 250ms
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid gap-6">
      {/* Bloque de ítems obligatorios */}
      {itemsObligatorios.length > 0 && (
        <details
          className={`group rounded-lg border p-5 ${
            obligatoriosPendientes.length === 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
          open={obligatoriosPendientes.length > 0}
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 outline-none [&::-webkit-details-marker]:hidden">
            <span className="mt-0.5 text-lg">
              {obligatoriosPendientes.length === 0 ? "✅" : "⚠️"}
            </span>
            <div className="flex-1">
              <h2
                className={`text-sm font-semibold ${
                  obligatoriosPendientes.length === 0
                    ? "text-emerald-800"
                    : "text-amber-800"
                }`}
              >
                Ítems obligatorios — Gestión {gestionAnio}
              </h2>
              {obligatoriosPendientes.length === 0 ? (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Todos los ítems obligatorios ya están registrados. Haz clic para ver detalles.
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-amber-700">
                  El administrador requiere que registres estos ítems. Haz clic en cualquiera para seleccionarlo.
                </p>
              )}
            </div>
            <div className="mt-0.5 text-slate-400 transition-transform group-open:rotate-180">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </summary>

          <div className="mt-4 border-t border-black/5 pt-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {itemsObligatorios.map((o) => {
                const completado = codigosSet.has(o.itemCodigo);
                return (
                  <li key={o.itemCodigo}>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(o.item)}
                      className={`flex w-full text-left items-start gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        completado
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50 hover:border-amber-300"
                      } ${selectedItem?.codigo === o.itemCodigo ? "ring-2 ring-slate-950" : ""}`}
                    >
                      <span className="mt-0.5 shrink-0">{completado ? "✅" : "🔲"}</span>
                      <span>
                        <span className="font-medium block">
                          {o.itemCodigo} — {o.item.nombre}
                        </span>
                        <span className="block mt-0.5 text-amber-700/80">
                          {o.item.objetoCodigo} — {o.item.objeto.descripcion}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {obligatoriosPendientes.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-amber-800">
                Faltan {obligatoriosPendientes.length} de {itemsObligatorios.length} ítems
                obligatorios.
              </p>
            )}
          </div>
        </details>
      )}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Panel izquierdo: Buscar */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Buscar ítem</h2>
        <p className="mt-1 text-sm text-slate-500">
          Busca por código, descripción, objeto o nombre.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
            placeholder="Ej. courier, 211, comunicaciones"
          />
        </div>

        <div className="mt-4 grid gap-2">
          {isPending ? (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500 animate-pulse">
              Buscando...
            </p>
          ) : query && resultados.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
              No se encontraron ítems.
            </p>
          ) : (
            <div className="max-h-[350px] overflow-y-auto grid gap-2 pr-1">
              {resultados.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`text-left rounded-md border px-3 py-3 text-sm hover:bg-slate-50 ${
                    item.codigo === selectedItem?.codigo
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200"
                  }`}
                >
                  <p className="font-medium">
                    {item.codigo} — {item.nombre}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {item.objetoCodigo} — {item.objeto.descripcion}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: Agregar */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Agregar a mi presupuesto</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona un ítem y registra cantidad y precio unitario.
        </p>

        {selectedItem ? (
          <div className="mt-4 rounded-md bg-slate-50 p-4">
            <p className="text-sm font-medium">
              {selectedItem.objetoCodigo} — {selectedItem.objeto.descripcion}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedItem.codigo} — {selectedItem.nombre}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-500">
            Elige un ítem de la lista de búsqueda para habilitar el formulario.
          </div>
        )}

        <form action={agregarDetalleAction} className="mt-5 grid gap-4 sm:grid-cols-3">
          <input name="gestionId" type="hidden" value={gestionId} />
          <input name="itemCodigo" type="hidden" value={selectedItem?.codigo ?? ""} />

          <label className="grid gap-1 text-sm font-medium">
            Cantidad
            <input
              name="cantidad"
              type="number"
              min="0.01"
              step="0.01"
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
              placeholder="Ej: 12"
              disabled={!selectedItem}
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Precio unitario
            <input
              name="precioUnitario"
              type="number"
              min="0.01"
              step="0.01"
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
              placeholder="Ej: 30.00"
              disabled={!selectedItem}
              required
            />
          </label>

          <button
            className="mt-6 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={!selectedItem}
          >
            Guardar ítem
          </button>
        </form>
      </div>
      </section>
    </div>
  );
}
