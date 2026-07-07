"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Ocurrio un error interno</h2>
        <p className="mb-4 text-slate-600 max-w-md mx-auto">{error.message || "Error al cargar los datos."}</p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Volver a intentar
        </button>
      </div>
    </div>
  );
}
