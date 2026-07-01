import { EstadoGestion, Prisma } from "@prisma/client";
import prisma from "@/lib/db";

async function validarItemsObligatorios(tx: Prisma.TransactionClient, gestionId: number, unidadId: number) {
  const obligatorios = await tx.itemObligatorio.findMany({
    where: { gestionId },
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

    const utilizadosObligatorios = await validarItemsObligatorios(
      tx,
      input.gestionId,
      input.unidadId,
    );

    if (utilizadosObligatorios.includes(input.itemCodigo)) {
      throw new Error("Este item es obligatorio y ya fue registrado previamente.");
    }

    const faltantes = await validarItemsObligatorios(tx, input.gestionId, input.unidadId);
    const yaExisten = new Set(
      (await tx.detallePresupuesto.findMany({
        where: {
          unidadId: input.unidadId,
          gestionId: input.gestionId,
        },
        select: { itemCodigo: true },
      })).map((detalle) => detalle.itemCodigo),
    );

    const itemObligatorio = await tx.itemObligatorio.findFirst({
      where: {
        gestionId: input.gestionId,
        itemCodigo: input.itemCodigo,
      },
    });

    if (itemObligatorio) {
      const yaExiste = yaExisten.has(input.itemCodigo);
      if (yaExiste) {
        throw new Error("Este item obligatorio ya fue registrado.");
      }
    }

    const faltantesDespues = await validarItemsObligatorios(tx, input.gestionId, input.unidadId);
    if (faltantesDespues.length > 0 && !faltantesDespues.includes(input.itemCodigo)) {
      throw new Error(
        `Debes registrar primero los items obligatorios antes de agregar otros: ${faltantesDespues.join(", ")}`,
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
