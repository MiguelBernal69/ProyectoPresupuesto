-- CreateEnum
CREATE TYPE "EstadoCarga" AS ENUM ('PENDIENTE', 'CARGANDO', 'EXITOSO', 'ERROR', 'OMITIDO');

-- CreateTable
CREATE TABLE "RegistroCarga" (
    "id" SERIAL NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "gestionId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "itemCodigo" TEXT NOT NULL,
    "objetoCodigo" TEXT NOT NULL,
    "itemNombre" TEXT NOT NULL,
    "objetoNombre" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoCarga" NOT NULL DEFAULT 'PENDIENTE',
    "mensajeError" TEXT,
    "idExterno" TEXT,
    "intento" INTEGER NOT NULL DEFAULT 1,
    "fechaCarga" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionCargaExterna" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "cookiescifradas" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesionCargaExterna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroCarga_departamentoId_gestionId_idx" ON "RegistroCarga"("departamentoId", "gestionId");

-- CreateIndex
CREATE INDEX "RegistroCarga_estado_idx" ON "RegistroCarga"("estado");

-- CreateIndex
CREATE INDEX "RegistroCarga_itemCodigo_idx" ON "RegistroCarga"("itemCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "SesionCargaExterna_usuarioId_key" ON "SesionCargaExterna"("usuarioId");

-- AddForeignKey
ALTER TABLE "RegistroCarga" ADD CONSTRAINT "RegistroCarga_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCarga" ADD CONSTRAINT "RegistroCarga_gestionId_fkey" FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCarga" ADD CONSTRAINT "RegistroCarga_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionCargaExterna" ADD CONSTRAINT "SesionCargaExterna_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
