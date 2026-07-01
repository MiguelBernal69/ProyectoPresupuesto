import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export async function POST(request: Request) {
  await requireRole("ADMIN");

  const formData = await request.formData();
  const gestionId = Number(formData.get("gestionId") ?? 0);
  const itemCodigos = formData.getAll("itemCodigo").map(String);

  if (!gestionId) {
    return NextResponse.json({ error: "Gestion invalida" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemObligatorio.deleteMany({ where: { gestionId } });

    if (itemCodigos.length) {
      await tx.itemObligatorio.createMany({
        data: itemCodigos.map((itemCodigo) => ({ gestionId, itemCodigo })),
      });
    }
  });

  return NextResponse.redirect(new URL("/admin/items-obligatorios", request.url));
}
