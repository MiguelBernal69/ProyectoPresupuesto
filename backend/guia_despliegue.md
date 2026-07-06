# Guía de Despliegue en Producción (Docker)

Esta guía detalla los pasos para desplegar `ProyectoPresupuesto` en un servidor Ubuntu usando **Docker** y **Docker Compose**.

> **Stack actual:** Next.js 16 + Prisma 6 + PostgreSQL 15 + Alpine Linux

---

## 1. Requisitos Previos en el Servidor Ubuntu

```bash
# Instalar Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar tu usuario al grupo docker (para no necesitar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

---

## 2. Preparar el Proyecto en el Servidor

```bash
# 1. Clonar el repositorio
git clone https://github.com/MiguelBernal69/ProyectoPresupuesto.git
cd ProyectoPresupuesto

# 2. Configurar variables de entorno
cp backend/.env.example .env

# 3. Editar el .env con contraseñas reales
nano .env
```

Ejemplo de `.env` completado:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=MiContraseñaSegura2024!
POSTGRES_DB=presupuesto_db
SESSION_SECRET=un_secreto_muy_largo_y_aleatorio_aqui

# "db" es el nombre del servicio de Postgres en Docker Compose (NO usar localhost)
DATABASE_URL=postgresql://postgres:MiContraseñaSegura2024!@db:5432/presupuesto_db
```

---

## 3. Construir y Levantar los Contenedores

```bash
# Construir imágenes e iniciar en segundo plano
docker compose up --build -d
```

> [!NOTE]
> La primera vez tardará varios minutos mientras descarga las imágenes base y compila Next.js.
> El contenedor `web` esperará automáticamente a que `db` esté listo (healthcheck configurado).

Verifica que ambos estén corriendo:
```bash
docker compose ps
```
Deberías ver `presupuesto_db` y `presupuesto_web` con estado `Up` (healthy).

---

## 4. Configurar la Base de Datos

Una vez que los contenedores estén en verde, ejecuta las migraciones y el seed:

```bash
# 1. Crear las tablas en la base de datos
docker compose exec web npx prisma migrate deploy

# 2. Crear el usuario admin inicial y la gestión del año actual
docker compose exec web npm run db:seed

# 3. (Opcional) Importar el catálogo presupuestario desde Excel
docker compose exec web npm run import:catalogo
```

> [!TIP]
> `docker compose exec web ...` ejecuta comandos dentro del contenedor `web` en ejecución,
> usando la red interna de Docker para comunicarse con el contenedor `db`.

---

## 5. Verificar que Todo Funcione

```bash
# Ver logs en tiempo real
docker compose logs -f web

# Ver solo los últimos 50 logs
docker compose logs --tail=50 web
```

Si todo es correcto, la aplicación estará disponible en:
**`http://TU_IP_DEL_SERVIDOR:3000`**

Credenciales iniciales (cambia la contraseña después):
- Usuario: `admin`
- Contraseña: `admin123`

---

## 6. Actualizar la Aplicación (después de git push)

```bash
# En el servidor:
git pull origin miguel
docker compose up --build -d

# Si hiciste cambios en el schema de BD:
docker compose exec web npx prisma migrate deploy
```

---

## 7. Comandos Útiles de Mantenimiento

```bash
# Ver logs de la DB
docker compose logs db

# Reiniciar solo el contenedor web
docker compose restart web

# Parar todo (sin borrar datos)
docker compose down

# Parar todo Y borrar la base de datos (¡CUIDADO!)
docker compose down -v

# Acceder al shell del contenedor web
docker compose exec web sh

# Acceder a la base de datos con psql
docker compose exec db psql -U postgres -d presupuesto_db
```

---

## 8. Siguientes Pasos Recomendados (Producción)

> [!IMPORTANT]
> Para un entorno de producción real, configura un proxy inverso como **Nginx** o **Caddy**
> para proveer HTTPS y manejar el tráfico en los puertos 80/443.

```bash
# Ejemplo básico con Nginx instalado en el servidor host:
# /etc/nginx/sites-available/presupuesto
server {
    listen 80;
    server_name tu-dominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
