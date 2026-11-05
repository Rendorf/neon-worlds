// A fake 2D context that records every call, so frames can be compared without a real canvas.
export function mockCtx(): { ctx: CanvasRenderingContext2D; log: string[] } {
  const log: string[] = [];
  const r = (v: unknown): string => (typeof v === 'number' ? v.toFixed(2) : typeof v === 'string' ? v : typeof v);
  const grad = { addColorStop: (o: number, c: string) => void log.push(`stop ${r(o)} ${c}`) };
  const target: Record<string, unknown> = { canvas: { width: 480, height: 270 } };
  const ctx = new Proxy(target, {
    get(t, p) {
      if (typeof p !== 'string') return undefined;
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient') {
        return (...a: unknown[]) => {
          log.push(`${p} ${a.map(r).join(',')}`);
          return grad;
        };
      }
      return (...a: unknown[]) => void log.push(`${p} ${a.map(r).join(',')}`);
    },
    set(t, p, v) {
      log.push(`set ${String(p)} ${r(v)}`);
      t[p as string] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, log };
}
