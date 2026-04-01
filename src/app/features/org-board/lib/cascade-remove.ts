import type { User } from '@entities/user';
import type { BoardPosition } from '../org-board.model';

interface CascadeRemoveDeps {
  removeFromBoard(positionId: string): Promise<boolean>;
  setManager(userId: string, managerId: string | null): Promise<boolean>;
}

/**
 * Removes a user from the board and cascades manager reassignment:
 * - Clears the removed user's own manager link (if any)
 * - Reassigns direct reports to the removed user's manager (or null if root)
 * All operations run in parallel.
 */
export async function cascadeRemoveFromBoard(
  userId: string,
  position: BoardPosition,
  removedUser: User | undefined,
  allUsers: User[],
  deps: CascadeRemoveDeps,
): Promise<void> {
  const newManagerId = removedUser?.managerId ?? null;
  const promises: Promise<unknown>[] = [deps.removeFromBoard(position.id)];

  if (removedUser?.managerId) {
    promises.push(deps.setManager(userId, null));
  }
  for (const u of allUsers) {
    if (u.managerId === userId) {
      promises.push(deps.setManager(u.id, newManagerId));
    }
  }

  await Promise.all(promises);
}
