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

  // Si el query es solo números con menos de 5 dígitos, rellenar con ceros
  // Ejemplo: "321" → "32100", "39" → "39000"
  const soloNumeros = /^\d+$/.test(texto);
  const codigoPadded = soloNumeros && texto.length < 5
    ? texto.padEnd(5, "0")
    : null;

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

  // Si hay código completado a 5 dígitos, incluirlo como condición adicional (OR)
  const whereClause = codigoPadded
    ? Prisma.sql`(${Prisma.join(condicionesPorPalabra, " AND ")} OR i."objetoCodigo" = ${codigoPadded})`
    : Prisma.join(condicionesPorPalabra, " AND ");

  // Prioridad: primero los que coincidan exactamente con el código de 5 dígitos
  const orderPriority = codigoPadded
    ? Prisma.sql`CASE WHEN i."objetoCodigo" = ${codigoPadded} THEN 0 ELSE 1 END,`
    : Prisma.sql``;

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
      ORDER BY ${orderPriority} LENGTH(i.nombre) ASC, i."objetoCodigo" ASC, i.codigo ASC
    `
  );

  return resultado;
}
