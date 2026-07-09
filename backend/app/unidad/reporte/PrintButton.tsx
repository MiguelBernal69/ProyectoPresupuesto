"use client";

type PrintButtonProps = {
  label: string;
  view: "detallada" | "agrupada";
};

export default function PrintButton({ label, view }: PrintButtonProps) {
  const handlePrint = () => {
    const clearPrintView = () => {
      delete document.documentElement.dataset.printView;
    };

    document.documentElement.dataset.printView = view;
    window.addEventListener("afterprint", clearPrintView, { once: true });
    window.print();
  };

  return (
    <button
      className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 print:hidden"
      onClick={handlePrint}
      type="button"
    >
      {label}
    </button>
  );
}
