import prisma from "@/lib/db";

export async function buscarItemsCatalogo(query: string, limit = 20) {
  const texto = query.trim();

  if (!texto) {
    return [];
  }

  return prisma.item.findMany({
    where: {
      OR: [
        { codigo: { contains: texto, mode: "insensitive" } },
        { nombre: { contains: texto, mode: "insensitive" } },
        { objetoCodigo: { contains: texto, mode: "insensitive" } },
        { objeto: { descripcion: { contains: texto, mode: "insensitive" } } },
      ],
    },
    include: {
      objeto: true,
    },
    orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
    take: limit,
  });
}
