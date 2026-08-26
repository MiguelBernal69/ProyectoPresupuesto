type AlertProps = {
  tone: "success" | "error" | "warning";
  message: string;
};

export default function Alert({ tone, message }: AlertProps) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {message}
    </div>
  );
}
