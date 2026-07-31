# Quick start (≈ 5 minutos)

Guía mínima para levantar **Secured Note** en tu propio servidor con Docker Compose.

## Requisitos

- Docker y Docker Compose v2
- Puerto libre en el host (por defecto **3001**)

## Pasos

### 1. Clonar y preparar entorno

```bash
git clone <URL-del-repo> secured-note
cd secured-note
cp .env.example .env
```

Los valores por defecto funcionan para una prueba local en `http://localhost:3001`. Para producción, edita al menos:

| Variable | Valor típico |
|----------|--------------|
| `WEB_ORIGIN` | URL base que verá el usuario (p. ej. `https://notas.ejemplo.com`) |
| `NEXT_PUBLIC_SITE_URL` | Misma URL HTTPS, sin barra final |
| `HOST_PORT` | Puerto publicado en el host si no usas proxy |

> No commitees el archivo `.env`.

### 2. Arrancar

```bash
docker compose up -d --build
```

La primera ejecución construye la imagen (puede tardar unos minutos). Siguientes arranques son más rápidos.

### 3. Comprobar salud

```bash
curl -s http://localhost:3001/api/health | head
docker compose ps
```

- `/api/health` — salud lógica (JSON)
- `/readyz` — listo cuando SQLite responde

### 4. Abrir la aplicación

Navega a:

```
http://localhost:3001
```

(o la URL que hayas configurado en `WEB_ORIGIN`).

### 5. Completar el asistente de configuración (wizard)

En la **primera visita** aparece un modal de dos pasos:

1. **Marca** — nombre de la instancia, colores y logo opcional.
2. **Aviso legal** — texto de descargo que verán emisor y receptor.

Tras guardar, la configuración queda en SQLite (`project_config`). El wizard no vuelve a mostrarse hasta un [reset documentado](OPERATIONS.md#reiniciar-el-asistente-de-configuración).

### 6. Crear tu primera nota

1. Escribe el contenido en la página principal.
2. Opcional: define TTL o contraseña adicional.
3. Copia el enlace generado (incluye la clave en el fragmento `#` — **no la compartas por separado del ID**).
4. Abre el enlace en otra sesión o dispositivo para verificar la lectura única.

## HTTPS con Traefik (opcional)

Si ya tienes Traefik con red `traefik-public` y resolutor ACME:

```bash
# Añade variables de .env.traefik.example a tu .env
docker compose -f docker-compose.yml -f docker-compose.traefik.example.yml up -d --build
```

Detalles en [README §6](../README.md#docker--traefik-https-en-producción).

## Desarrollo local (sin Docker)

```bash
cd web
pnpm install
pnpm dev
```

Por defecto Next escucha en `http://localhost:3000`. Alinea `WEB_ORIGIN` en el `.env` de la raíz. SQLite local suele estar en `web/data/secured-note.db`.

## Siguientes pasos

| Tema | Documento |
|------|-----------|
| Mapa de módulos y flujo cripto | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Backup, logs, reset, incidencias | [OPERATIONS.md](OPERATIONS.md) |
| Configuración completa | [README §7](../README.md#7-configuración) |
| Contribuir al proyecto | [CONTRIBUTING.md](../CONTRIBUTING.md) |
