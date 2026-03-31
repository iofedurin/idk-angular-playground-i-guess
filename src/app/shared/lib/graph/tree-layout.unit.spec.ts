import { describe, expect, it } from 'vitest';
import { computeTreeLayout, type LayoutOptions } from './tree-layout';

describe('computeTreeLayout', () => {
  it('handles empty input', () => {
    expect(computeTreeLayout([])).toEqual([]);
  });

  it('positions single root at (0, 0)', () => {
    const result = computeTreeLayout([{ id: 'a', parentId: null }]);
    // subtreeWidth('a') = 200, centerX = 100, x = 100 - 100 = 0
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'a', x: 0, y: 0 });
  });

  it('positions child below parent, centered under single child', () => {
    const result = computeTreeLayout([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
    ]);
    const a = result.find((r) => r.id === 'a')!;
    const b = result.find((r) => r.id === 'b')!;
    // Both centered at x=0, y levels 0 and 180 (100 nodeHeight + 80 verticalGap)
    expect(a).toEqual({ id: 'a', x: 0, y: 0 });
    expect(b).toEqual({ id: 'b', x: 0, y: 180 });
  });

  it('positions multiple roots side by side', () => {
    const result = computeTreeLayout([
      { id: 'a', parentId: null },
      { id: 'b', parentId: null },
    ]);
    const a = result.find((r) => r.id === 'a')!;
    const b = result.find((r) => r.id === 'b')!;
    // a: sw=200, center=100, x=0
    // b: currentLeft=0+200+40=240, center=340, x=240
    expect(a).toEqual({ id: 'a', x: 0, y: 0 });
    expect(b).toEqual({ id: 'b', x: 240, y: 0 });
  });

  it('handles deep chain (A→B→C→D) vertically', () => {
    const result = computeTreeLayout([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
    ]);
    const get = (id: string) => result.find((r) => r.id === id)!;
    // All x=0 (single child always centered), y increases by 180 per level
    expect(get('a')).toEqual({ id: 'a', x: 0, y: 0 });
    expect(get('b')).toEqual({ id: 'b', x: 0, y: 180 });
    expect(get('c')).toEqual({ id: 'c', x: 0, y: 360 });
    expect(get('d')).toEqual({ id: 'd', x: 0, y: 540 });
  });

  it('handles wide tree (1 root, 5 children) horizontally', () => {
    const result = computeTreeLayout([
      { id: 'root', parentId: null },
      { id: 'c1', parentId: 'root' },
      { id: 'c2', parentId: 'root' },
      { id: 'c3', parentId: 'root' },
      { id: 'c4', parentId: 'root' },
      { id: 'c5', parentId: 'root' },
    ]);
    const root = result.find((r) => r.id === 'root')!;
    const c1 = result.find((r) => r.id === 'c1')!;
    const c5 = result.find((r) => r.id === 'c5')!;
    // 5 children: totalWidth = 5*200 + 4*40 = 1160; root sw=1160; root.x = 580-100 = 480
    expect(root).toEqual({ id: 'root', x: 480, y: 0 });
    // c1: start=0, center=100, x=0; c5: start=960, center=1060, x=960
    expect(c1.x).toBe(0);
    expect(c5.x).toBe(960);
    // All children at y=180
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) {
      expect(result.find((r) => r.id === id)!.y).toBe(180);
    }
  });

  it('handles mixed tree (varying depth and width)', () => {
    // a → b (→ d, e), c
    const result = computeTreeLayout([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'a' },
      { id: 'd', parentId: 'b' },
      { id: 'e', parentId: 'b' },
    ]);
    const get = (id: string) => result.find((r) => r.id === id)!;
    // b has 2 children: sw(b) = 200+40+200 = 440
    // a has children b(440), c(200): sw(a) = 440+40+200 = 680
    // a: center=340, x=240
    expect(get('a').x).toBe(240);
    expect(get('a').y).toBe(0);
    // b: left=0, center=220, x=120; c: left=480, center=580, x=480
    expect(get('b')).toEqual({ id: 'b', x: 120, y: 180 });
    expect(get('c')).toEqual({ id: 'c', x: 480, y: 180 });
    // d: left=0, center=100, x=0; e: left=240, center=340, x=240
    expect(get('d')).toEqual({ id: 'd', x: 0, y: 360 });
    expect(get('e')).toEqual({ id: 'e', x: 240, y: 360 });
  });

  it('treats nodes with missing parent as roots', () => {
    const result = computeTreeLayout([
      { id: 'a', parentId: 'missing' }, // parent not in list → root
      { id: 'b', parentId: null },
    ]);
    expect(result).toHaveLength(2);
    // Both at y=0 (both roots)
    for (const r of result) expect(r.y).toBe(0);
  });

  it('respects custom nodeWidth / nodeHeight / gaps', () => {
    const opts: LayoutOptions = { nodeWidth: 100, nodeHeight: 50, horizontalGap: 20, verticalGap: 30 };
    const result = computeTreeLayout(
      [
        { id: 'a', parentId: null },
        { id: 'b', parentId: null },
      ],
      opts,
    );
    const a = result.find((r) => r.id === 'a')!;
    const b = result.find((r) => r.id === 'b')!;
    // a: sw=100, center=50, x=0; b: currentLeft=100+20=120, center=170, x=120
    expect(a).toEqual({ id: 'a', x: 0, y: 0 });
    expect(b).toEqual({ id: 'b', x: 120, y: 0 });
  });
});
