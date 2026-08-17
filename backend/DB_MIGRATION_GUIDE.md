# Guía para migrar la base de datos

Esta guía sirve para recrear la base de datos del proyecto con Prisma y PostgreSQL de forma ordenada.

## Requisitos

- PostgreSQL en ejecución
- Node.js y npm instalados
- Acceso a la base de datos desde la conexión definida en `DATABASE_URL`

## 1. Configurar la conexión

Crea un archivo `.env` dentro de la carpeta `backend` si aún no existe y agrega una URL similar a esta:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/presupuesto_umss?schema=public"
```

Ajusta el usuario, contraseña, puerto y nombre de la base de datos según tu instalación local.

## 2. Asegurar que la base exista

En PostgreSQL crea la base de datos si aún no existe:

```sql
CREATE DATABASE presupuesto_umss;
```

Si ya existe y quieres empezar desde cero, puedes eliminarla y volverla a crear:

```sql
DROP DATABASE IF EXISTS presupuesto_umss;
CREATE DATABASE presupuesto_umss;
```

## 3. Instalar dependencias

Desde la carpeta `backend` ejecuta:

```bash
npm install
```

## 4. Validar y generar Prisma

```bash
npx prisma validate
npx prisma generate
```

## 5. Opción recomendada: recrear la base de datos desde cero

Si quieres volver a dejar la base de datos limpia y aplicar todas las migraciones desde el inicio, ejecuta:

```bash
npx prisma migrate reset --force
```

Este comando:
- elimina los datos actuales,
- aplica todas las migraciones,
- reinicia el estado de la base.

Luego, si deseas cargar datos iniciales del seed:

```bash
npm run db:seed
```

Si además quieres cargar el catálogo desde el archivo Excel, ejecuta:

```bash
npm run import:catalogo
```

Este comando busca el archivo en `backend/data/catalogo.xlsx` y lo importa en la base de datos.

## 6. Opción alternativa: aplicar solo cambios pendientes

Si no quieres borrar los datos y solo quieres aplicar cambios nuevos de esquema:

```bash
npx prisma migrate dev --name nombre_del_cambio
npx prisma generate
```

## 7. RESPALDOS (Backups): Cómo exportar e importar datos sin perder migraciones

Cuando restauras una base de datos antigua que **no tiene las últimas tablas** (por ejemplo, al mover el sistema a otra computadora o retroceder un respaldo), Prisma puede confundirse. Para hacerlo correctamente, sigue este proceso:

### A. Para sacar un respaldo completo (incluye el estado de migraciones)
Ejecuta el siguiente comando en tu terminal para generar un archivo con tu información actual:
```bash
pg_dump -U postgres -d presupuesto_db -F c -f respaldo_completo.backup
```
*(Este respaldo será perfecto porque incluirá la tabla `_prisma_migrations` actualizada).*

### B. Para restaurar un respaldo antiguo en una base de datos nueva
Si creas una base de datos nueva y le restauras un respaldo antiguo (que no tenía las últimas tablas), debes actualizarla así:

1. Restaura tu respaldo con `pg_restore`.
2. Como el respaldo antiguo no conoce las migraciones nuevas, revisa cuáles faltan aplicando un **deploy** (no uses `dev` aquí):
   ```bash
   npx prisma migrate deploy
   ```
   *Esto aplicará automáticamente cualquier migración nueva que el código tenga, pero que el respaldo antiguo no tenía (como crear la tabla Departamento).*
3. Regenera el cliente de Prisma por si acaso:
   ```bash
   npx prisma generate
   ```
4. Reinicia tu servidor (`npm run dev`).

## 8. Verificar que todo quedó bien

Puedes abrir Prisma Studio para revisar los datos:

```bash
npx prisma studio
```

## Notas importantes

- Si recibes errores de conexión, revisa que `DATABASE_URL` sea correcta y que contenga `?schema=public` (asegúrate de que no tenga errores tipográficos como "piblic").
- Si aparece un error sobre la base de datos no existente, créala primero.
- Si un cambio anterior quedó mal aplicado, la opción más segura suele ser `migrate reset`.
