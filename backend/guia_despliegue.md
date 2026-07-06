# Guía de Despliegue en Producción (Docker)

Esta guía detalla los pasos necesarios para desplegar la aplicación `ProyectoPresupuesto` en un servidor de producción utilizando **Docker** y **Docker Compose**.

## 1. Requisitos Previos en el Servidor
Antes de comenzar, asegúrate de que el servidor tenga instalados los siguientes componentes:
- **Git** (para clonar tu repositorio)
- **Docker** y **Docker Compose**

## 2. Preparar el Proyecto en el Servidor
Ingresa a tu servidor mediante SSH y sigue estos pasos:

```bash
# 1. Clonar el repositorio
git clone https://github.com/MiguelBernal69/ProyectoPresupuesto.git
cd ProyectoPresupuesto

# 2. (Opcional) Modificar contraseñas y secretos
# Edita el archivo docker-compose.yml para cambiar POSTGRES_PASSWORD y SESSION_SECRET por valores seguros.
nano docker-compose.yml
```

## 3. Construir y Levantar los Contenedores
Docker Compose se encargará de construir la imagen de Next.js de forma optimizada (gracias al modo `standalone`) y de descargar la imagen de PostgreSQL.

```bash
# Construir las imágenes e iniciar los contenedores en segundo plano (-d)
docker compose up --build -d
```
> [!NOTE]
> La primera vez que ejecutes este comando, puede tardar un poco mientras descarga las imágenes base y compila la aplicación Next.js.

## 4. Configurar la Base de Datos (Migraciones)
Una vez que los contenedores estén corriendo, la base de datos estará vacía. Debemos ejecutar las migraciones de Prisma para crear las tablas y, de ser necesario, correr el script para importar el catálogo.

```bash
# 1. Ejecutar migraciones en el contenedor de Next.js (web)
docker compose exec web npx prisma migrate deploy

# 2. Sembrar la base de datos con los usuarios/roles iniciales (si tienes el seed.js configurado)
docker compose exec web npm run db:seed

# 3. Importar el catálogo normalizado de Excel a la base de datos
docker compose exec web npm run import:catalogo
```

> [!TIP]
> **¿Qué hace `docker compose exec web ...`?**
> Te permite ejecutar comandos directamente dentro del contenedor `web` que ya está en ejecución, usando la conexión de red interna para hablar con el contenedor `db`.

## 5. Verificar que todo funcione
Verifica los logs de la aplicación para asegurarte de que arrancó correctamente sin errores:

```bash
docker compose logs -f web
```
Si todo es correcto, la aplicación estará disponible en la dirección IP o dominio de tu servidor en el puerto `3000` (ejemplo: `http://TU_IP:3000`).

## 6. Siguientes Pasos (Opcional pero recomendado)
> [!IMPORTANT]  
> Para un entorno de producción real, se recomienda poner un proxy inverso como **Nginx** o **Caddy** delante del puerto 3000 para proveer un certificado SSL (HTTPS) y manejar el tráfico web de forma más segura.

### Actualizar la aplicación después de hacer cambios en el código:
Cuando hagas un `git push` con nuevos cambios y quieras actualizarlos en el servidor, solo ejecuta:

```bash
git pull origin miguel
docker compose up --build -d
# Si hiciste cambios en la BD (nuevas tablas), ejecuta:
docker compose exec web npx prisma migrate deploy
```
