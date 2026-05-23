"use client";

import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Linhas skeleton pra tabela enquanto SWR carrega.
 * Use quando data ainda é undefined (não confundir com data.length === 0 que é empty state).
 *
 * Exemplo:
 *   {data === undefined ? <TableLoadingRows colSpan={4} /> :
 *    data.length === 0 ? <EmptyRow ... /> :
 *    data.map(...)}
 */
export function TableLoadingRows({ colSpan, rows = 3 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: colSpan }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: `${60 + ((i * 13 + j * 17) % 30)}%` }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
