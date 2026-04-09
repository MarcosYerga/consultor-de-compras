# Consultor de compras

Comparador de precios entre **supermercados en España**: escribes una lista en texto libre y la API consulta varias cadenas en paralelo, aplica reglas de **multimarca** y **matching** sobre los resultados, y devuelve dónde suele salir más barato cada ítem (referencia según la web de cada cadena).

Pensado como **MVP sin base de datos**: cada comparación es stateless; no se guardan listas ni históricos en servidor.

**Repositorio público** — código de referencia para portafolio: TypeScript estricto, monorepo claro, tests y CI.

### Estado del MVP (listo para probar)

| Ámbito | Estado |
| ------ | ------ |
| Fase 0 biblia (monorepo, API, web, health, modo demo) | Listo |
| `POST /v1/compare`, `GET /v1/retailers`, health por cadena | Listo |
| Conectores **reales** (opcionales con env) | **Mercadona**, **Lidl**, **Día**, **Ahorramas**, **Eroski**, **Carrefour**, **El Corte Inglés** (`*_MODE=live`; ver `.env.example`) |
| Eroski en vivo | `EROSKI_MODE=live`: parsea el HTML de búsqueda de **supermercado.eroski.es** (precio y nombre en `data-metrics`) |
| Carrefour / El Corte Inglés en vivo | Pueden devolver **403/WAF** desde IPs de datacenter; el código parsea `__NEXT_DATA__` si el HTML es accesible |
| Comparación de **cesta** total (`mode: basket`) | Listo (suma por cadena + resumen en la web) |
| Lista en **localStorage** en el navegador | Listo |

Validación local: `npm run check` (lint + test + build).

## Stack

| Parte        | Tecnología                          |
| ------------ | ----------------------------------- |
| Monorepo     | npm workspaces                      |
| Contrato     | `packages/api-types` (Zod + tipos) |
| Conectores   | `packages/connectors` (un módulo por cadena) |
| API          | Node 20+, Fastify, rate limit, CORS |
| Web          | React 18, Vite, TanStack Query      |

## Requisitos

- **Node.js ≥ 20**
- npm 10+

## Puesta en marcha

```bash
npm install
npm run dev
```

- Front: [http://localhost:5173](http://localhost:5173) (proxy de `/v1` → API)
- API: [http://localhost:3001](http://localhost:3001)

Variables opcionales: copia `.env.example` a `.env` en `apps/api` si quieres ajustar puerto o los modos por cadena (incluidos `EROSKI_MODE`, `CARREFOUR_MODE`, `EL_CORTE_INGLES_MODE`).

### Cómo probar (rápido)

1. `npm install` y `npm run dev` (compila paquetes y levanta API + web).
2. Abre el front, deja el modo **demo** activado para no depender de la red en los siete conectores (sigue siendo coherente con la biblia).
3. Para probar **cadenas en vivo**, en `apps/api/.env` pon el `*_MODE=live` correspondiente, reinicia la API y desactiva el checkbox “Modo demo” en la UI (o usa `?demo=1` solo si quieres forzar respuesta demo en backend).
4. Opcional: `npm run check` antes de subir cambios.

### Modo Live con cache stale (real)

Para despliegue en VPS, el backend usa estrategia **live-first con cache real por cadena**:

1. Intenta obtener datos **live** del retailer.
2. Si live falla (timeout, 403/WAF, cambios HTML) o devuelve vacío, intenta reutilizar la última respuesta **live** cacheada para esa consulta.
3. Si tampoco hay cache fresca, la cadena queda no disponible para esa línea (sin inventar precios).
4. La API devuelve `source` por resultado (`live` | `stale` | `demo`) y la UI lo muestra con badge.

Esto mantiene la app usable sin falsear datos: `stale` sigue siendo dato real capturado previamente en live, no mock.

## Demo en vivo y capturas (portafolio)

- **Despliegue:** cuando tengas una URL pública (Vercel, Fly.io, Railway, etc.), añádela aquí y en la descripción del repositorio en GitHub para que el primer vistazo sea en un clic.
- **Captura de la tabla de resultados:** suma mucha credibilidad. Instrucciones y convención de nombres en [`docs/screenshots/README.md`](./docs/screenshots/README.md).

## Mercadona (conector “live”)

Mercadona **no expone un endpoint documentado de “búsqueda global”** en la API pública observada; el conector `live` usa el listado de **categorías** (`/api/v1_1/categories/`), elige las categorías más alineadas con tu texto y descarga el detalle de cada una para reunir productos; luego filtra por similitud con la línea de la lista.

- Activa el modo real con `MERCADONA_MODE=live` (y opcionalmente `MERCADONA_WAREHOUSE`, p. ej. `vlc1`, `mad1`).
- Por defecto (`mock`) el conector de Mercadona es **simulado** (útil para CI y demos sin red).

**Aviso:** respeta los términos de uso y `robots.txt` de cada sitio; no está permitido el abuso ni el scraping masivo. Uso razonable, identificación clara con User-Agent y revisión legal antes de un despliegue comercial.

## Lidl (conector “live”)

Lidl España expone una **API JSON de búsqueda** usada por la propia web: `GET /q/api/search` con parámetros `assortment=ES`, `locale=es_ES`, `version=v2.0.0` y la consulta en `query`. El conector parsea el array `items` (productos con `gridbox.data`: título, URL canónica y precio).

- Activa el modo real con `LIDL_MODE=live`. Por defecto es `mock` (CI y desarrollo sin depender de la red).

## Día (conector “live”)

La web de Día sirve la búsqueda con HTML SSR; el JSON de resultados va embebido (p. ej. en `script#vike_pageContext`). El conector parsea ese bloque y mapea `search_items` a `SearchHit`.

- Activa el modo real con `DIA_MODE=live`. Por defecto es `mock`.

## Ahorramas (conector “live”)

Ahorramas usa Salesforce Commerce Cloud; la búsqueda devuelve fragmento HTML (`Search-ShowAjax`). El conector parsea `div.product` y metadatos en `data-gtm-layer` (JSON).

- Activa el modo real con `AHORRAMAS_MODE=live`. Por defecto es `mock`.

## Eroski (conector “live”)

El supermercado online **supermercado.eroski.es** devuelve resultados de búsqueda en HTML; cada producto enlaza con `data-metrics` (JSON tipo GA4) donde vienen `item_name` y `price`.

- Activa `EROSKI_MODE=live`. Por defecto es `mock` (CI y desarrollo sin depender de la red).

## Carrefour (conector “live”)

Se pide la página de búsqueda (`/s?q=…&language=es`) y se intenta leer el JSON embebido de Next.js (`__NEXT_DATA__`). **Cloudflare** suele bloquear peticiones automáticas; si recibes error en comparación, esa cadena quedará como “No disponible”.

- Activa `CARREFOUR_MODE=live`. Por defecto es `mock`.

## El Corte Inglés (conector “live”)

Misma idea: búsqueda en supermercado y parseo de `__NEXT_DATA__`. **Akamai** puede responder 403 a IPs de servidor.

- Activa `EL_CORTE_INGLES_MODE=live`. Por defecto es `mock`.

## Scripts útiles

| Comando          | Descripción                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Compila paquetes y arranca API + web     |
| `npm run build`  | Build de `api-types`, `connectors`, apps |
| `npm test`       | Vitest en paquetes con tests             |
| `npm run lint`   | ESLint en workspaces                     |
| `npm run format` | Prettier                                   |

## Arquitectura (resumen)

```
apps/web  ──POST /v1/compare──►  apps/api  ──►  compareShoppingLines()
                                                    │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    ▼                              ▼                              ▼
             normalize + matching           RetailerConnector.search() × 7    timeouts / errores aislados
```

Cada cadena implementa el mismo contrato (`search` + `healthcheck`); el motor de comparación no conoce HTML ni URLs concretas.

**Economía vs. precio del pack:** si la línea **no** incluye cantidad deseada (gramos, litros, multipack…), al elegir el mejor producto entre varios candidatos de una misma cadena y al declarar el “mejor precio” entre cadenas se usa **€/kg o €/L** (derivado de `net_quantity_g` / `volume_ml` del conector, o **parseado del título y `pack_size_label`** si solo vienen en texto). Si el usuario escribe cantidad (`500 g`, `1 l`…), se vuelve a priorizar el **precio del pack** entre candidatos.

## Si revisas el código (portafolio)

- **Contrato estable** entre front y back en `packages/api-types` (menos “drift” entre equipos).
- **Conectores desacoplados**: cada cadena traduce su fuente al modelo `SearchHit`; el motor de comparación solo ve datos ya normalizados.
- **Mercadona `live`**: sin endpoint de búsqueda global documentado; se acota por categorías y se filtra en memoria (compromiso honesto, documentado arriba).
- **Lidl `live`**: una petición JSON por consulta; mapeo y tests con **fixture** en `packages/connectors/src/retailers/lidl/fixtures/`.
- **Día y Ahorramas `live`**: HTML + extracción/parseo; tests con fixtures en cada carpeta `retailers/dia` y `retailers/ahorramas`.
- **Eroski `live`**: parseo de HTML de búsqueda + `data-metrics`; tests en `eroski-parse-search.test.ts`.
- **Carrefour / El Corte Inglés `live`**: utilidad compartida `util/next-data-products.ts` para recorrer JSON de `__NEXT_DATA__`.
- **Economía (`economy.ts`)**: detección de cantidad en la línea y comparación por €/kg o €/L cuando aplica.
- **Tests** en lógica pura (mapeo, normalización, matching) y **CI** en GitHub Actions.

## Documentación de producto

La especificación funcional y de dominio vive en [`BIBLIA_IMPLEMENTACION_APP_COMPRAS.md`](./BIBLIA_IMPLEMENTACION_APP_COMPRAS.md).

## Licencia

MIT — ver [LICENSE](./LICENSE).

---

*Precios según web de la cadena; pueden variar por tienda.*
