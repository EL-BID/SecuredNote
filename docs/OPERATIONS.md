# Operaciones

Guía para operadores que **self-hostean** Secured Note: backup del volumen de datos, logs, reinicio del wizard y resolución de incidencias frecuentes.

## Datos persistentes

| Artefacto | Ubicación típica | Contenido |
|-----------|------------------|-----------|
| Base SQLite | `/data/secured-note.db` (contenedor) | Notas cifradas, `project_config`, intentos de contraseña |
| Volumen Compose | `app-data` → montado en `/data` | Todo lo anterior |

El servidor **no** puede descifrar el contenido de las notas; el backup protege ciphertext y configuración de instancia.

## Backup del volumen `/data`

### Opción A — Copia del fichero SQLite (recomendada)

Con el stack en marcha (lectura consistente con WAL: preferible pausa breve o copia en ventana de bajo tráfico):

```bash
# Nombre del contenedor desde .env (default: secured-note-app)
docker exec secured-note-app sqlite3 /data/secured-note.db ".backup /data/backup.db"
docker cp secured-note-app:/data/backup.db ./secured-note-$(date +%Y%m%d).db
docker exec secured-note-app rm -f /data/backup.db
```

### Opción B — Snapshot del volumen Docker

```bash
docker run --rm \
  -v secured-note_app-data:/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/secured-note-data-$(date +%Y%m%d).tar.gz -C /data .
```

> Sustituye `secured-note_app-data` por el nombre real (`docker volume ls`).

### Restaurar

1. `docker compose down`
2. Restaura el fichero en el volumen (o reemplaza el volumen desde el tarball).
3. `docker compose up -d`
4. Verifica `/readyz` y una nota de prueba.

**Frecuencia sugerida:** según tu política; para instancias con pocas notas, backup diario o semanal suele bastar.

## Logs y observabilidad

```bash
# Seguir logs del servicio
docker compose logs -f app

# Estado de contenedores
docker compose ps

# Salud
curl -s http://localhost:3001/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/readyz
```

| Endpoint | Significado |
|----------|-------------|
| `/api/health` | JSON de salud; usado por healthcheck Docker |
| `/healthz` | Comprobación rápida |
| `/readyz` | **200** solo si SQLite está operativo |

Nivel de log: variable `LOG_LEVEL` en `.env` (`info` por defecto). Cambios requieren reinicio: `docker compose restart app`.

## Reiniciar el asistente de configuración

El setup de instancia es **write-once**: tras completar el wizard, `POST /api/project-config` responde **409**. Para volver a mostrar el asistente (marca + aviso legal) sin borrar notas:

### Script oficial (Docker)

```bash
./scripts/reset-project-config.sh
```

Simular sin cambios:

```bash
./scripts/reset-project-config.sh --dry-run
```

El script elimina la fila `project_config` y reinicia el servicio `app`. Documentación ampliada en [README §10](../README.md#reiniciar-el-asistente-de-configuración-wizard).

### Desarrollo local

```bash
SQLITE_PATH=web/data/secured-note.db ./scripts/reset-project-config.sh --local
```

Reinicia manualmente `pnpm dev` después.

### Comprobación

- `GET /api/project-config` → `{"configured":false}`
- Modal de setup visible en ventana privada

## Reinicio y actualización

```bash
# Reinicio suave
docker compose restart app

# Rebuild tras cambio de código o NEXT_PUBLIC_*
docker compose up -d --build

# Parar sin borrar datos
docker compose down

# Parar y ELIMINAR volumen (destructivo)
docker compose down -v
```

> `docker compose down -v` borra **todas** las notas y la configuración de instancia.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `/readyz` devuelve 503 | SQLite inaccesible o corrupto | `docker compose logs app`; comprobar `SQLITE_PATH` y permisos del volumen |
| App no arranca tras deploy | `WEB_ORIGIN` / puertos incorrectos | Revisar `.env`; `HOST_PORT` vs proxy |
| CSP o enlaces rotos en prod | `WEB_ORIGIN` ≠ URL pública | Alinear `WEB_ORIGIN` y `NEXT_PUBLIC_SITE_URL` (rebuild si cambias `NEXT_PUBLIC_*`) |
| Wizard no aparece tras reset | Caché del navegador o servicio sin reiniciar | Ventana privada; confirmar `docker compose restart app` |
| `409` al guardar setup | Instancia ya configurada | Usar [reset](#reiniciar-el-asistente-de-configuración) |
| Nota "ya destruida" | Lectura previa o TTL expirado | Comportamiento esperado (lectura única) |
| Contraseña rechazada 3 veces | Rate limit por IP | Esperar ~60 s (`retryAfter` en respuesta 429) |
| `sqlite3` no encontrado en contenedor | Imagen antigua | Rebuild: `docker compose up -d --build` |

### Permisos en `/data`

La imagen usa entrypoint que ajusta permisos del volumen. Si ves errores de escritura:

```bash
docker compose logs app | grep -i sqlite
docker exec secured-note-app ls -la /data
```

### Desarrollo local: base bloqueada

Si `pnpm dev` deja el fichero bloqueado, cierra el proceso antes de copiar o resetear `web/data/secured-note.db`.

## Seguridad operativa

- Termina TLS en el proxy (Traefik, nginx, Caddy); ver [README §6 Traefik](../README.md#docker--traefik-https-en-producción).
- No expongas el puerto de la app directamente a Internet sin TLS.
- Actualiza la imagen base periódicamente (`docker compose build --pull`).
- Reportes de seguridad: `web/public/.well-known/security.txt`.

## Referencias cruzadas

| Tema | Documento |
|------|-----------|
| Arranque en 5 min | [QUICKSTART.md](QUICKSTART.md) |
| Flujo cripto y módulos | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Matriz env vs SQLite | [README §7](../README.md#7-configuración) |
| Contribuir cambios | [CONTRIBUTING.md](../CONTRIBUTING.md) |
