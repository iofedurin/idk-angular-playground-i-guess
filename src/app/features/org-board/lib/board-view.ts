import type { User } from '@entities/user';
import { getAncestors, getSubtree } from '@entities/user';
import type { BoardEdge, BoardNode, BoardPosition } from '../org-board.model';

export function computeDirectReportsCounts(
  users: User[],
  onBoardUserIds: Set<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const user of users) {
    if (user.managerId && onBoardUserIds.has(user.id) && onBoardUserIds.has(user.managerId)) {
      counts.set(user.managerId, (counts.get(user.managerId) ?? 0) + 1);
    }
  }
  return counts;
}

export function computeBoardNodes(
  positions: BoardPosition[],
  userMap: Record<string, User>,
  deptMap: Record<string, { icon?: string }>,
  directReportsCounts?: Map<string, number>,
): BoardNode[] {
  return positions
    .map((pos): BoardNode | null => {
      const user = userMap[pos.userId];
      if (!user) return null;
      return {
        userId: pos.userId,
        user,
        x: pos.x,
        y: pos.y,
        positionId: pos.id,
        departmentIcon: deptMap[user.department]?.icon,
        directReportsCount: directReportsCounts?.get(pos.userId) ?? 0,
      };
    })
    .filter((n): n is BoardNode => n !== null);
}

export function computeBoardEdges(users: User[], onBoardUserIds: Set<string>): BoardEdge[] {
  return users
    .filter((u) => u.managerId && onBoardUserIds.has(u.id) && onBoardUserIds.has(u.managerId))
    .map((u) => ({
      id: `edge-${u.managerId}-${u.id}`,
      managerId: u.managerId!,
      subordinateId: u.id,
      outputId: `out-${u.managerId}`,
      inputId: `in-${u.id}`,
    }));
}

export function computeValidTargets(
  users: User[],
  onBoardUserIds: Set<string>,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const user of users) {
    if (!onBoardUserIds.has(user.id)) continue;
    const ancestors = getAncestors(user.id, users);
    const validInputs = users
      .filter((u) => onBoardUserIds.has(u.id) && u.id !== user.id && !ancestors.has(u.id))
      .map((u) => `in-${u.id}`);
    result.set(user.id, validInputs);
  }
  return result;
}

export function computeHighlightedUserIds(
  selectedUserId: string | null,
  users: User[],
): Set<string> {
  if (!selectedUserId) return new Set();
  const subtree = getSubtree(selectedUserId, users);
  return new Set([selectedUserId, ...subtree.map((u) => u.id)]);
}
