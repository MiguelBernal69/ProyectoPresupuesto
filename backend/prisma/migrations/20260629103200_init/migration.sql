-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Unidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gestion" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopeUnidad" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "gestionId" INTEGER NOT NULL,
    "montoTope" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopeUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objeto" (
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objeto_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Item" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "objetoCodigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "DetallePresupuesto" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "gestionId" INTEGER NOT NULL,
    "itemCodigo" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetallePresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioAdmin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_nombre_key" ON "Unidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_usuario_key" ON "Unidad"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Gestion_anio_key" ON "Gestion"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "TopeUnidad_unidadId_gestionId_key" ON "TopeUnidad"("unidadId", "gestionId");

-- CreateIndex
CREATE INDEX "Item_objetoCodigo_idx" ON "Item"("objetoCodigo");

-- CreateIndex
CREATE INDEX "DetallePresupuesto_unidadId_gestionId_idx" ON "DetallePresupuesto"("unidadId", "gestionId");

-- CreateIndex
CREATE UNIQUE INDEX "DetallePresupuesto_unidadId_gestionId_itemCodigo_key" ON "DetallePresupuesto"("unidadId", "gestionId", "itemCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioAdmin_email_key" ON "UsuarioAdmin"("email");

-- AddForeignKey
ALTER TABLE "TopeUnidad" ADD CONSTRAINT "TopeUnidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopeUnidad" ADD CONSTRAINT "TopeUnidad_gestionId_fkey" FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_objetoCodigo_fkey" FOREIGN KEY ("objetoCodigo") REFERENCES "Objeto"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePresupuesto" ADD CONSTRAINT "DetallePresupuesto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePresupuesto" ADD CONSTRAINT "DetallePresupuesto_gestionId_fkey" FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePresupuesto" ADD CONSTRAINT "DetallePresupuesto_itemCodigo_fkey" FOREIGN KEY ("itemCodigo") REFERENCES "Item"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
