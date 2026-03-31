import type { User } from '../user.model';

/** Построить adjacency map: managerId → Set<userId> (children) */
export function buildChildrenMap(users: User[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const user of users) {
    if (user.managerId !== null) {
      let children = map.get(user.managerId);
      if (!children) {
        children = new Set<string>();
        map.set(user.managerId, children);
      }
      children.add(user.id);
    }
  }
  return map;
}

/** Получить всех ancestors (manager, manager's manager, ...) для userId. */
export function getAncestors(userId: string, users: User[]): Set<string> {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const ancestors = new Set<string>();
  let current = userMap.get(userId);
  while (current?.managerId) {
    if (ancestors.has(current.managerId)) break; // cycle guard
    ancestors.add(current.managerId);
    current = userMap.get(current.managerId);
  }
  return ancestors;
}

/** Получить прямых подчинённых (managerId === userId). */
export function getDirectReports(userId: string, users: User[]): User[] {
  return users.filter((u) => u.managerId === userId);
}

/** Получить всё поддерево (рекурсивно вниз). */
export function getSubtree(userId: string, users: User[]): User[] {
  const result: User[] = [];
  const queue = [userId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = users.filter((u) => u.managerId === currentId);
    for (const child of children) {
      result.push(child);
      queue.push(child.id);
    }
  }
  return result;
}

/**
 * Проверить, создаст ли связь manager→subordinate цикл.
 * Цикл возникает, если subordinate является ancestor'ом manager'а.
 */
export function wouldCreateCycle(
  managerId: string,
  subordinateId: string,
  users: User[],
): boolean {
  if (managerId === subordinateId) return true;
  const ancestors = getAncestors(managerId, users);
  return ancestors.has(subordinateId);
}
