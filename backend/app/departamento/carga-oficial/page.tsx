import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  obtenerItemsConsolidadosDepartamento,
  prepararRegistrosCarga,
  RegistroCargaConEstado,
} from "@/lib/services/carga-oficial";
import CargaOficialClient from "./CargaOficialClient";

export const dynamic = "force-dynamic";

export default async function CargaOficialPage() {
  const user = await requireRole("DEPARTAMENTO");

  if (!user.departamentoId) {
    notFound();
  }

  const [departamento, gestionActiva] = await Promise.all([
    prisma.departamento.findUnique({ where: { id: user.departamentoId } }),
    prisma.gestion.findFirst({
      where: { estado: "ABIERTA" },
      orderBy: { anio: "desc" },
    }),
  ]);

  if (!departamento || !gestionActiva) {
    notFound();
  }

  // 1. Obtener ítems consolidados del departamento
  const itemsConsolidados = await obtenerItemsConsolidadosDepartamento(
    departamento.id,
    gestionActiva.id
  );

  // 2. Preparar registros de auditoría (crea PENDIENTE si no existen)
  const registros = await prepararRegistrosCarga(
    departamento.id,
    gestionActiva.id,
    user.id,
    itemsConsolidados
  );

  // 3. Serializar para el cliente
  const registrosSerializados = registros.map((r) => ({
    ...r,
    cantidad: r.cantidad.toString(),
    precioUnitario: r.precioUnitario.toString(),
    subtotal: r.subtotal.toString(),
    fechaCarga: r.fechaCarga ? r.fechaCarga.toISOString() : null,
  }));

  // 4. Verificar sesión externa actual
  const sesionActiva = await prisma.sesionCargaExterna.findUnique({
    where: { usuarioId: user.id },
  });
  const isLoggedIn = !!sesionActiva && sesionActiva.expiresAt > new Date();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 pb-20">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {departamento.nombre}
            </p>
            <h1 className="text-xl font-semibold">Carga al Sistema Oficial</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">
              Gestión {gestionActiva.anio}
            </span>
            <a
              href="/departamento"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Volver
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <CargaOficialClient
          registrosIniciales={registrosSerializados}
          isLoggedIn={isLoggedIn}
          departamentoId={departamento.id}
          gestionId={gestionActiva.id}
        />
      </section>
    </main>
  );
}
