import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { getAncestors, getDirectReports, UsersStore } from '@entities/user';
import { BoardEdge, BoardNode, OrgBoardStore } from '@features/org-board';
import { OrgBoardCanvasComponent } from '@widgets/org-board-canvas';
import { OrgBoardSidebarComponent } from '@widgets/org-board-sidebar';
import { ConfirmDialogComponent, ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

interface PendingConnection {
  managerId: string;
  subordinateId: string;
  subordinateName: string;
  currentManagerName: string;
  newManagerName: string;
}

@Component({
  selector: 'app-org-board-page',
  imports: [OrgBoardCanvasComponent, OrgBoardSidebarComponent, SpinnerComponent, ErrorAlertComponent, ConfirmDialogComponent],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  protected readonly boardStore = inject(OrgBoardStore);

  protected readonly pendingConnection = signal<PendingConnection | null>(null);
  protected readonly reassignMessage = computed(() => {
    const p = this.pendingConnection();
    if (!p) return '';
    return `${p.subordinateName} already reports to ${p.currentManagerName}. Reassign to ${p.newManagerName}?`;
  });
  private readonly confirmDialogRef = viewChild<ConfirmDialogComponent>('confirmDialog');

  constructor() {
    // Imperative DOM: ConfirmDialogComponent.open() calls showModal() — legitimate effect() use (ADR-0009)
    effect(() => {
      if (this.pendingConnection()) {
        this.confirmDialogRef()?.open();
      }
    });
  }

  protected readonly nodes = computed<BoardNode[]>(() => {
    const users = this.usersStore.entityMap();
    return this.boardStore.entities()
      .map((pos) => {
        const user = users[pos.userId];
        if (!user) return null;
        return { userId: pos.userId, user, x: pos.x, y: pos.y, positionId: pos.id };
      })
      .filter((n): n is BoardNode => n !== null);
  });

  protected readonly edges = computed<BoardEdge[]>(() => {
    const onBoard = this.boardStore.userIdsOnBoard();
    return this.usersStore.entities()
      .filter((u) => u.managerId && onBoard.has(u.id) && onBoard.has(u.managerId))
      .map((u) => ({
        id: `edge-${u.managerId}-${u.id}`,
        managerId: u.managerId!,
        subordinateId: u.id,
        outputId: `out-${u.managerId}`,
        inputId: `in-${u.id}`,
      }));
  });

  protected readonly validTargetsByUser = computed(() => {
    const users = this.usersStore.entities();
    const onBoard = this.boardStore.userIdsOnBoard();
    const result = new Map<string, string[]>();

    for (const user of users) {
      if (!onBoard.has(user.id)) continue;
      const ancestors = getAncestors(user.id, users);
      const validInputs = users
        .filter((u) => onBoard.has(u.id) && u.id !== user.id && !ancestors.has(u.id))
        .map((u) => `in-${u.id}`);
      result.set(user.id, validInputs);
    }
    return result;
  });

  protected readonly selectedUserId = signal<string | null>(null);

  protected readonly selectedUser = computed(() => {
    const id = this.selectedUserId();
    return id ? (this.usersStore.entityMap()[id] ?? null) : null;
  });

  protected readonly directReports = computed(() => {
    const user = this.selectedUser();
    return user ? getDirectReports(user.id, this.usersStore.entities()) : [];
  });

  protected readonly manager = computed(() => {
    const user = this.selectedUser();
    return user?.managerId ? (this.usersStore.entityMap()[user.managerId] ?? null) : null;
  });

  protected readonly loading = computed(
    () => this.usersStore.loading() || this.boardStore.loading(),
  );

  protected readonly error = computed(
    () => this.usersStore.error() ?? this.boardStore.error(),
  );

  ngOnInit(): void {
    this.usersStore.loadAll();
    this.boardStore.loadPositions();
  }

  protected async onConnectionCreated(event: { managerId: string; subordinateId: string }): Promise<void> {
    const entityMap = this.usersStore.entityMap();
    const subordinate = entityMap[event.subordinateId];
    if (!subordinate) return;

    const onBoard = this.boardStore.userIdsOnBoard();
    if (subordinate.managerId && subordinate.managerId !== event.managerId && onBoard.has(subordinate.managerId)) {
      const currentManager = entityMap[subordinate.managerId];
      const newManager = entityMap[event.managerId];
      this.pendingConnection.set({
        managerId: event.managerId,
        subordinateId: event.subordinateId,
        subordinateName: `${subordinate.firstName} ${subordinate.lastName}`,
        currentManagerName: currentManager
          ? `${currentManager.firstName} ${currentManager.lastName}`
          : 'Unknown',
        newManagerName: newManager ? `${newManager.firstName} ${newManager.lastName}` : 'Unknown',
      });
      return;
    }

    await this.usersStore.setManager(event.subordinateId, event.managerId);
  }

  protected async confirmReassignment(): Promise<void> {
    const pending = this.pendingConnection();
    if (!pending) return;
    this.pendingConnection.set(null);
    await this.usersStore.setManager(pending.subordinateId, pending.managerId);
  }

  protected cancelReassignment(): void {
    this.pendingConnection.set(null);
  }

  protected async onConnectionRemoved(event: { subordinateId: string }): Promise<void> {
    await this.usersStore.setManager(event.subordinateId, null);
  }

  protected async onPositionChanged(event: {
    userId: string;
    positionId: string;
    x: number;
    y: number;
  }): Promise<void> {
    await this.boardStore.updatePosition(event.positionId, event.x, event.y);
  }

  protected onNodeClicked(userId: string): void {
    this.selectedUserId.set(this.selectedUserId() === userId ? null : userId);
  }

  protected async onUserDropped(event: { userId: string; x: number; y: number }): Promise<void> {
    await this.boardStore.addToBoard(event.userId, event.x, event.y);
  }

  protected onUserSelected(userId: string): void {
    this.selectedUserId.set(userId);
  }

  protected onBackToList(): void {
    this.selectedUserId.set(null);
  }

  protected async onRemoveManager(userId: string): Promise<void> {
    await this.usersStore.setManager(userId, null);
  }

  protected async onRemoveFromBoard(userId: string): Promise<void> {
    const pos = this.boardStore.positionByUserId().get(userId);
    if (!pos) return;

    // Cascade: direct reports are reassigned to the removed user's manager (or null if root)
    const removedUser = this.usersStore.entityMap()[userId];
    const newManagerId = removedUser?.managerId ?? null;
    const clearPromises: Promise<unknown>[] = [this.boardStore.removeFromBoard(pos.id)];

    if (removedUser?.managerId) {
      clearPromises.push(this.usersStore.setManager(userId, null));
    }
    for (const u of this.usersStore.entities()) {
      if (u.managerId === userId) {
        clearPromises.push(this.usersStore.setManager(u.id, newManagerId));
      }
    }

    await Promise.all(clearPromises);

    if (this.selectedUserId() === userId) {
      this.selectedUserId.set(null);
    }
  }
}
