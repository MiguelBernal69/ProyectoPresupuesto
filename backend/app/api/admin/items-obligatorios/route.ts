import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export async function POST(request: Request) {
  await requireRole("ADMIN");

  const formData = await request.formData();
  const gestionId = Number(formData.get("gestionId") ?? 0);
  const unidadId = Number(formData.get("unidadId") ?? 0);
  const itemCodigos = formData.getAll("itemCodigo").map(String);

  if (!gestionId || !unidadId) {
    return NextResponse.json({ error: "Gestion o unidad invalida" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemObligatorio.deleteMany({ where: { gestionId, unidadId } });

    if (itemCodigos.length) {
      await tx.itemObligatorio.createMany({
        data: itemCodigos.map((itemCodigo) => ({ gestionId, unidadId, itemCodigo })),
      });
    }
  });

  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/admin/items-obligatorios?unidadId=${unidadId}&saved=1`,
    },
  });
}
