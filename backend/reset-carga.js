const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Reiniciar todos los registros EXITOSOS a PENDIENTE para reintento
  const result = await prisma.registroCarga.updateMany({
    data: {
      estado: 'PENDIENTE',
      idExterno: null,
      mensajeError: null,
      fechaCarga: null,
    }
  });
  console.log('Registros reiniciados a PENDIENTE:', result.count);
}

main().finally(() => prisma.$disconnect());
