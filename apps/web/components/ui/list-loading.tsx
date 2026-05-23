"use client";

/**
 * Skeleton genérico pra listagens fora de <Table> (cards, divs, grids).
 * Use enquanto data === undefined do SWR.
 *
 * Exemplo:
 *   {items === undefined ? <ListLoadingSkeleton rows={3} /> :
 *    items.length === 0 ? <EmptyState /> :
 *    items.map(...)}
 */
export function ListLoadingSkeleton({ rows = 3, lines = 2 }: { rows?: number; lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2">
          {Array.from({ length: lines }).map((__, j) => (
            <div
              key={j}
              className="h-3 bg-muted/60 rounded animate-pulse"
              style={{ width: `${50 + ((i * 11 + j * 19) % 40)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
