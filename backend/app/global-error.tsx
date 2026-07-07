"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught Server Error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Algo salio mal 😥</h2>
        <p className="mb-4 text-slate-600">{error.message || "Error interno del servidor"}</p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
