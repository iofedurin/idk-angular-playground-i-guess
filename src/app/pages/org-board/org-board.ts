import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { getAncestors, getDirectReports, UsersStore } from '@entities/user';
import { BoardEdge, BoardNode, OrgBoardStore } from '@features/org-board';
import { OrgBoardCanvasComponent } from '@widgets/org-board-canvas';
import { OrgBoardSidebarComponent } from '@widgets/org-board-sidebar';
import { ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-org-board-page',
  imports: [OrgBoardCanvasComponent, OrgBoardSidebarComponent, SpinnerComponent, ErrorAlertComponent],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  protected readonly boardStore = inject(OrgBoardStore);

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
    await this.usersStore.setManager(event.subordinateId, event.managerId);
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

  protected async onRemoveFromBoard(userId: string): Promise<void> {
    const pos = this.boardStore.positionByUserId().get(userId);
    if (!pos) return;
    await this.boardStore.removeFromBoard(pos.id);
    if (this.selectedUserId() === userId) {
      this.selectedUserId.set(null);
    }
  }
}
