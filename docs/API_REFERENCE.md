# API Reference (v1)

Referencia operativa de la API del proyecto, con enfoque de uso real en VPS.

## 1. Base URL y versión

- Base local: `http://localhost:3001`
- Prefijo de versión: `/v1`
- Estilo: JSON sobre HTTP

## 2. OpenAPI / Swagger

- UI: `/docs` (configurable con `SWAGGER_ROUTE_PREFIX`)
- Especificación JSON: `/docs/json`

Variables relacionadas:

- `SWAGGER_ENABLED=true|false`
- `SWAGGER_ROUTE_PREFIX=/docs`
- `API_PUBLIC_URL=https://api.tu-dominio.com` (opcional, para `servers` en OpenAPI)

## 3. Seguridad y prácticas profesionales aplicadas

1. Rate limiting por IP con `@fastify/rate-limit`.
2. Cabeceras de seguridad con `@fastify/helmet`.
3. CORS configurable (`CORS_ORIGIN`).
4. Errores consistentes en JSON con `request_id` para trazabilidad.
5. Modo demo explícito y trazable (`demo=true` en respuesta).
6. Contrato compartido en `packages/api-types` para evitar drift entre front/back.

## 4. Modelo de error

Errores de validación y errores internos siguen un payload homogéneo:

```json
{
  "error": "validation_error",
  "message": "Petición inválida",
  "request_id": "req-123",
  "details": {}
}
```

Campos:

- `error`: código de error (`validation_error`, `internal_error`, `not_found`, etc.)
- `message`: mensaje legible
- `request_id`: id de petición para correlación en logs
- `details`: opcional (normalmente en validación)

## 5. Endpoints

### 5.1 GET /v1/health

Health del servicio API.

Respuesta 200:

```json
{
  "ok": true,
  "service": "consultor-de-compras-api"
}
```

### 5.2 GET /v1/retailers

Lista de cadenas soportadas por el motor.

Respuesta 200:

```json
{
  "retailers": [
    { "id": "ahorramas", "name": "Ahorramas" },
    { "id": "carrefour", "name": "Carrefour" }
  ]
}
```

### 5.3 GET /v1/retailers/health

Estado por cadena (`ok`, `latency_ms`, `error`).

Respuesta 200 (ejemplo):

```json
{
  "retailers": [
    {
      "id": "mercadona",
      "ok": true,
      "latency_ms": 233,
      "error": null
    }
  ]
}
```

### 5.4 POST /v1/compare

Compara líneas de compra entre cadenas.

Query params opcionales:

- `demo=1`: fuerza modo demo para esa request.

Body:

```json
{
  "lines": ["leche entera 1 l", "aceite de oliva 1 l"],
  "mode": "basket"
}
```

Reglas:

- `lines`: 1..40 elementos
- cada línea: string no vacío, máx 800 chars
- `mode`: `per_item` o `basket`

Respuesta 200 (resumen):

```json
{
  "compared_at": "2026-04-09T20:00:00.000Z",
  "demo": false,
  "mode": "basket",
  "items": [],
  "basket": {}
}
```

## 6. Ejemplos curl

### Health

```bash
curl -s http://localhost:3001/v1/health
```

### Compare (per item)

```bash
curl -s -X POST http://localhost:3001/v1/compare \
  -H "Content-Type: application/json" \
  -d '{"lines":["leche entera 1 l","arroz redondo 1 kg"],"mode":"per_item"}'
```

### Compare en demo forzado

```bash
curl -s -X POST "http://localhost:3001/v1/compare?demo=1" \
  -H "Content-Type: application/json" \
  -d '{"lines":["garbanzos cocidos 400 g"]}'
```

## 7. Operación en VPS

Variables clave recomendadas:

- `DEMO_MODE=false`
- `RETAILER_TIMEOUT_MS=8000` (ajustar según latencia real)
- `LIVE_CACHE_MAX_AGE_MINUTES=360`
- `CORS_ORIGIN=https://tu-frontend.com`
- `SWAGGER_ENABLED=true` (en privado) o `false` (si no quieres exponer docs)

Checklist de despliegue:

1. `npm run check` en verde.
2. Swagger accesible y endpoints documentados.
3. Health global y por retailer verificados.
4. Logs monitorizando `request_id` y errores por cadena.
5. Rate limits acordes al tráfico esperado.
