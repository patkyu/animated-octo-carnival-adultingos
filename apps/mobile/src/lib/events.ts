/**
 * Tiny change bus. Repositories call `dataChanged()` after any write; the app
 * shell subscribes to refresh queries, reschedule reminders, evaluate
 * achievements and schedule a sync (each debounced by its subscriber).
 */
type Listener = (scope: string) => void;
const listeners = new Set<Listener>();

export function onDataChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function dataChanged(scope = 'all'): void {
  for (const fn of listeners) {
    try {
      fn(scope);
    } catch {
      /* a failing subscriber must not break writes */
    }
  }
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...a: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
