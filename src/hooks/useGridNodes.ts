import { useMemo } from "react";
import { getGridNodes, type GridNode } from "@/utils/grid";

export function useGridNodes(width: number, height: number, cols: number, rows: number): GridNode[] {
  return useMemo(() => getGridNodes(width, height, cols, rows), [width, height, cols, rows]);
}
