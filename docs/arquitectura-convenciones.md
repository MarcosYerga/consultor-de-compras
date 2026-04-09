# Arquitectura por capas y convenciones internas

Guia corta para mantener SOLID, DRY y evitar codigo legacy/no usado.

## 1. Capas y dependencias permitidas

1. `apps/web`: solo UI + cliente HTTP (`apps/web/src/api`). No parsea HTML ni conoce conectores.
2. `apps/api`: capa de composicion y transporte HTTP. No implementa scraping por retailer.
3. `packages/connectors`: dominio de comparacion + adaptadores de retailers.
4. `packages/api-types`: contrato compartido (schemas/tipos) para web, API y conectores.

Regla de direccion:

- `web -> api-types`
- `api -> api-types, connectors`
- `connectors -> api-types`
- `api-types -> (sin dependencias internas del repo)`

## 2. Principios SOLID aplicados en este repo

1. SRP: cada conector transforma una fuente externa concreta a `SearchHit`.
2. OCP: para nueva cadena, crear `retailers/<cadena>/<cadena>.connector.ts` + mapper/tests sin tocar el motor general.
3. LSP: cualquier `RetailerConnector` debe cumplir `search` y `healthcheck` sin romper `compare-engine`.
4. ISP: contratos pequenos (`RetailerConnector`, `SearchHit`) en lugar de interfaces gigantes.
5. DIP: `buildApp` recibe dependencias/config inyectadas, no conoce implementaciones concretas de scraping.

## 3. DRY y estructura de archivos

1. Reutilizar helpers HTTP en `packages/connectors/src/http`.
2. Reutilizar parseo/mapeo en `retailers/<cadena>/<cadena>-mapper.ts` cuando aplique.
3. Evitar duplicar heuristicas de matching fuera de `matching.ts` y `economy.ts`.
4. Mantener `apps/api/src/index.ts` como composicion (wiring), no logica de negocio.

## 4. Convenciones de nombres

1. `createXConnector`: fabrica de conector por cadena.
2. `mapXToSearchHit`: traductor de payload externo a modelo interno.
3. `parseXHtml` / `extractX`: parseo puro sin side-effects.
4. `buildXRegistry`: composicion de conectores.

## 5. Regla anti-legacy / anti-dead-code

1. No dejar wrappers antiguos ni utilidades sin referencias.
2. Si un modulo se reemplaza, borrar export y archivo en el mismo PR.
3. CI ejecuta `npm run check`, que incluye `check:dead-exports`.
4. `check:dead-exports` usa `ts-prune` sobre API y conectores para detectar exports huérfanos.

## 6. Checklist de PR

1. Hay tests de regresion para cambios de parsing/matching.
2. `npm run check` en verde.
3. No hay imports circulares nuevos.
4. No hay codigo comentado tipo "legacy" pendiente de borrar.
5. Si se expone API publica nueva, se documenta en README y/o este archivo.
