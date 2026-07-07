import { EstadoGestion, Prisma } from "@prisma/client";
import prisma from "@/lib/db";

async function validarItemsObligatorios(tx: Prisma.TransactionClient, gestionId: number, unidadId: number) {
  const obligatorios = await tx.itemObligatorio.findMany({
    where: { gestionId, unidadId },
    select: { itemCodigo: true },
  });

  if (!obligatorios.length) {
    return [];
  }

  const itemCodigos = obligatorios.map((item) => item.itemCodigo);

  const existentes = await tx.detallePresupuesto.findMany({
    where: {
      unidadId,
      gestionId,
      itemCodigo: { in: itemCodigos },
    },
    select: { itemCodigo: true },
  });

  const existentesSet = new Set(existentes.map((detalle) => detalle.itemCodigo));

  return itemCodigos.filter((codigo) => !existentesSet.has(codigo));
}

type CrearDetalleInput = {
  unidadId: number;
  gestionId: number;
  itemCodigo: string;
  cantidad: number;
  precioUnitario: number;
};

export async function listarDetallesPresupuestoOrdenados(unidadId: number, gestionId: number) {
  const detalles = await prisma.detallePresupuesto.findMany({
    where: { unidadId, gestionId },
    include: { item: { include: { objeto: true } } },
  });

  return detalles.sort((a, b) => {
    const objetoCompare = a.item.objetoCodigo.localeCompare(b.item.objetoCodigo, "es", {
      numeric: true,
    });

    if (objetoCompare !== 0) {
      return objetoCompare;
    }

    return a.itemCodigo.localeCompare(b.itemCodigo, "es", { numeric: true });
  });
}

export async function obtenerResumenUnidad(unidadId: number, gestionId: number) {
  const [tope, total] = await Promise.all([
    prisma.topeUnidad.findUnique({
      where: {
        unidadId_gestionId: {
          unidadId,
          gestionId,
        },
      },
    }),
    prisma.detallePresupuesto.aggregate({
      where: {
        unidadId,
        gestionId,
      },
      _sum: {
        subtotal: true,
      },
    }),
  ]);

  const montoTope = tope?.montoTope ?? new Prisma.Decimal(0);
  const utilizado = total._sum.subtotal ?? new Prisma.Decimal(0);

  return {
    montoTope,
    utilizado,
    disponible: montoTope.minus(utilizado),
  };
}

export async function crearDetallePresupuesto(input: CrearDetalleInput) {
  const cantidad = new Prisma.Decimal(input.cantidad);
  const precioUnitario = new Prisma.Decimal(input.precioUnitario);
  const subtotal = cantidad.mul(precioUnitario);

  if (cantidad.lte(0) || precioUnitario.lte(0)) {
    throw new Error("La cantidad y el precio unitario deben ser mayores a cero.");
  }

  return prisma.$transaction(async (tx) => {
    const gestion = await tx.gestion.findUnique({
      where: { id: input.gestionId },
      select: { estado: true },
    });

    if (!gestion) {
      throw new Error("La gestion no existe.");
    }

    if (gestion.estado !== EstadoGestion.ABIERTA) {
      throw new Error("La gestion esta cerrada y no permite cambios.");
    }

    const tope = await tx.topeUnidad.findUnique({
      where: {
        unidadId_gestionId: {
          unidadId: input.unidadId,
          gestionId: input.gestionId,
        },
      },
    });

    if (!tope) {
      throw new Error("La unidad no tiene un tope asignado para esta gestion.");
    }

    const totalActual = await tx.detallePresupuesto.aggregate({
      where: {
        unidadId: input.unidadId,
        gestionId: input.gestionId,
      },
      _sum: {
        subtotal: true,
      },
    });

    // Verificar si el ítem ya fue registrado previamente
    const yaExiste = await tx.detallePresupuesto.findUnique({
      where: {
        unidadId_gestionId_itemCodigo: {
          unidadId: input.unidadId,
          gestionId: input.gestionId,
          itemCodigo: input.itemCodigo,
        },
      },
    });

    if (yaExiste) {
      throw new Error("Este ítem ya fue registrado en el presupuesto.");
    }

    // Obtener ítems obligatorios aún no registrados por esta unidad
    const itemsFaltantes = await validarItemsObligatorios(tx, input.gestionId, input.unidadId);

    // Si hay ítems obligatorios pendientes y el ítem actual NO es uno de ellos,
    // bloquear hasta que se registren primero los obligatorios.
    if (itemsFaltantes.length > 0 && !itemsFaltantes.includes(input.itemCodigo)) {
      throw new Error(
        `Debes registrar primero los ítems obligatorios: ${itemsFaltantes.join(", ")}`,
      );
    }

    const utilizado = totalActual._sum.subtotal ?? new Prisma.Decimal(0);
    const nuevoTotal = utilizado.plus(subtotal);

    if (nuevoTotal.gt(tope.montoTope)) {
      throw new Error("El detalle supera el tope presupuestario de la unidad.");
    }

    return tx.detallePresupuesto.create({
      data: {
        unidadId: input.unidadId,
        gestionId: input.gestionId,
        itemCodigo: input.itemCodigo,
        cantidad,
        precioUnitario,
        subtotal,
      },
    });
  });
}

// ── Actualizar ─────────────────────────────────────────────────────────────

type ActualizarDetalleInput = {
  id: number;
  unidadId: number;
  cantidad: number;
  precioUnitario: number;
};

export async function actualizarDetallePresupuesto(input: ActualizarDetalleInput) {
  const cantidad = new Prisma.Decimal(input.cantidad);
  const precioUnitario = new Prisma.Decimal(input.precioUnitario);
  const nuevoSubtotal = cantidad.mul(precioUnitario);

  if (cantidad.lte(0) || precioUnitario.lte(0)) {
    throw new Error("La cantidad y el precio unitario deben ser mayores a cero.");
  }

  return prisma.$transaction(async (tx) => {
    const detalle = await tx.detallePresupuesto.findUnique({
      where: { id: input.id },
      select: { id: true, unidadId: true, gestionId: true },
    });

    if (!detalle || detalle.unidadId !== input.unidadId) {
      throw new Error("El detalle no existe o no pertenece a tu unidad.");
    }

    const gestion = await tx.gestion.findUnique({
      where: { id: detalle.gestionId },
      select: { estado: true },
    });

    if (gestion?.estado !== EstadoGestion.ABIERTA) {
      throw new Error("La gestión está cerrada y no permite cambios.");
    }

    const tope = await tx.topeUnidad.findUnique({
      where: {
        unidadId_gestionId: {
          unidadId: input.unidadId,
          gestionId: detalle.gestionId,
        },
      },
    });

    if (!tope) {
      throw new Error("La unidad no tiene un tope asignado para esta gestión.");
    }

    // Total excluyendo el ítem que se está editando
    const totalSinEste = await tx.detallePresupuesto.aggregate({
      where: {
        unidadId: input.unidadId,
        gestionId: detalle.gestionId,
        id: { not: input.id },
      },
      _sum: { subtotal: true },
    });

    const utilizadoSinEste = totalSinEste._sum.subtotal ?? new Prisma.Decimal(0);
    const nuevoTotal = utilizadoSinEste.plus(nuevoSubtotal);

    if (nuevoTotal.gt(tope.montoTope)) {
      throw new Error("El nuevo monto supera el tope presupuestario de la unidad.");
    }

    return tx.detallePresupuesto.update({
      where: { id: input.id },
      data: { cantidad, precioUnitario, subtotal: nuevoSubtotal },
    });
  });
}

// ── Eliminar ───────────────────────────────────────────────────────────────

export async function eliminarDetallePresupuesto(id: number, unidadId: number) {
  return prisma.$transaction(async (tx) => {
    const detalle = await tx.detallePresupuesto.findUnique({
      where: { id },
      select: { unidadId: true, gestionId: true },
    });

    if (!detalle || detalle.unidadId !== unidadId) {
      throw new Error("El detalle no existe o no pertenece a tu unidad.");
    }

    const gestion = await tx.gestion.findUnique({
      where: { id: detalle.gestionId },
      select: { estado: true },
    });

    if (gestion?.estado !== EstadoGestion.ABIERTA) {
      throw new Error("La gestión está cerrada y no permite eliminar ítems.");
    }

    await tx.detallePresupuesto.delete({ where: { id } });
  });
}
