"use client";

export default function PrintButton() {
  return (
    <button
      className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 print:hidden"
      onClick={() => window.print()}
      type="button"
    >
      Imprimir
    </button>
  );
}
