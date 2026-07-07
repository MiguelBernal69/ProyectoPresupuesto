"use client";

import { useState, useMemo } from "react";

type Item = {
  codigo: string;
  nombre: string;
  objetoCodigo: string;
  objeto: { descripcion: string };
};

type Props = {
  items: Item[];
  obligatorioCodigos: string[];
  gestionId: number | undefined;
  unidadId: number | undefined;
};

const PAGE_SIZE = 100;

export default function ItemsSelector({
  items,
  obligatorioCodigos,
  gestionId,
  unidadId,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(obligatorioCodigos),
  );
  const [pagina, setPagina] = useState(1);

  const itemsFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return items;
    return items.filter(
      (item) =>
        item.codigo.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto) ||
        item.objetoCodigo.toLowerCase().includes(texto) ||
        item.objeto.descripcion.toLowerCase().includes(texto),
    );
  }, [busqueda, items]);

  // Resetear a página 1 cuando cambia la búsqueda
  const handleBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPagina(1);
  };

  const totalPaginas = Math.max(1, Math.ceil(itemsFiltrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const itemsPagina = itemsFiltrados.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE,
  );

  const toggleItem = (codigo: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const seleccionadosCount = seleccionados.size;

  return (
    <form action="/api/admin/items-obligatorios" method="post" className="mt-5 flex flex-col gap-4">
      <input type="hidden" name="gestionId" value={gestionId ?? ""} />
      <input type="hidden" name="unidadId" value={unidadId ?? ""} />

      {/* Hidden inputs para los seleccionados */}
      {Array.from(seleccionados).map((codigo) => (
        <input key={codigo} type="hidden" name="itemCodigo" value={codigo} />
      ))}

      {/* Barra de búsqueda + contador */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por código, nombre o partida..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <span className="whitespace-nowrap text-sm text-slate-500">
          {seleccionadosCount} seleccionado{seleccionadosCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Info de resultados / paginación */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {busqueda
            ? `${itemsFiltrados.length} resultado${itemsFiltrados.length !== 1 ? "s" : ""} · `
            : ""}
          Mostrando {(paginaActual - 1) * PAGE_SIZE + 1}–
          {Math.min(paginaActual * PAGE_SIZE, itemsFiltrados.length)} de {itemsFiltrados.length}
        </span>
        {totalPaginas > 1 && (
          <span>
            Página {paginaActual} de {totalPaginas}
          </span>
        )}
      </div>

      {/* Lista de ítems */}
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
        {itemsPagina.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No se encontraron ítems con esa búsqueda.
          </p>
        ) : (
          itemsPagina.map((item) => {
            const marcado = seleccionados.has(item.codigo);
            return (
              <label
                key={item.codigo}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                  marcado
                    ? "border-slate-400 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => toggleItem(item.codigo)}
                  className="mt-1 h-4 w-4 accent-slate-900"
                />
                <span>
                  <span className="font-medium">
                    {item.codigo} - {item.nombre}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {item.objetoCodigo} - {item.objeto.descripcion}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* Controles de paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="h-8 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>

          {/* Números de página (máx 7 visibles) */}
          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter((n) => {
              if (totalPaginas <= 7) return true;
              return (
                n === 1 ||
                n === totalPaginas ||
                (n >= paginaActual - 2 && n <= paginaActual + 2)
              );
            })
            .reduce<(number | "…")[]>((acc, n, i, arr) => {
              if (i > 0 && (arr[i - 1] as number) + 1 < n) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPagina(n as number)}
                  className={`h-8 min-w-[2rem] rounded-md border px-2 text-sm font-medium ${
                    paginaActual === n
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ),
            )}

          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="h-8 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      <button
        type="submit"
        className="mt-1 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Guardar ítems obligatorios
      </button>
    </form>
  );
}
