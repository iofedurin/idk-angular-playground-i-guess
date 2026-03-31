import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { getAncestors, UsersStore } from '@entities/user';
import { BoardEdge, BoardNode, OrgBoardStore } from '@features/org-board';
import { OrgBoardCanvasComponent } from '@widgets/org-board-canvas';
import { ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-org-board-page',
  imports: [OrgBoardCanvasComponent, SpinnerComponent, ErrorAlertComponent],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage implements OnInit {
  private readonly usersStore = inject(UsersStore);
  private readonly boardStore = inject(OrgBoardStore);

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
}
