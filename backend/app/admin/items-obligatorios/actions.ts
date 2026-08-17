"use server";

import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";

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

export async function buscarItemsAction(query: string, page: number, pageSize: number = 100) {
  await requireRole("ADMIN");

  const skip = (page - 1) * pageSize;
  const texto = query.trim();

  if (!texto) {
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        include: { objeto: true },
        orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.item.count(),
    ]);
    return { items, total };
  }

  // Búsqueda con unaccent para ignorar tildes/acentos en ambos lados
  const patron = '%' + texto + '%';

  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<ItemConObjeto[]>(
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
          unaccent(i.codigo)            ILIKE unaccent(${patron})
          OR unaccent(i.nombre)         ILIKE unaccent(${patron})
          OR unaccent(i."objetoCodigo") ILIKE unaccent(${patron})
          OR unaccent(o.descripcion)    ILIKE unaccent(${patron})
        ORDER BY i."objetoCodigo" ASC, i.codigo ASC
        LIMIT ${pageSize} OFFSET ${skip}
      `
    ),
    prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "Item" i
        JOIN "Objeto" o ON o.codigo = i."objetoCodigo"
        WHERE
          unaccent(i.codigo)            ILIKE unaccent(${patron})
          OR unaccent(i.nombre)         ILIKE unaccent(${patron})
          OR unaccent(i."objetoCodigo") ILIKE unaccent(${patron})
          OR unaccent(o.descripcion)    ILIKE unaccent(${patron})
      `
    ),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return { items, total };
}
