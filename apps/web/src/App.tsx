import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { CompareMode, DataSource, ItemComparison, RetailerId } from '@consultor/api-types';
import { RETAILER_IDS } from '@consultor/api-types';
import { postCompare } from './api/compare.js';

const DEFAULT_LIST = `leche entera 1 l
pan de molde
aceite de girasol`;

const LS_LIST = 'consultor-de-compras:list-draft';
const LS_DEMO = 'consultor-de-compras:demo';
const LS_MODE = 'consultor-de-compras:compare-mode';

function readCompareMode(): CompareMode {
  try {
    const s = window.localStorage.getItem(LS_MODE);
    if (s === 'basket') return 'basket';
  } catch {
    /* ignore */
  }
  return 'per_item';
}

function readListDraft(): string {
  try {
    const s = window.localStorage.getItem(LS_LIST);
    if (s != null && s.trim() !== '') return s;
  } catch {
    /* modo privado u otro bloqueo */
  }
  return DEFAULT_LIST;
}

function readDemoFlag(): boolean {
  try {
    const s = window.localStorage.getItem(LS_DEMO);
    if (s === '0') return false;
    if (s === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function retailerLabel(id: RetailerId): string {
  return id.replaceAll('_', ' ');
}

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function sourceLabel(source: DataSource): string {
  if (source === 'live') return 'Live';
  if (source === 'stale') return 'Stale';
  return 'Demo';
}

function RetailerCell({ row, id }: { row: ItemComparison; id: RetailerId }) {
  const cell = row.per_retailer[id];
  if (cell.error) {
    return <span className="cell-error">{cell.error}</span>;
  }
  return (
    <div className="cell-ok">
      <div className="cell-price">
        {cell.pack_price_eur !== null ? `${cell.pack_price_eur.toFixed(2)} €` : '—'}
      </div>
      <div className={`source-badge source-badge--${cell.source}`}>{sourceLabel(cell.source)}</div>
      {cell.pack_size_label ? <div className="muted">{cell.pack_size_label}</div> : null}
      {cell.unit_price_eur !== null && cell.unit ? (
        <div className="muted small">
          {cell.unit_price_eur.toFixed(2)} {cell.unit}
        </div>
      ) : null}
      {cell.match_confidence !== null ? (
        <div className="muted small">Confianza: {(cell.match_confidence * 100).toFixed(0)}%</div>
      ) : null}
    </div>
  );
}

export function App() {
  const [text, setText] = useState(readListDraft);
  const [demo, setDemo] = useState(readDemoFlag);
  const [compareMode, setCompareMode] = useState<CompareMode>(readCompareMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_LIST, text);
    } catch {
      /* ignore */
    }
  }, [text]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_DEMO, demo ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [demo]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_MODE, compareMode);
    } catch {
      /* ignore */
    }
  }, [compareMode]);

  const lines = useMemo(() => parseLines(text), [text]);

  const mutation = useMutation({
    mutationFn: async () => postCompare(lines, demo, compareMode),
  });

  const coverage = useMemo(() => {
    if (!mutation.data) return [];
    const totalLines = mutation.data.items.length;
    return RETAILER_IDS.map((id) => {
      let priced = 0;
      let live = 0;
      let stale = 0;
      let demoHits = 0;
      for (const item of mutation.data!.items) {
        const cell = item.per_retailer[id];
        if (cell.error === null && cell.pack_price_eur !== null) {
          priced += 1;
          if (cell.source === 'live') live += 1;
          if (cell.source === 'stale') stale += 1;
          if (cell.source === 'demo') demoHits += 1;
        }
      }
      return { id, priced, totalLines, live, stale, demoHits };
    });
  }, [mutation.data]);

  const coveredRetailers = coverage.filter((c) => c.priced > 0).length;

  return (
    <div className="page">
      <header className="header">
        <h1>Consultor de compras</h1>
        <p className="lede">
          Escribe tu lista (una línea por producto). Te mostramos dónde suele salir más barato cada
          ítem entre varias cadenas, según la búsqueda en su web.
        </p>
        <p className="portfolio-tag muted small">
          Código abierto: monorepo TypeScript, API stateless y un conector por cadena (capa
          anti-corrupción sobre fuentes heterogéneas).
        </p>
      </header>

      <section className="panel">
        <label className="label" htmlFor="list">
          Lista de compra
        </label>
        <textarea
          id="list"
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
        />
        <p className="list-hint muted small">
          La lista se guarda solo en tu navegador (localStorage); no se envía al servidor hasta que
          pulsas Comparar.           Si no indicas cantidad (gramos, litros, etc.), el mejor precio por ítem
          usa €/kg o €/L cuando hay peso o cantidad en los datos (o en el nombre del
          producto), no solo el precio del pack.
        </p>

        <div className="mode-row" role="radiogroup" aria-label="Modo de comparación">
          <label>
            <input
              type="radio"
              name="compare-mode"
              checked={compareMode === 'per_item'}
              onChange={() => setCompareMode('per_item')}
            />
            Por ítem (dónde sale más barato cada producto)
          </label>
          <label>
            <input
              type="radio"
              name="compare-mode"
              checked={compareMode === 'basket'}
              onChange={() => setCompareMode('basket')}
            />
            Cesta (suma por cadena; ver resumen debajo de la tabla)
          </label>
        </div>

        <div className="row">
          <label className="check">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            Modo demo (respuestas simuladas, sin scraping)
          </label>

          <button
            type="button"
            className="button"
            disabled={mutation.isPending || lines.length === 0 || lines.length > 40}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Comparando…' : 'Comparar'}
          </button>
        </div>

        {lines.length > 40 ? (
          <p className="warn">Máximo 40 líneas por comparación (v1).</p>
        ) : null}

        {mutation.isError ? (
          <p className="error" role="alert">
            {mutation.error instanceof Error ? mutation.error.message : 'Error desconocido'}
          </p>
        ) : null}
      </section>

      {mutation.data ? (
        <section className="results" aria-live="polite">
          <div className="results-head">
            <h2>Resultados</h2>
            <p className="muted">
              Consultado: {new Date(mutation.data.compared_at).toLocaleString('es-ES')}
              {mutation.data.demo ? ' · Demo' : ''}
              {mutation.data.mode === 'basket' ? ' · Modo cesta' : ''}
            </p>
          </div>

          <div className="coverage-panel">
            <p className="coverage-main small">
              <strong>Cobertura:</strong> {coveredRetailers} / {RETAILER_IDS.length} cadenas con
              precio en al menos una línea.
            </p>
            <div className="coverage-grid">
              {coverage.map((c) => (
                <div className="coverage-item" key={c.id}>
                  <span>{retailerLabel(c.id)}</span>
                  <span className="muted small">
                    {c.priced}/{c.totalLines}
                  </span>
                  {c.live > 0 ? (
                    <span className="source-badge source-badge--live">Live {c.live}</span>
                  ) : null}
                  {c.stale > 0 ? (
                    <span className="source-badge source-badge--stale">Stale {c.stale}</span>
                  ) : null}
                  {c.demoHits > 0 ? (
                    <span className="source-badge source-badge--demo">Demo {c.demoHits}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Producto (tu línea)</th>
                  <th scope="col">Mejor precio</th>
                  {RETAILER_IDS.map((id) => (
                    <th key={id} scope="col">
                      {retailerLabel(id)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mutation.data.items.map((row, idx) => (
                  <tr key={`${row.normalized_line}:${idx}`}>
                    <td>
                      <div className="line">{row.line}</div>
                      <div className="muted small">{row.normalized_line}</div>
                    </td>
                    <td>
                      {row.cheapest_overall ? (
                        <div>
                          <div className="winner">
                            {retailerLabel(row.cheapest_overall.retailer)} ·{' '}
                            {row.cheapest_overall.pack_price_eur.toFixed(2)} €
                          </div>
                          <div className={`source-badge source-badge--${row.cheapest_overall.source}`}>
                            {sourceLabel(row.cheapest_overall.source)}
                          </div>
                          <div className="muted small">{row.cheapest_overall.label}</div>
                          {row.cheapest_overall.pack_size_label ? (
                            <div className="muted small">{row.cheapest_overall.pack_size_label}</div>
                          ) : null}
                          {row.cheapest_overall.format_warning ? (
                            <div className="warn small">{row.cheapest_overall.format_warning}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="muted">Sin ganador claro</span>
                      )}
                    </td>
                    {RETAILER_IDS.map((id) => (
                      <td key={id}>
                        <RetailerCell row={row} id={id} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mutation.data.basket ? (
            <div className="basket-panel">
              <h3>Resumen de cesta</h3>
              <p className="muted small" style={{ marginTop: 0 }}>
                Suma del precio del pack por cadena (mismas búsquedas que en la tabla). Las cadenas
                con precio en todas las líneas aparecen primero.
              </p>
              <table className="basket-table">
                <thead>
                  <tr>
                    <th scope="col">Cadena</th>
                    <th scope="col">Total</th>
                    <th scope="col">Líneas cubiertas</th>
                  </tr>
                </thead>
                <tbody>
                  {mutation.data.basket.by_retailer.map((row) => (
                    <tr
                      key={row.retailer}
                      className={
                        row.retailer === mutation.data.basket!.cheapest_full_basket
                          ? 'basket-row--best'
                          : undefined
                      }
                    >
                      <td>{retailerLabel(row.retailer)}</td>
                      <td>{row.total_eur.toFixed(2)} €</td>
                      <td>
                        {row.lines_included} / {row.lines_total}
                        {row.complete ? ' · completa' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mutation.data.basket.cheapest_full_basket ? (
                <p className="basket-note">
                  <strong>Menor total con cesta completa:</strong>{' '}
                  {retailerLabel(mutation.data.basket.cheapest_full_basket)} (suma de todos los ítems
                  en esa cadena).
                </p>
              ) : (
                <p className="basket-note">
                  Ninguna cadena tiene precio para todos los ítems; compara fila a fila o revisa
                  errores en la tabla.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="footer">
        <p>
          <strong>Precios según web de la cadena; pueden variar por tienda.</strong>
        </p>
        <p className="muted small">
          Los resultados son orientativos y dependen de la búsqueda en cada web en el momento de la
          consulta.
        </p>
      </footer>
    </div>
  );
}
