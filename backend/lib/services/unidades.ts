import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export type CrearUnidadInput = {
  nombre: string;
  username: string;
  password: string;
  nombreUsuario: string;
  gestionId: number;
  montoTope: string;
};

export async function crearUnidadConUsuario(input: CrearUnidadInput) {
  const nombre = input.nombre.trim();
  const username = input.username.trim();
  const nombreUsuario = input.nombreUsuario.trim();
  const montoTope = new Prisma.Decimal(input.montoTope || 0);

  if (!nombre || !username || !nombreUsuario || !input.password || !input.gestionId) {
    throw new Error("Completa todos los campos.");
  }

  if (input.password.length < 6) {
    throw new Error("La contrasena debe tener al menos 6 caracteres.");
  }

  if (montoTope.lte(0)) {
    throw new Error("El tope debe ser mayor a cero.");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const unidad = await tx.unidad.create({
        data: {
          nombre,
        },
      });

      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          nombreCompleto: nombreUsuario,
          rol: "UNIDAD",
          unidadId: unidad.id,
        },
      });

      const tope = await tx.topeUnidad.create({
        data: {
          unidadId: unidad.id,
          gestionId: input.gestionId,
          montoTope,
        },
      });

      return { unidad, user, tope };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Ya existe una unidad o usuario con esos datos.");
    }

    throw error;
  }
}

export async function actualizarTopeUnidad(input: {
  unidadId: number;
  gestionId: number;
  montoTope: string;
}) {
  const montoTope = new Prisma.Decimal(input.montoTope || 0);

  if (!input.unidadId || !input.gestionId) {
    throw new Error("Unidad o gestion invalida.");
  }

  if (montoTope.lte(0)) {
    throw new Error("El tope debe ser mayor a cero.");
  }

  const total = await prisma.detallePresupuesto.aggregate({
    where: {
      unidadId: input.unidadId,
      gestionId: input.gestionId,
    },
    _sum: {
      subtotal: true,
    },
  });

  const utilizado = total._sum.subtotal ?? new Prisma.Decimal(0);

  if (montoTope.lt(utilizado)) {
    throw new Error("El nuevo tope no puede ser menor al presupuesto ya utilizado.");
  }

  return prisma.topeUnidad.upsert({
    where: {
      unidadId_gestionId: {
        unidadId: input.unidadId,
        gestionId: input.gestionId,
      },
    },
    update: {
      montoTope,
    },
    create: {
      unidadId: input.unidadId,
      gestionId: input.gestionId,
      montoTope,
    },
  });
}
