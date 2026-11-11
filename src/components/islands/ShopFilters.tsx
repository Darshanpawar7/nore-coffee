import { useEffect, useState } from 'preact/hooks';
import {
  METHOD_LABEL,
  METHODS,
  PROCESS_LABEL,
  PROCESSES,
  ROAST_LABEL,
  ROASTS,
  type Method,
  type Process,
  type Roast,
} from '../../lib/catalog';

/**
 * Filters and sorting for the shop. The cards are plain HTML from the build; this island hides,
 * shows and reorders them, keeps the choices in the address (so a filtered view can be shared or
 * bookmarked), and says how many coffees are showing. Without JavaScript every card simply shows.
 */

const SORTS = {
  ours: 'Our order',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  light: 'Lightest roast first',
  dark: 'Darkest roast first',
} as const;
type Sort = keyof typeof SORTS;

interface State {
  readonly roasts: readonly Roast[];
  readonly processes: readonly Process[];
  readonly method: Method | 'any';
  readonly sort: Sort;
}

const EMPTY: State = { roasts: [], processes: [], method: 'any', sort: 'ours' };

function pickAll<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  return (raw ?? '')
    .split(',')
    .filter((value): value is T => (allowed as readonly string[]).includes(value));
}

function fromQuery(search: string): State {
  const query = new URLSearchParams(search);
  const method = query.get('method');
  const sort = query.get('sort');
  return {
    roasts: pickAll(query.get('roast'), ROASTS),
    processes: pickAll(query.get('process'), PROCESSES),
    method: method && (METHODS as readonly string[]).includes(method) ? (method as Method) : 'any',
    sort: sort && sort in SORTS ? (sort as Sort) : 'ours',
  };
}

function toQuery(state: State): string {
  const query = new URLSearchParams();
  if (state.roasts.length > 0) query.set('roast', state.roasts.join(','));
  if (state.processes.length > 0) query.set('process', state.processes.join(','));
  if (state.method !== 'any') query.set('method', state.method);
  if (state.sort !== 'ours') query.set('sort', state.sort);
  const text = query.toString();
  return text ? `?${text}` : '';
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

/** Shows, hides and orders the cards; returns how many are showing. */
function apply(state: State): { shown: number; total: number } {
  const grid = document.getElementById('shop-grid');
  if (!grid) return { shown: 0, total: 0 };
  const cards = [...grid.querySelectorAll<HTMLElement>('[data-product-card]')];
  const number = (card: HTMLElement, key: string) => Number(card.dataset[key] ?? 0);
  const order: Record<Sort, (a: HTMLElement, b: HTMLElement) => number> = {
    ours: (a, b) => number(a, 'index') - number(b, 'index'),
    'price-asc': (a, b) =>
      number(a, 'price') - number(b, 'price') || number(a, 'index') - number(b, 'index'),
    'price-desc': (a, b) =>
      number(b, 'price') - number(a, 'price') || number(a, 'index') - number(b, 'index'),
    light: (a, b) =>
      number(a, 'roastRank') - number(b, 'roastRank') || number(a, 'index') - number(b, 'index'),
    dark: (a, b) =>
      number(b, 'roastRank') - number(a, 'roastRank') || number(a, 'index') - number(b, 'index'),
  };
  let shown = 0;
  for (const card of [...cards].sort(order[state.sort])) {
    const roast = card.dataset.roast as Roast;
    const process = card.dataset.process as Process;
    const methods = (card.dataset.methods ?? '').split(' ');
    const visible =
      (state.roasts.length === 0 || state.roasts.includes(roast)) &&
      (state.processes.length === 0 || state.processes.includes(process)) &&
      (state.method === 'any' || methods.includes(state.method));
    card.hidden = !visible;
    if (visible) shown++;
    // Moving the node, not just restyling it, keeps reading order and visual order the same.
    grid.append(card);
  }
  return { shown, total: cards.length };
}

export default function ShopFilters() {
  const [state, setState] = useState<State>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState({ shown: 0, total: 0 });

  useEffect(() => {
    setState(fromQuery(window.location.search));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setCount(apply(state));
    const next = `${window.location.pathname}${toQuery(state)}`;
    if (next !== `${window.location.pathname}${window.location.search}`)
      window.history.replaceState(null, '', next);
  }, [state, mounted]);

  const filtered = state.roasts.length > 0 || state.processes.length > 0 || state.method !== 'any';

  return (
    <div class="filters" hidden={!mounted}>
      <fieldset class="filters__group">
        <legend>Roast</legend>
        {ROASTS.map((roast) => (
          <label key={roast} class="chip">
            <input
              type="checkbox"
              checked={state.roasts.includes(roast)}
              onChange={() => {
                setState({ ...state, roasts: toggle(state.roasts, roast) });
              }}
            />
            {ROAST_LABEL[roast]}
          </label>
        ))}
      </fieldset>
      <fieldset class="filters__group">
        <legend>Process</legend>
        {PROCESSES.map((process) => (
          <label key={process} class="chip">
            <input
              type="checkbox"
              checked={state.processes.includes(process)}
              onChange={() => {
                setState({ ...state, processes: toggle(state.processes, process) });
              }}
            />
            {PROCESS_LABEL[process]}
          </label>
        ))}
      </fieldset>
      <div class="filters__row">
        <label class="field">
          <span class="field__label">Brew method</span>
          <select
            class="select"
            value={state.method}
            onChange={(event) => {
              setState({ ...state, method: event.currentTarget.value as Method | 'any' });
            }}
          >
            <option value="any">Any method</option>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABEL[method]}
              </option>
            ))}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Sort</span>
          <select
            class="select"
            value={state.sort}
            onChange={(event) => {
              setState({ ...state, sort: event.currentTarget.value as Sort });
            }}
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div class="filters__status">
        <p aria-live="polite" role="status">
          {count.shown === count.total
            ? `${String(count.total)} coffees`
            : `${String(count.shown)} of ${String(count.total)} coffees`}
        </p>
        {filtered && (
          <button
            type="button"
            class="link-button"
            onClick={() => {
              setState({ ...EMPTY, sort: state.sort });
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {mounted && count.shown === 0 && (
        <p class="filters__none serif">Nothing matches all of that. Try fewer filters?</p>
      )}
    </div>
  );
}
