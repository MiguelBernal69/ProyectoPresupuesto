import prisma from "@/lib/db";
import { EstadoCarga, Prisma } from "@prisma/client";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type ItemParaCarga = {
  itemCodigo: string;
  itemNombre: string;
  objetoCodigo: string;
  objetoNombre: string;
  cantidadTotal: Prisma.Decimal;
  precioPromedioPonderado: Prisma.Decimal;
  subtotalTotal: Prisma.Decimal;
};

export type RegistroCargaConEstado = {
  id: number;
  itemCodigo: string;
  itemNombre: string;
  objetoCodigo: string;
  objetoNombre: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  estado: EstadoCarga;
  mensajeError: string | null;
  idExterno: string | null;
  intento: number;
  fechaCarga: Date | null;
};

// ── Obtener ítems consolidados del departamento para una gestión ─────────────

export async function obtenerItemsConsolidadosDepartamento(
  departamentoId: number,
  gestionId: number
): Promise<ItemParaCarga[]> {
  const unidades = await prisma.unidad.findMany({
    where: { departamentoId },
    include: {
      detallesPresupuesto: {
        where: { gestionId },
        include: {
          item: { include: { objeto: true } },
        },
      },
    },
  });

  const itemMap = new Map<string, ItemParaCarga>();

  for (const unidad of unidades) {
    for (const det of unidad.detallesPresupuesto) {
      const prev = itemMap.get(det.itemCodigo);
      if (prev) {
        prev.cantidadTotal = prev.cantidadTotal.plus(det.cantidad);
        prev.subtotalTotal = prev.subtotalTotal.plus(det.subtotal);
      } else {
        itemMap.set(det.itemCodigo, {
          itemCodigo: det.itemCodigo,
          itemNombre: det.item.nombre,
          objetoCodigo: det.item.objetoCodigo,
          objetoNombre: det.item.objeto.descripcion,
          cantidadTotal: new Prisma.Decimal(det.cantidad),
          subtotalTotal: new Prisma.Decimal(det.subtotal),
          precioPromedioPonderado: new Prisma.Decimal(0),
        });
      }
    }
  }

  return Array.from(itemMap.values())
    .map((item) => ({
      ...item,
      precioPromedioPonderado: item.cantidadTotal.gt(0)
        ? item.subtotalTotal.div(item.cantidadTotal)
        : new Prisma.Decimal(0),
    }))
    .sort((a, b) => {
      const obj = a.objetoCodigo.localeCompare(b.objetoCodigo, "es", { numeric: true });
      if (obj !== 0) return obj;
      return a.itemCodigo.localeCompare(b.itemCodigo, "es", { numeric: true });
    });
}

// ── Preparar (o reusar) registros de carga ───────────────────────────────────
// Crea registros PENDIENTE para ítems que no tienen uno aún.
// Reutiliza los existentes (para no duplicar auditoría).

export async function prepararRegistrosCarga(
  departamentoId: number,
  gestionId: number,
  usuarioId: number,
  items: ItemParaCarga[]
): Promise<RegistroCargaConEstado[]> {
  const registros: RegistroCargaConEstado[] = [];

  for (const item of items) {
    // Buscar si ya existe un registro para este ítem
    const existente = await prisma.registroCarga.findFirst({
      where: { departamentoId, gestionId, itemCodigo: item.itemCodigo },
      orderBy: { createdAt: "desc" },
    });

    if (existente) {
      // Siempre actualizar los montos con el consolidado actual
      // (pueden haber cambiado si se agregaron/editaron unidades)
      const actualizado = await prisma.registroCarga.update({
        where: { id: existente.id },
        data: {
          cantidad: item.cantidadTotal,
          precioUnitario: item.precioPromedioPonderado,
          subtotal: item.subtotalTotal,
          itemNombre: item.itemNombre,
          objetoCodigo: item.objetoCodigo,
          objetoNombre: item.objetoNombre,
        },
      });
      registros.push(actualizado as RegistroCargaConEstado);
    } else {
      const nuevo = await prisma.registroCarga.create({
        data: {
          departamentoId,
          gestionId,
          usuarioId,
          itemCodigo: item.itemCodigo,
          itemNombre: item.itemNombre,
          objetoCodigo: item.objetoCodigo,
          objetoNombre: item.objetoNombre,
          cantidad: item.cantidadTotal,
          precioUnitario: item.precioPromedioPonderado,
          subtotal: item.subtotalTotal,
          estado: "PENDIENTE",
        },
      });
      registros.push(nuevo as RegistroCargaConEstado);
    }
  }

  return registros;
}

// ── Leer registros de carga existentes ───────────────────────────────────────

export async function obtenerRegistrosCarga(
  departamentoId: number,
  gestionId: number
): Promise<RegistroCargaConEstado[]> {
  return prisma.registroCarga.findMany({
    where: { departamentoId, gestionId },
    orderBy: [{ objetoCodigo: "asc" }, { itemCodigo: "asc" }],
  }) as Promise<RegistroCargaConEstado[]>;
}

// ── Actualizar estado de un registro ─────────────────────────────────────────

export async function actualizarEstadoRegistro(
  id: number,
  estado: EstadoCarga,
  extras?: { mensajeError?: string; idExterno?: string }
) {
  return prisma.registroCarga.update({
    where: { id },
    data: {
      estado,
      mensajeError: extras?.mensajeError ?? null,
      idExterno: extras?.idExterno,
      fechaCarga: estado === "EXITOSO" || estado === "ERROR" ? new Date() : undefined,
    },
  });
}

// ── Marcar registro como CARGANDO (inicio de intento) ────────────────────────

export async function marcarComoCargando(id: number, intento: number) {
  return prisma.registroCarga.update({
    where: { id },
    data: { estado: "CARGANDO", intento },
  });
}

// ── Resetear registros ERROR a PENDIENTE (para reintentar) ───────────────────

export async function resetearErrores(departamentoId: number, gestionId: number) {
  return prisma.registroCarga.updateMany({
    where: { departamentoId, gestionId, estado: "ERROR" },
    data: { estado: "PENDIENTE", mensajeError: null },
  });
}

// ── Verificar si ya fue cargado exitosamente ──────────────────────────────────

export async function yaFueCargadoExitosamente(
  departamentoId: number,
  gestionId: number,
  itemCodigo: string
): Promise<boolean> {
  const registro = await prisma.registroCarga.findFirst({
    where: { departamentoId, gestionId, itemCodigo, estado: "EXITOSO" },
  });
  return !!registro;
}

// ── Resumen de una sesión de carga ───────────────────────────────────────────

export async function obtenerResumenCarga(
  departamentoId: number,
  gestionId: number
) {
  const counts = await prisma.registroCarga.groupBy({
    by: ["estado"],
    where: { departamentoId, gestionId },
    _count: { id: true },
  });

  const resultado = {
    total: 0,
    exitosos: 0,
    errores: 0,
    pendientes: 0,
    omitidos: 0,
    cargando: 0,
  };

  for (const c of counts) {
    const n = c._count.id;
    resultado.total += n;
    if (c.estado === "EXITOSO") resultado.exitosos += n;
    if (c.estado === "ERROR") resultado.errores += n;
    if (c.estado === "PENDIENTE") resultado.pendientes += n;
    if (c.estado === "OMITIDO") resultado.omitidos += n;
    if (c.estado === "CARGANDO") resultado.cargando += n;
  }

  return resultado;
}
