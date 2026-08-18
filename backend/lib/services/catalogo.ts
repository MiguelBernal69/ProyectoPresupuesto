import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

type ItemConObjeto = {
  codigo: string;
  nombre: string;
  objetoCodigo: string;
  createdAt: Date;
  updatedAt: Date;
  objeto: {
    codigo: string;
    descripcion: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export async function buscarItemsCatalogo(query: string): Promise<ItemConObjeto[]> {
  const texto = query.trim();

  if (!texto) {
    return [];
  }

  // Dividir en palabras individuales (ignorar espacios extra)
  const palabras = texto.split(/\s+/).filter(Boolean);

  // Para cada palabra, construir una condición que busca en los 4 campos
  // Todas las palabras deben aparecer (AND entre palabras, OR entre campos)
  const condicionesPorPalabra = palabras.map((p) => {
    const patron = `%${p}%`;
    return Prisma.sql`(
      unaccent(i.codigo)              ILIKE unaccent(${patron})
      OR unaccent(i.nombre)           ILIKE unaccent(${patron})
      OR unaccent(i."objetoCodigo")   ILIKE unaccent(${patron})
      OR unaccent(o.descripcion)      ILIKE unaccent(${patron})
    )`;
  });

  // Unir todas las condiciones con AND
  const whereClause = Prisma.join(condicionesPorPalabra, " AND ");

  const resultado = await prisma.$queryRaw<ItemConObjeto[]>(
    Prisma.sql`
      SELECT
        i.codigo,
        i.nombre,
        i."objetoCodigo",
        i."createdAt",
        i."updatedAt",
        json_build_object(
          'codigo',      o.codigo,
          'descripcion', o.descripcion,
          'createdAt',   o."createdAt",
          'updatedAt',   o."updatedAt"
        ) AS objeto
      FROM "Item" i
      JOIN "Objeto" o ON o.codigo = i."objetoCodigo"
      WHERE ${whereClause}
      ORDER BY LENGTH(i.nombre) ASC, i."objetoCodigo" ASC, i.codigo ASC
    `
  );

  return resultado;
}
