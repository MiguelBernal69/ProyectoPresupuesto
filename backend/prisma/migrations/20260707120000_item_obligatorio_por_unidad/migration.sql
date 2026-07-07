-- Los obligatorios anteriores eran globales por gestion. Se limpian para
-- que la nueva configuracion sea explicita por unidad/modulo.
DELETE FROM "ItemObligatorio";

DROP INDEX IF EXISTS "ItemObligatorio_gestionId_itemCodigo_key";
DROP INDEX IF EXISTS "ItemObligatorio_gestionId_idx";

ALTER TABLE "ItemObligatorio"
ADD COLUMN "unidadId" INTEGER NOT NULL;

CREATE INDEX "ItemObligatorio_gestionId_unidadId_idx"
ON "ItemObligatorio"("gestionId", "unidadId");

CREATE UNIQUE INDEX "ItemObligatorio_gestionId_unidadId_itemCodigo_key"
ON "ItemObligatorio"("gestionId", "unidadId", "itemCodigo");

ALTER TABLE "ItemObligatorio"
ADD CONSTRAINT "ItemObligatorio_unidadId_fkey"
FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
