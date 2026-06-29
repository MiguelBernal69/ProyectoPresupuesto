/*
  Warnings:

  - The `estado` column on the `Gestion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `passwordHash` on the `Unidad` table. All the data in the column will be lost.
  - You are about to drop the column `usuario` on the `Unidad` table. All the data in the column will be lost.
  - You are about to drop the `UsuarioAdmin` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'UNIDAD');

-- CreateEnum
CREATE TYPE "EstadoGestion" AS ENUM ('ABIERTA', 'CERRADA');

-- DropIndex
DROP INDEX "Unidad_usuario_key";

-- AlterTable
ALTER TABLE "Gestion" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoGestion" NOT NULL DEFAULT 'ABIERTA';

-- AlterTable
ALTER TABLE "Unidad" DROP COLUMN "passwordHash",
DROP COLUMN "usuario",
ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "UsuarioAdmin";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "unidadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_unidadId_key" ON "User"("unidadId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
