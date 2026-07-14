"use server";

import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export async function buscarItemsAction(query: string, page: number, pageSize: number = 100) {
  await requireRole("ADMIN");

  const skip = (page - 1) * pageSize;
  const filter = query.trim()
    ? {
        OR: [
          { codigo: { contains: query.trim(), mode: "insensitive" as const } },
          { nombre: { contains: query.trim(), mode: "insensitive" as const } },
          { objetoCodigo: { contains: query.trim(), mode: "insensitive" as const } },
          { objeto: { descripcion: { contains: query.trim(), mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where: filter,
      include: { objeto: true },
      orderBy: [{ objetoCodigo: "asc" }, { codigo: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.item.count({ where: filter }),
  ]);

  return { items, total };
}
