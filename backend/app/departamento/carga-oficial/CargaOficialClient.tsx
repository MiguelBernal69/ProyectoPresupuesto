"use client";

import { useState } from "react";
import FormularioCredenciales from "./FormularioCredenciales";

type RegistroClient = {
  id: number;
  itemCodigo: string;
  itemNombre: string;
  objetoCodigo: string;
  objetoNombre: string;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
  estado: string;
  mensajeError: string | null;
  idExterno: string | null;
  intento: number;
  fechaCarga: string | null;
};

type Props = {
  registrosIniciales: RegistroClient[];
  isLoggedIn: boolean;
  departamentoId: number;
  gestionId: number;
};

export default function CargaOficialClient({
  registrosIniciales,
  isLoggedIn: isLoggedInicial,
}: Props) {
  const [registros, setRegistros] = useState<RegistroClient[]>(registrosIniciales);
  const [isLoggedIn, setIsLoggedIn] = useState(isLoggedInicial);
  const [cargando, setCargando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Estadísticas
  const total = registros.length;
  const exitosos = registros.filter((r) => r.estado === "EXITOSO").length;
  const errores = registros.filter((r) => r.estado === "ERROR").length;
  const pendientes = registros.filter((r) => r.estado === "PENDIENTE").length;
  const omitidos = registros.filter((r) => r.estado === "OMITIDO").length;

  const iniciarCarga = async () => {
    setCargando(true);
    setPausado(false);
    setErrorGlobal(null);

    const pendientesList = registros.filter((r) => r.estado === "PENDIENTE");

    for (let i = 0; i < pendientesList.length; i++) {
      // Verificar si se pausó la carga
      if (pausado) break;

      const reg = pendientesList[i];

      // Marcar visualmente como cargando
      setRegistros((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, estado: "CARGANDO" } : r))
      );

      try {
        const res = await fetch("/api/departamento/carga-oficial/cargar-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registroId: reg.id }),
        });

        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
          setErrorGlobal(data.error || "Sesión expirada o intervención requerida.");
          setIsLoggedIn(false);
          setRegistros((prev) =>
            prev.map((r) => (r.id === reg.id ? { ...r, estado: "PENDIENTE" } : r))
          );
          break; // Detener todo
        }

        setRegistros((prev) =>
          prev.map((r) =>
            r.id === reg.id
              ? {
                  ...r,
                  estado: data.estado,
                  mensajeError: data.error || null,
                  idExterno: data.idExterno || null,
                }
              : r
          )
        );
      } catch (err) {
        console.error("Error al cargar ítem:", err);
        setRegistros((prev) =>
          prev.map((r) =>
            r.id === reg.id
              ? { ...r, estado: "ERROR", mensajeError: "Error de red local" }
              : r
          )
        );
      }

      // Pequeña pausa entre peticiones para no saturar
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCargando(false);
  };

  const resetearItem = async (id: number) => {
    const res = await fetch("/api/departamento/carga-oficial/resetear-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registroId: id }),
    });
    if (res.ok) {
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, estado: "PENDIENTE", mensajeError: null, idExterno: null, fechaCarga: null }
            : r
        )
      );
    }
  };

  const resetearTodos = async () => {
    const noExitosos = registros.filter((r) => r.estado !== "CARGANDO");
    for (const reg of noExitosos) {
      await resetearItem(reg.id);
    }
  };

  const cargarItemIndividual = async (reg: RegistroClient) => {
    if (!isLoggedIn) {
      setErrorGlobal("No hay sesión activa. Por favor inicie sesión primero.");
      return;
    }

    // Marcar como cargando en UI
    setRegistros((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, estado: "CARGANDO" } : r))
    );

    try {
      const res = await fetch("/api/departamento/carga-oficial/cargar-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroId: reg.id, forzar: true }),
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        setErrorGlobal(data.error || "Sesión expirada.");
        setIsLoggedIn(false);
        setRegistros((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, estado: "PENDIENTE" } : r))
        );
        return;
      }

      setRegistros((prev) =>
        prev.map((r) =>
          r.id === reg.id
            ? { ...r, estado: data.estado, mensajeError: data.error || null, idExterno: data.idExterno || null }
            : r
        )
      );
    } catch {
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === reg.id ? { ...r, estado: "ERROR", mensajeError: "Error de red local" } : r
        )
      );
    }
  };

  const formatearMoneda = (val: string) => {
    return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(
      Number(val)
    );
  };

  return (
    <div className="space-y-6">
      {/* Credenciales */}
      {!isLoggedIn ? (
        <FormularioCredenciales onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="font-medium text-emerald-800">
              Sesión activa con el sistema oficial
            </p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/departamento/carga-oficial/sesion", { method: "DELETE" });
              setIsLoggedIn(false);
            }}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {errorGlobal && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Carga detenida</p>
          <p>{errorGlobal}</p>
        </div>
      )}

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Total Ítems</p>
          <p className="text-xl font-bold">{total}</p>
        </div>
        <div className="rounded-lg border bg-emerald-50 p-4 text-center shadow-sm">
          <p className="text-xs text-emerald-600">Exitosos</p>
          <p className="text-xl font-bold text-emerald-700">{exitosos}</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-4 text-center shadow-sm">
          <p className="text-xs text-red-600">Errores</p>
          <p className="text-xl font-bold text-red-700">{errores}</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Pendientes</p>
          <p className="text-xl font-bold text-slate-700">{pendientes}</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Omitidos</p>
          <p className="text-xl font-bold text-slate-700">{omitidos}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <button
          disabled={!isLoggedIn || cargando || pendientes === 0}
          onClick={iniciarCarga}
          className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {cargando ? "Cargando..." : "Iniciar Carga"}
        </button>
        {cargando && (
          <button
            onClick={() => setPausado(true)}
            className="rounded-md border border-slate-300 px-6 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Pausar
          </button>
        )}
        {!cargando && isLoggedIn && (
          <button
            onClick={resetearTodos}
            disabled={cargando}
            className="rounded-md border border-amber-300 bg-amber-50 px-6 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            ↺ Reiniciar todos
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Objeto</th>
                <th className="px-4 py-3">Ítem</th>
                <th className="px-4 py-3 text-right">Cant.</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {registros.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold block">{reg.objetoCodigo}</span>
                    <span className="text-xs text-slate-500 line-clamp-1" title={reg.objetoNombre}>
                      {reg.objetoNombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold block">{reg.itemCodigo}</span>
                    <span className="text-xs text-slate-500 line-clamp-1" title={reg.itemNombre}>
                      {reg.itemNombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{reg.cantidad}</td>
                  <td className="px-4 py-3 text-right">{formatearMoneda(reg.precioUnitario)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatearMoneda(reg.subtotal)}</td>
                  <td className="px-4 py-3 text-center">
                    {reg.estado === "PENDIENTE" && <span className="text-slate-500">○ Pendiente</span>}
                    {reg.estado === "CARGANDO" && <span className="text-blue-600 animate-pulse">↻ Cargando</span>}
                    {reg.estado === "EXITOSO" && <span className="text-emerald-600 font-medium">✓ Exitoso</span>}
                    {reg.estado === "ERROR" && (
                      <span className="text-red-600 font-medium cursor-help" title={reg.mensajeError || "Error"}>
                        ✗ Error
                      </span>
                    )}
                    {reg.estado === "OMITIDO" && <span className="text-amber-600">⚠ Omitido</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reg.estado !== "CARGANDO" && (
                      <div className="flex items-center justify-center gap-1">
                        {/* Subir individualmente */}
                        {isLoggedIn && (
                          <button
                            onClick={() => cargarItemIndividual(reg)}
                            title="Subir este ítem al sistema oficial"
                            className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent hover:border-emerald-200 transition-colors"
                          >
                            ▶
                          </button>
                        )}
                        {/* Reiniciar a Pendiente */}
                        {isLoggedIn && (
                          <button
                            onClick={() => resetearItem(reg.id)}
                            title="Reiniciar a Pendiente"
                            className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-amber-50 hover:text-amber-700 border border-transparent hover:border-amber-200 transition-colors"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    )}
                    {reg.estado === "CARGANDO" && (
                      <span className="text-xs text-slate-400">...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
