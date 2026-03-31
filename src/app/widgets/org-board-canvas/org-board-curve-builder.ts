import type { IPoint } from '@foblex/2d';
import { F_CONNECTION_BUILDERS } from '@foblex/flow';

/**
 * Orthogonal step-path builder for top-to-bottom org hierarchy connections.
 *
 * Path shape:
 *   source (bottom of parent)
 *     │  ↓ straight down
 *     └──── rounded 90° turn → horizontal
 *                               └──── rounded 90° turn → straight down
 *                                                          target (top of child)
 *
 * Corners use quadratic bezier (Q) for smooth rounding, controlled by fRadius.
 */
class OrgBoardStepBuilder {
  handle({ source, target, radius }: { source: IPoint; target: IPoint; radius: number }) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Straight vertical line when aligned
    if (Math.abs(dx) < 1) {
      const mid: IPoint = { x: source.x, y: (source.y + target.y) / 2 };
      return {
        path: `M ${source.x} ${source.y} L ${target.x} ${target.y}`,
        secondPoint: mid,
        penultimatePoint: mid,
        points: [source, mid, target],
        candidates: [mid],
      };
    }

    const midY = (source.y + target.y) / 2;
    const sign = Math.sign(dx);
    // Clamp radius so corners don't overlap
    const r = Math.min(radius, Math.abs(dy) / 4, Math.abs(dx) / 2);

    const path = [
      `M ${source.x} ${source.y}`,
      `L ${source.x} ${midY - r}`,
      `Q ${source.x} ${midY} ${source.x + sign * r} ${midY}`,
      `L ${target.x - sign * r} ${midY}`,
      `Q ${target.x} ${midY} ${target.x} ${midY + r}`,
      `L ${target.x} ${target.y}`,
    ].join(' ');

    const cornerA: IPoint = { x: source.x, y: midY };
    const cornerB: IPoint = { x: target.x, y: midY };
    const mid: IPoint = { x: (source.x + target.x) / 2, y: midY };

    return {
      path,
      secondPoint: cornerA,
      penultimatePoint: cornerB,
      points: [source, cornerA, mid, cornerB, target],
      candidates: [mid],
    };
  }
}

export const ORG_BOARD_CURVE_BUILDER = {
  provide: F_CONNECTION_BUILDERS,
  useValue: { 'org-board-curve': new OrgBoardStepBuilder() },
};
