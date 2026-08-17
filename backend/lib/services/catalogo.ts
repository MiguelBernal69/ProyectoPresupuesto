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

export async function buscarItemsCatalogo(query: string, limit = 20): Promise<ItemConObjeto[]> {
  const texto = query.trim();

  if (!texto) {
    return [];
  }

  // Usamos unaccent() de PostgreSQL para que la búsqueda ignore tildes/acentos
  // tanto en el texto buscado como en los datos almacenados.
  // Ejemplo: buscar "comunicacion" encuentra "Comunicación"
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
      WHERE
        unaccent(i.codigo)          ILIKE unaccent(${'%' + texto + '%'})
        OR unaccent(i.nombre)       ILIKE unaccent(${'%' + texto + '%'})
        OR unaccent(i."objetoCodigo") ILIKE unaccent(${'%' + texto + '%'})
        OR unaccent(o.descripcion)  ILIKE unaccent(${'%' + texto + '%'})
      ORDER BY i."objetoCodigo" ASC, i.codigo ASC
      LIMIT ${limit}
    `
  );

  return resultado;
}
