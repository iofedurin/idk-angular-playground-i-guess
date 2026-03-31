export interface LayoutNode {
  id: string;
  parentId: string | null;
}

export interface LayoutResult {
  id: string;
  x: number;
  y: number;
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
}

/**
 * Computes top-down tree layout positions for a node hierarchy.
 * Algorithm: bottom-up subtree width calculation, top-down placement with centering.
 * Nodes whose parentId is not in the node set are treated as roots.
 */
export function computeTreeLayout(nodes: LayoutNode[], options?: LayoutOptions): LayoutResult[] {
  if (nodes.length === 0) return [];

  const { nodeWidth = 200, nodeHeight = 100, horizontalGap = 40, verticalGap = 80 } = options ?? {};

  const nodeIds = new Set(nodes.map((n) => n.id));
  const childrenMap = new Map<string | null, string[]>();

  for (const node of nodes) {
    const parentId = node.parentId !== null && nodeIds.has(node.parentId) ? node.parentId : null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(node.id);
  }

  const widthCache = new Map<string, number>();

  function subtreeWidth(id: string): number {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const children = childrenMap.get(id) ?? [];
    const w =
      children.length === 0
        ? nodeWidth
        : Math.max(
            nodeWidth,
            children.reduce((sum, c) => sum + subtreeWidth(c), 0) +
              (children.length - 1) * horizontalGap,
          );
    widthCache.set(id, w);
    return w;
  }

  const results: LayoutResult[] = [];

  function place(id: string, centerX: number, y: number): void {
    results.push({ id, x: centerX - nodeWidth / 2, y });
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return;

    const totalWidth =
      children.reduce((sum, c) => sum + subtreeWidth(c), 0) + (children.length - 1) * horizontalGap;
    let left = centerX - totalWidth / 2;

    for (const child of children) {
      const sw = subtreeWidth(child);
      place(child, left + sw / 2, y + nodeHeight + verticalGap);
      left += sw + horizontalGap;
    }
  }

  const roots = childrenMap.get(null) ?? [];
  let currentLeft = 0;
  for (const root of roots) {
    const sw = subtreeWidth(root);
    place(root, currentLeft + sw / 2, 0);
    currentLeft += sw + horizontalGap;
  }

  return results;
}
