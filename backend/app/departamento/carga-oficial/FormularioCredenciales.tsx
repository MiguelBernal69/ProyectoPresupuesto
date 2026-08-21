"use client";

import { useState } from "react";

export default function FormularioCredenciales({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const [dirId, setDirId] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [actividades, setActividades] = useState<{ value: string; label: string }[]>([]);
  const [cargandoDir, setCargandoDir] = useState(false);
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opciones base obtenidas del HTML del sistema oficial
  const direcciones = [
    { value: "1 ", label: "1 .- DIRECCION CENTRAL RECTORADO" },
    { value: "2 ", label: "2 .- DIRECCION ACADEMICA VICE RECTORADO" },
    { value: "3 ", label: "3 .- FACULTAD DE CIENCIAS AGRICOLAS Y PECUARIAS" },
    { value: "4 ", label: "4 .- FACULTAD DE BIOQUIMICA Y FARMACIA" },
    { value: "5 ", label: "5 .- FACULTAD DE CIENCIAS ECONOMICAS" },
    { value: "6 ", label: "6 .- ESCUELA TECNICA SUPERIOR DE AGRONOMIA" },
    { value: "7 ", label: "7 .- FACULTAD DE ODONTOLOGIA" },
    { value: "8 ", label: "8 .- FACULTAD DE MEDICINA" },
    { value: "9 ", label: "9 .- FACULTAD DE ARQUITECTURA" },
    { value: "10", label: "10.- FACULTAD DE HUMANIDADES Y CS. DE LA EDUCACION" },
    { value: "11", label: "11.- FACULTAD DE CIENCIAS JURIDICAS" },
    { value: "12", label: "12.- FACULTAD DE CIENCIAS Y TECNOLOGIA" },
    { value: "13", label: "13.- FACULTAD POLITECNICA DEL VALLE ALTO" },
    { value: "14", label: "14.- FACULTAD DE CIENCIAS SOCIALES" },
    { value: "15", label: "15.- ESCUELA UNIVERSITARIA DE POSGRADO" },
    { value: "16", label: "16.- DONACIONES" },
    { value: "17", label: "17.- FACULTAD DE CIENCIAS VETERINARIAS" },
    { value: "18", label: "18.- Facultad de Enfermeria" },
  ];

  const handleDirChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDirId(val);
    setUserId("");
    setError(null);

    if (!val) {
      setActividades([]);
      return;
    }

    setCargandoDir(true);
    try {
      const res = await fetch(`/api/departamento/carga-oficial/actividades?dirId=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.ok && data.actividades) {
        setActividades(data.actividades);
        if (data.actividades.length === 0) {
          setError("No se encontraron actividades para este DA. (Fase 5 pendiente para AJAX real)");
        }
      }
    } catch {
      setError("Error al cargar actividades.");
    } finally {
      setCargandoDir(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirId || !userId || !password) {
      setError("Complete todos los campos.");
      return;
    }

    setCargandoLogin(true);
    setError(null);

    try {
      const res = await fetch("/api/departamento/carga-oficial/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dirId, userId, password }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        onLoginSuccess();
      } else {
        setError(data.error || "Error al iniciar sesión.");
      }
    } catch {
      setError("Error de red intentando conectar.");
    } finally {
      setCargandoLogin(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Conectar con el Sistema Oficial
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Ingrese sus credenciales de <b>planificacion.umss.edu.bo/pre2027/</b> para iniciar la carga automática.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            DA (Dirección/Facultad)
          </label>
          <select
            value={dirId}
            onChange={handleDirChange}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Seleccionar</option>
            {direcciones.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Actividad
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={!dirId || cargandoDir}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">
              {cargandoDir ? "Cargando actividades..." : "Seleccionar"}
            </option>
            {/* Opciones dummy hasta que la FASE 5 traiga el AJAX real */}
            {actividades.length === 0 && dirId && !cargandoDir ? (
              <option value="test_user_id">Actividad Test (Placeholder)</option>
            ) : (
              actividades.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            La contraseña no se guardará en la base de datos.
          </p>
        </div>

        <button
          type="submit"
          disabled={cargandoLogin || !dirId || !userId || !password}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {cargandoLogin ? "Conectando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}
