import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { listarDetallesPresupuestoOrdenados } from "@/lib/services/presupuesto";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET() {
  const user = await requireRole("UNIDAD");

  if (!user.unidadId) {
    notFound();
  }

  const gestionActiva = await prisma.gestion.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { anio: "desc" },
  });

  const unidad = await prisma.unidad.findUnique({
    where: { id: user.unidadId },
  });

  if (!gestionActiva || !unidad) {
    notFound();
  }

  const detalles = await listarDetallesPresupuestoOrdenados(user.unidadId, gestionActiva.id);

  const rows = [
    [
      "NRO",
      "OBJETO",
      "OBJETO DESCRIPCION",
      "ITEM",
      "CANTIDAD",
      "PRECIO UNITARIO",
      "MONTO",
    ],
    ...detalles.map((detalle, index) => [
      index + 1,
      detalle.item.objetoCodigo,
      detalle.item.objeto.descripcion,
      `${detalle.itemCodigo} - ${detalle.item.nombre}`,
      detalle.cantidad.toString(),
      detalle.precioUnitario.toString(),
      detalle.subtotal.toString(),
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
  const fileName = `presupuesto-${unidad.nombre}-${gestionActiva.anio}.csv`
    .toLowerCase()
    .replaceAll(" ", "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
