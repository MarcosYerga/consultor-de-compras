# Biblia de implementación — App de comparación de precios (supermercados España)

**Versión:** 1.4  
**Fecha de referencia:** abril 2026  
**Estado:** documento vivo — actualizar con decisiones de producto y legal.  
**Stack acordado:** TypeScript end-to-end — **React** (frontend) + **Node.js** (backend).  
**Persistencia:** **sin base de datos** (ni listas ni precios guardados en servidor; ver §1.4).  
**Cadenas (v1):** **7 retailers** acordados (§1.5).  
**Entrada de lista:** **texto libre** normalizado y emparejado contra resultados en vivo (§2.1 y §7).  
**Uso:** ayudar a **elegir a qué supermercado ir** (precio **tienda física** como objetivo; ver §1.6).  
**Límite v1:** **40 líneas** máximo por comparación (§2.4).  
**Multimarca:** por ítem y cadena, usar el producto **más barato** entre variantes relevantes (§6.1 y §7.4).  
**UI:** mostrar **formato y cantidad** en cada oferta para comparaciones justas; aviso legal de precios (§1.7 y §2.6).

---

## 1. Propósito y alcance

### 1.1 Visión

Aplicación que recibe una **lista de compra en texto libre** (o voz transcrita a texto) y devuelve, para **cada producto de la lista**, en **qué cadena sale más barato** (y la información necesaria para decidir **a qué super ir**), consultando en vivo **siete cadenas** acordadas en España. Incorpora **ofertas** cuando sea posible, regla **multimarca** (§7.4) y **fiabilidad del emparejado** (no hay histórico almacenado).

### 1.2 Fuera de alcance (inicial)

- Reserva o compra directa en nombre del usuario (salvo enlaces externos opcionales).
- Comparación de servicios de entrega (solo si se define explícitamente en una fase posterior).
- Garantizar el precio de **una tienda concreta** en tu calle: lo que se muestra es el precio que la **web de la cadena** expone como referencia de tienda / recomendado (ver §1.6); puede haber variación por zona sin que la app lo sepa en v1.

### 1.3 Principios de producto

| Principio | Implicación técnica |
|-----------|---------------------|
| **Confianza** | Timestamps, fuente y nivel de confianza del match por producto. |
| **Claridad** | Precio unitario homogéneo cuando exista; si no, **formato/cantidad** visibles para comparar sin engaño (§2.6). |
| **Legalidad** | Priorizar fuentes permitidas; scraping acotado y revisado. |
| **Mantenibilidad** | Conectores aislados por cadena; fallos no tumbar el sistema global. |
| **Velocidad** | Sin persistir catálogos: scraping **bajo demanda** y **en paralelo** por cadena (§8.4). |

### 1.4 Sin base de datos (decisión de producto)

- **No** hay PostgreSQL ni almacenamiento de usuario/listas/precios históricos en servidor.
- Cada comparación es **stateless**: el backend recibe la lista, consulta en vivo (scraping / búsqueda en web de cada cadena), compara en **memoria** y devuelve la respuesta.
- La **lista** puede vivir solo en el **navegador** (estado de React, `sessionStorage` o `localStorage` si se desea “recordar” sin backend).
- Implicación: **no** hay “última sync” global ni histórico de precios; la frescura es **ahora** (salvo caché en memoria opcional de pocos minutos solo para aliviar rate limits, no obligatoria).

### 1.5 Retailers objetivo (7 cadenas)

Lista de trabajo para v1 (orden alfabético; ajustar slugs técnicos en código):

| # | Cadena | Nota |
|---|--------|------|
| 1 | **Ahorramas** | Cobertura regional; conector acotado a su web si aplica. |
| 2 | **Carrefour** | |
| 3 | **Dia** | |
| 4 | **El Corte Inglés** | |
| 5 | **Eroski** | Supermercado online (HTML de resultados). |
| 6 | **Lidl** | |
| 7 | **Mercadona** | |

> Si en implementación una cadena no ofrece búsqueda scrapeable de forma estable, sustituir por **Alcampo** u otra de similar peso en España, manteniendo **7** conectores.

### 1.6 Precio “para ir al súper” (tienda física)

- **Objetivo de producto:** el usuario quiere decidir **a qué supermercado ir**; el precio de referencia es el de **compra en tienda**, no el de delivery exclusivo.
- **Fuente técnica:** lo que se puede obtener sin BD es lo que cada **sitio web** publica (muchas cadenas muestran precio de tienda o un precio único de referencia). Si una web solo muestra precio online distinto, habrá que **documentarlo en la UI** (“precio según web en fecha X”) para no prometer exactitud de caja.
- **Sin código postal en v1:** no se modela tienda cercana; el resultado es **por cadena**, no por dirección.

### 1.7 Aviso legal / copy en pantalla (v1)

Texto que debe aparecer de forma **visible** en la interfaz (pie de página, banner discreto o bajo el bloque de resultados), en la versión en castellano acordada:

> **Precios según web de la cadena; pueden variar por tienda.**

(Ortografía y mayúsculas pueden ajustarse al estilo de la app; el significado debe conservarse.)

---

## 2. Requisitos funcionales

### 2.1 Usuario final

- Introducir la compra como **texto libre** (un ítem por línea o párrafo separable): p. ej. `leche entera 1l`, `pan de molde`, `aceite girasol`.
- El sistema **normaliza** cada línea (minúsculas, quitar dobles espacios, unificar `1l` / `1 l`, etc.) y usa ese texto como **consulta de búsqueda** en cada supermercado.
- **Multimarca:** en una misma búsqueda (p. ej. “garbanzos”) pueden salir varias marcas; **por cadena** se toma la variante **más barata** entre los resultados que sigan siendo relevantes para la línea (§7.4).
- **Salida principal:** una **lista de productos** (una fila por línea de la lista) con **en qué cadena está más barato** ese ítem (y filas opcionales por cadena para comparar).
- Ver **comparativa por ítem**: precio, unidad (€/L, €/kg…), enlace, oferta; aviso de **confianza baja** si el match es flojo.
- **Formato y cantidad visibles:** para cada resultado (sobre todo en comparaciones **multimarca**), mostrar **formato del envase** y **cantidad neta** cuando el conector las pueda extraer (p. ej. “lata 400 g”, “pack 6×1 L”), además del **precio de etiqueta** del pack. Así el usuario ve si una oferta “más barata” es comparable (misma categoría pero distinto peso/volumen). Ver §2.6.
- Ver **comparativa de cesta** (opcional): suma por cadena en base a los mismos resultados en memoria.
- Filtrar en cliente por: cadena, solo ofertas, etc.
- **Persistencia local (opcional):** guardar borrador de lista en `localStorage` desde React — **sin** API de guardado en servidor (coherente con §1.4).

### 2.2 Administración / operaciones

- Endpoint o panel mínimo: **healthcheck** por cadena (latencia, último error en memoria / logs).
- Sin “última sync” global: solo métricas de **requests** y fallos recientes.

### 2.3 No funcionales

- **Rendimiento:** la comparación completa depende de **7 búsquedas en paralelo por ítem** (o por lote acotado); objetivo: minimizar latencia con **paralelismo**, **timeouts** por cadena y parsers **ligeros** (HTML con cheerio antes que navegador headless si el sitio lo permite).
- **Disponibilidad:** si una cadena falla o hace timeout, **se muestran el resto de cadenas** y para la que falló un **mensaje claro** (“No disponible”, “Tiempo agotado”); sin lógica extra de reintentos en UI más allá de lo que ya haga el backend en la misma petición.
- **Auditoría:** logs de servidor sin almacenar el contenido completo de listas de forma persistente (solo trazas técnicas si hace falta depurar).

### 2.4 Límite de ítems (v1)

- **Máximo 40 líneas** por petición a `POST /v1/compare` (validación en API con Zod y mensaje claro en el front si se supera).

### 2.5 Modo demo / mock

- **API:** query opcional `?demo=1` o variable de entorno `DEMO_MODE=true` que devuelva respuestas **fijas** sin llamar a retailers (útil para tests, demos y desarrollo sin bloqueos).
- **Front:** opcionalmente un toggle “Demo” que llame al endpoint demo o use datos mock en cliente.

### 2.6 Presentación en UI: comparación justa entre marcas y formatos

- **Obligatorio:** junto al precio y nombre del producto, mostrar **todo lo que permita juzgar la comparación**:
  - **Precio del pack** (€) y, si existe en datos, **€/kg**, **€/L** o **€/unidad** homogénea.
  - **Cantidad neta** cuando se conozca: gramos, mililitros, litros, o texto literal del envase (`packSizeLabel`, p. ej. “200 g”, “6 x 90 g”).
- Si **solo** se dispone del precio del pack sin €/kg o €/L, la UI debe dejar claro el **formato** (p. ej. “200 g” vs “400 g”) para que el usuario vea si la comparación entre cadenas es equitativa.
- Si el backend detecta **diferencia fuerte de formato** entre el ganador y otra cadena (p. ej. distinto peso neto con misma categoría), puede exponer un campo `comparison_note` o `format_warning` para resaltar en UI (“revisar: distinto tamaño de envase”).
- El **aviso legal** de §1.7 debe estar presente en las pantallas de resultados (o en layout global).

---

## 3. Consideraciones legales y de cumplimiento

> **Obligatorio:** revisión por asesor legal antes de producción con scraping o volumen alto.

### 3.1 Documentos a revisar

- Términos y condiciones y política de robots de cada sitio fuente.
- RGPD: minimización de datos de usuario; bases legales para analytics y cuentas.
- Propiedad intelectual: no reproducir catálogos completos sin derecho; valor añadido = agregación y comparación con reglas claras.

### 3.2 Directrices técnicas de ingesta

- Respetar **robots.txt** y límites razonables de frecuencia.
- Identificación clara del **User-Agent** de servicio (contacto en cabecera o página de estado).
- No eludir medidas de seguridad (CAPTCHA, paywalls) de forma automatizada no autorizada.
- **Retención:** política de borrado de snapshots HTML crudos si se almacenan.

---

## 4. Arquitectura lógica

```
┌──────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React (Vite)    │────▶│  API REST    │────▶│  Normalización  │
│  texto libre     │     │  Node + TS   │     │  + comparación  │
└──────────────────┘     └──────────────┘     └────────┬────────┘
                                                        │
                     ┌──────────────────────────────────┼──────────────────────────────────┐
                     ▼                                  ▼                                  ▼
            ┌────────────────┐               ┌─────────────────┐               ┌───────────────┐
            │ Matching sobre │               │  Resultados en  │               │ 7 conectores  │
            │ resultados vivo│◀──────────────│  memoria (por    │◀──────────────│ búsqueda/scrape│
            │ por ítem       │               │  request)        │               │ en paralelo    │
            └────────────────┘               └─────────────────┘               └───────────────┘
```
*(Sin base de datos: nada persistente entre peticiones salvo caché RAM opcional y breve.)*

### 4.1 Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| **Cliente** | **React + TypeScript** (Vite): área de texto o ítems, comparativa; opcional guardar borrador en `localStorage`. |
| **API** | **Node.js + TypeScript**: REST stateless, rate limit, validación (Zod); **no** persiste listas ni precios. |
| **Comparación** | Recibe resultados ya scrapeados en memoria; aplica reglas de oferta y ranking por ítem/cesta. |
| **Matching** | Tras búsqueda en cada cadena: elegir mejor fila (título + precio unitario) respecto al texto normalizado del usuario. |
| **Conectores (×7)** | Por retailer: construir URL de búsqueda o API pública, `fetch`, parsear HTML/JSON, devolver lista de candidatos **en memoria**. |
| **Paralelismo** | `Promise.all` / pool con límite (p. ej. 7 consultas simultáneas por ítem, o cola por cadena) para cumplir tiempo objetivo. |

### 4.2 Patrones

- **Anti-corruption layer:** cada conector devuelve un tipo común (`SearchHit[]`: título, precio, URL, señales de oferta).
- **Circuit breaker / timeout** por cadena: si Mercadona tarda > X s, devolver vacío para esa cadena y seguir.
- **Sin cola persistente:** no hay “ingesta programada”; opcionalmente **reintentos** en la misma petición (máx. 1) solo para errores de red.

### 4.3 Stack tecnológico (TypeScript: React + backend)

| Capa | Elección | Notas |
|------|----------|--------|
| **Frontend** | **React 18+** con **TypeScript**, empaquetado con **Vite**. | Estado con lo que prefiera el equipo (React Query / TanStack Query para servidor, Zustand o Context para UI). Routing: **React Router**. |
| **Backend** | **Node.js** + **TypeScript**. Runtime LTS actual. | Framework HTTP: **Fastify** (rendimiento, esquemas) o **Express** (ecosistema); validación con **Zod** compartida o duplicada con cuidado. |
| **Contrato API** | REST JSON **versionada** (`/v1/...`). | Tipos: generar **tipos TS** desde OpenAPI con `openapi-typescript` o mantener paquete `@app/api-types` compartido en monorepo. |
| **Persistencia** | **Ninguna** en servidor. | Opcional: **Redis** solo para rate limiting distribuido o caché RAM de respuestas idénticas (TTL 1–5 min); no es obligatorio en MVP. |
| **Scraping / browser** | **cheerio** + `fetch` primero; **Playwright** solo si la búsqueda exige JS y el coste de tiempo lo permite. | Objetivo: **respuesta rápida**; limitar instancias de navegador (pool pequeño o evitar). |
| **Calidad** | **ESLint** + **Prettier**; **Vitest** en front y back; **TypeScript strict**. | Un solo `tsconfig` base con `references` por paquete si monorepo. |

### 4.4 Monorepo y paquetes sugeridos

Estructura orientativa (ajustar nombres al gusto):

```text
repo/
├── apps/
│   ├── web/                 # React + Vite + TS — UI pública
│   └── api/                 # Servidor HTTP Node + TS
├── packages/
│   ├── api-types/           # Tipos DTO / contrato REST
│   └── connectors/          # Un módulo por cada uno de los 7 retailers
├── package.json             # workspaces (pnpm/npm/yarn)
├── turbo.json               # opcional: Turborepo
└── docker-compose.yml       # opcional: solo Redis si se usa; API puede ser `node` local
```

- **CORS:** configurar en `api` solo orígenes del front (`web`) por entorno.
- **Variables:** `.env` por app (`VITE_*` solo en web; secretos solo en servidor API).
- **Despliegue:** `web` → estáticos en CDN o bucket + CDN; `api` → un contenedor Node (sin Postgres obligatorio).

---

## 5. Modelo en memoria (TypeScript, sin persistencia)

No hay tablas en disco; solo **tipos** que viven durante el request (y en el cliente para pintar la UI).

### 5.1 Tipos principales (referencia)

- **`NormalizedLine`:** texto del usuario tras trim, posible split por líneas, minúsculas y limpieza básica.
- **`SearchHit`:** además de `title`, `priceEur`, `pricePerUnit?` (€/kg, €/L…), `productUrl`, `offerHint?`, incluir campos opcionales para la UI:
  - `packPriceEur` (si difiere de precio unitario),
  - `netQuantityGrams?` / `volumeMl?` o **string** `packSizeLabel?` (p. ej. “400 g”, “pack 6×1 L”) parseado del HTML cuando sea posible.
  - `unitPriceBasis`?: enum informativo (`PER_KG` | `PER_L` | `PER_UNIT` | `UNKNOWN`) para saber si la comparación entre cadenas es por **misma base** o solo visual.
- **`ItemComparison`:** línea normalizada + `cheapestOverall: { retailerId, hit }` (mejor precio entre cadenas) + `perRetailer: Record<RetailerId, SearchHit | null | { error: string }>` (mejor oferta **multimarca** por cadena, o error/timeout).
- **`CompareResponse`:** `{ items: ItemComparison[], comparedAt: ISO8601 }`.

### 5.2 Reglas de oferta (parseadas al vuelo)

- Campos opcionales en `offerHint` o texto crudo: `SECOND_UNIT_PERCENT`, `MULTIBUY_N_FOR_M`, `LOYALTY_ONLY`, `MIN_PURCHASE_EUR` — solo para explicar en UI o ajustar precio efectivo en memoria.

---

## 6. Motor de comparación

### 6.1 Por ítem

1. Partir el texto en **líneas** y normalizar cada una (`NormalizedLine`).
2. Por cada línea, en **paralelo** llamar a los **7 conectores** de búsqueda; cada uno devuelve `SearchHit[]` con **suficientes resultados** para cubrir variantes (p. ej. top **20–30** por cadena si el HTML lo permite; ver §8.4).
3. **Filtrado por relevancia:** de esos hits, quedarse con los que superen un **umbral de similitud** respecto a la línea del usuario (para no mezclar “garbanzo” con “hummus de garbanzo” si se puede evitar).
4. **Multimarca / múltiples SKUs:** dentro de los hits relevantes **por cadena**, quedarse con el que tenga **menor precio efectivo** (§6.3), comparando en **misma unidad** cuando exista €/kg o €/L. Si dos candidatos tienen **distinto peso/volumen** y no hay €/kg, usar precio de pack como último recurso pero marcar **menor confianza** o `format_warning` para la UI (§2.6).
5. Entre cadenas, el ganador del ítem es la cadena cuyo representante tenga **menor precio efectivo** entre los siete; la respuesta debe permitir mostrar **“dónde está más barato”** y, opcionalmente, el detalle por cadena.
6. Desempatar por confianza del match léxico si dos precios están muy cercanos.

### 6.2 Por cesta (fase avanzada)

- **Suma simple:** total por retailer sumando mejor precio por ítem en esa cadena.
- **Multi-tienda:** optimizar (heurística o ILP ligero) minimizando coste + penalización por número de tiendas.

### 6.3 Precio efectivo

Definir en configuración:

- Precio de etiqueta vs precio con oferta aplicada.
- Si la oferta requiere cantidad mínima, reflejarlo en UI o excluir del “mejor precio” por defecto.

---

## 7. Matching (texto libre → mejor resultado por cadena)

**Decisión de UX:** el usuario escribe **texto libre** (lista natural). Es el enfoque adecuado para un MVP sin BD: no hace falta un catálogo cerrado; la “verdad” es lo que devuelve la **búsqueda en cada web** en ese momento.

### 7.1 Flujo

1. **Entrada:** pegar o escribir varias líneas (`leche 1l`, `tomate pera`, …).
2. **Normalización:** misma línea en forma comparable (quitar ruido, unificar `1 l` / `1l`, opcional quitar acentos para fuzzy).
3. **Por cada cadena:** la consulta enviada al conector es la línea (o una variante corta si el sitio limita caracteres).
4. **Conjunto candidato:** puntuar cada `SearchHit` por **similitud** entre `title` y la línea del usuario; descartar los por debajo del umbral.

### 7.2 Salida

- **`match_confidence`** entre 0 y 1 y, si es útil, **`match_reason`** breve (“mejor coincidencia en título”).
- Si ningún hit supera umbral mínimo, marcar **“sin coincidencia clara”** para esa cadena y no inventar productos.

### 7.3 Alternativas (no prioritarias)

- Autocompletado guiado o categorías: solo tiene sentido si más adelante se añade persistencia o un catálogo mantenido a mano.

### 7.4 Multimarca (garbanzos, leche, etc.)

- Una misma línea (“garbanzos cocidos”, “leche entera”) puede devolver **varias marcas y formatos**.
- **Regla:** en cada cadena, entre los hits que sigan siendo **relevantes** para la línea, elegir el de **menor precio efectivo** (no el de título más parecido si es mucho más caro).
- Si el hit más barato tiene **baja similitud** de título, bajar `match_confidence` o mostrar aviso (“revisar”: podría ser otra categoría).
- **UI:** mostrar siempre **marca** (si está en el título) y **formato/cantidad** (§2.6); no basta con el precio solo.

---

## 8. Conectores y búsqueda en vivo

No hay ingesta batch: cada conector responde a **`search(normalizedQuery: string): Promise<SearchHit[]>`** (o rechaza con error controlado).

### 8.1 Contrato interno de conector

```ts
// Contrato orientativo
search(query: string, opts?: { signal?: AbortSignal; limit?: number }) => Promise<SearchHit[]>
healthcheck() => Promise<{ ok: boolean; latencyMs: number }>
```

- Implementación típica: construir URL de búsqueda del retailer (o llamar endpoint XHR que use la propia web), `fetch` con **User-Agent** identificable, parsear con **cheerio** o `JSON.parse`.

### 8.2 Estrategias por tipo de fuente

| Tipo | Herramientas típicas | Riesgo |
|------|----------------------|--------|
| Respuesta JSON en búsqueda | `fetch` + parse | Bajo si es estable |
| HTML de resultados | cheerio | Medio (cambios de maquetación) |
| SPA sin API clara | Playwright | Alto: **lento**; usar solo si no hay alternativa |

### 8.3 Comportamiento ante errores

- **Timeout** por cadena (configurable, p. ej. 4–8 s).
- **429/403:** backoff ligero **dentro** de la misma petición (una retry) o marcar cadena como fallida.
- **Selectores:** preferir constantes por archivo `retailer-name.ts` para facilitar mantenimiento.

### 8.4 Rendimiento (scraping “rápido”)

- **Paralelizar** las 7 cadenas con `Promise.all` por ítem de lista (7 requests concurrentes por línea).
- **Evitar Playwright** en el camino crítico si `fetch`+cheerio bastan.
- **Limitar** resultados parseados con un mínimo útil para **multimarca** (p. ej. top **20–30** por cadena si el sitio devuelve tantos); reducir solo si hay problemas de CPU o tamaño de HTML.
- **Lista larga:** procesar ítems en serie o con concurrencia acotada (p. ej. 2 ítems a la vez) para no disparar 7×N requests simultáneos y provocar bloqueos; ajustar según pruebas.
- **Keep-alive** HTTP (`fetch` con agent en Node o `undici`) para reutilizar conexiones TLS a los mismos hosts.

---

## 9. API (REST sugerida, stateless)

### 9.1 Endpoints orientativos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/v1/compare` | Cuerpo: `{ lines: string[] (máx. 40), mode?: "per_item" \| "basket" }`. Ejecuta búsqueda en las 7 cadenas y devuelve comparación **sin guardar** nada. |
| `GET` | `/v1/retailers` | Listado fijo de las 7 cadenas (slug, nombre visible). |
| `GET` | `/v1/health` | Salud del API; opcionalmente prueba rápida de un conector mock. |

**Cliente React:** usar `fetch` o **TanStack Query** con funciones tipadas importadas desde `packages/api-types` (o tipos generados desde OpenAPI) para evitar drift front/back.

### 9.2 Ejemplo de respuesta comparación (por ítem)

```json
{
  "compared_at": "2026-04-08T12:00:00Z",
  "items": [
    {
      "line": "garbanzos cocidos 400g",
      "cheapest_overall": {
        "retailer": "dia",
        "label": "Garbanzos cocidos marca D",
        "pack_size_label": "400 g",
        "net_quantity_g": 400,
        "pack_price_eur": 0.65,
        "unit": "EUR/kg",
        "unit_price_eur": 1.62,
        "match_confidence": 0.82,
        "format_warning": null
      },
      "per_retailer": {
        "mercadona": { "label": "…", "pack_size_label": "500 g", "pack_price_eur": 0.89, "error": null },
        "dia": { "label": "…", "pack_size_label": "400 g", "pack_price_eur": 0.65, "error": null },
        "lidl": { "label": null, "pack_price_eur": null, "error": "timeout" }
      }
    }
  ]
}
```

*(Sin `list_id`: no hay persistencia de listas en servidor. `per_retailer` refleja el **más barato multimarca** por cadena o error. Campos `pack_size_label` / `net_quantity_*` son **opcionales** según lo que extraiga cada conector.)*

### 9.3 Copy de UI (obligatorio)

- Mostrar el texto de §1.7 en las vistas de comparación (o en layout global).

---

## 10. Seguridad

- **HTTPS** obligatorio en producción.
- **Rate limiting** por IP (y por API key si más adelante hay cuentas).
- **Secrets** solo en vault / variables de entorno; rotación de claves de API si hay partners.
- **Sanitización** de entradas de lista (longitud máxima, anti-abuso).
- Si hay cuentas: **hash de contraseñas** (Argon2/bcrypt), 2FA opcional más adelante.

---

## 11. Observabilidad

- **Logs:** JSON con `request_id`, duración total de `/compare`, por cadena `search_duration_ms` y código de error si aplica (sin guardar el texto completo de la lista en logs de producción salvo modo debug).
- **Métricas:** `compare_requests_total`, `compare_latency_seconds`, `retailer_search_errors_total` por slug.
- **Alertas:** tasa de error de búsqueda por cadena > umbral; latencia P95 alta.

---

## 12. Testing

| Tipo | Alcance |
|------|---------|
| Unitario | Cálculo precio efectivo, parsing de ofertas, normalización texto (Vitest en `api` / `packages`). |
| Componentes / front | **React Testing Library** + Vitest para pantallas críticas (lista, resultados, aviso §1.7, columnas de formato/cantidad §2.6). |
| Contrato | Fixtures JSON de respuestas de retailers mockeadas; opcional **Pact** o tests contra OpenAPI. |
| Integración | Tests de conectores con **fixtures HTML/JSON** en disco; smoke contra staging con throttling. |
| E2E | **Playwright** en `web`: flujo crear lista → comparar (staging con datos congelados). |

---

## 13. Despliegue y entornos

| Entorno | Uso |
|---------|-----|
| `local` | `pnpm dev` en `apps/api` y `apps/web`; Redis opcional si se implementa rate limit/caché. |
| `staging` | Misma forma; mocks de retailers para no golpear producción en CI. |
| `production` | Un servicio Node (API) + CDN para el front estático; **sin** Postgres; backups no aplican al backend salvo logs externos. |

**Infra típica:** contenedor Node (Fly.io, Railway, Cloud Run, etc.) + frontend en Vercel/Netlify/S3+CloudFront.

---

## 14. Roadmap de implementación

### Fase 0 — Cimientos (1–2 semanas)

- [ ] Monorepo **TypeScript** (`apps/web` React+Vite, `apps/api` Node), ESLint/Prettier, CI básico.
- [ ] `POST /v1/compare` con **mock** de 7 retailers (respuestas fijas en memoria); `web`: textarea + resultado ficticio.
- [ ] `GET` `/health`.

### Fase 1 — MVP producto

- [ ] UI: texto libre (multilínea) → envío a `/v1/compare`; mostrar tabla por ítem y cadena.
- [ ] Implementar **1–2 conectores reales** (los más simples en HTML/JSON) + resto mock; matching léxico básico.
- [ ] Timeouts y paralelismo según §8.4.

### Fase 2 — Siete cadenas

- [ ] Completar conectores para las **7** cadenas de §1.5 (o sustitución acordada).
- [ ] Afinar normalización de líneas y umbrales de `match_confidence`.

### Fase 3 — Pulido

- [ ] Comparación de **cesta** total por cadena; reglas de oferta más finas en UI.
- [ ] (Opcional) caché en memoria/Redis de consultas idénticas (TTL corto) si hace falta aliviar carga.

---

## 15. Definiciones abiertas (checklist de decisión)

Decisiones ya tomadas (v1.4): **sin BD**; **texto libre** + matching; **7 retailers** (§1.5); **precio orientado a ir al súper** (§1.6); **aviso** “Precios según web de la cadena; pueden variar por tienda.” (§1.7); **UI con formato/cantidad** para comparaciones justas (§2.6); **máx. 40 líneas** (§2.4); **fallo por cadena** = mensaje y resto visible (§2.3); **multimarca** = más barato entre variantes relevantes (§7.4); **modo demo** (§2.5); **tipo `SearchHit` único**; normalización mínima; timeouts por cadena; caché opcional solo si hace falta.

Pendientes de documentar:

- [ ] Tratamiento explícito de club de fidelización y envíos en el copy de la app.
- [ ] Modelo de negocio (gratis, premium, afiliación) y su impacto en enlaces.

---

## 16. Glosario

| Término | Significado |
|---------|-------------|
| **Canónico** | En este diseño **no** hay catálogo canónico persistente; el “producto” es el `SearchHit` elegido por cadena tras la búsqueda. |
| **Conector** | Módulo que obtiene y traduce datos de una fuente externa. |
| **Precio efectivo** | Precio usado para comparar tras reglas de oferta y unidad. |
| **Freshness** | En modelo sin BD: el precio es **tan fresco como la búsqueda** de esa petición (marcar `compared_at` en la respuesta). |
| **Multimarca** | Varios productos candidatos para la misma línea; en cada cadena se elige el **más barato** entre los relevantes (§7.4). |
| **Formato / cantidad** | Datos mostrados en UI para comparar envases (g, ml, pack); no sustituyen el aviso legal si el precio varía en tienda. |

---

## 17. Control de cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-04-08 | Versión inicial de la biblia. |
| 1.1 | 2026-04-08 | Stack TypeScript: React (Vite) + Node backend; monorepo, testing y despliegue alineados. |
| 1.2 | 2026-04-08 | Sin base de datos; scraping bajo demanda y paralelo; 7 retailers fijos; texto libre + matching; API `POST /compare`. |
| 1.3 | 2026-04-08 | Tienda física como objetivo (§1.6); límite 40 ítems; multimarca; fallos por cadena; modo demo; salida “dónde más barato”. |
| 1.4 | 2026-04-08 | Aviso legal en UI (§1.7); formato/cantidad obligatorios en presentación (§2.6); `SearchHit` y JSON extendidos; `format_warning`. |

---

*Fin del documento.*
