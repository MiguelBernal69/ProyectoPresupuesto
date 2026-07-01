-- CreateTable
CREATE TABLE "ItemObligatorio" (
    "id" SERIAL NOT NULL,
    "gestionId" INTEGER NOT NULL,
    "itemCodigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemObligatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemObligatorio_gestionId_idx" ON "ItemObligatorio"("gestionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemObligatorio_gestionId_itemCodigo_key" ON "ItemObligatorio"("gestionId", "itemCodigo");

-- AddForeignKey
ALTER TABLE "ItemObligatorio" ADD CONSTRAINT "ItemObligatorio_gestionId_fkey" FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemObligatorio" ADD CONSTRAINT "ItemObligatorio_itemCodigo_fkey" FOREIGN KEY ("itemCodigo") REFERENCES "Item"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;
