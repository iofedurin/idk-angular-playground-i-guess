import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { UsersStore } from '@entities/user';
import { DepartmentStore } from '@entities/department';
import {
  BoardEdge,
  BoardNode,
  OrgBoardStore,
  PendingConnection,
  ReassignConfirmComponent,
  cascadeRemoveFromBoard,
  computeBoardEdges,
  computeBoardNodes,
  computeDirectReportsCounts,
  computeHighlightedUserIds,
  computeValidTargets,
} from '@features/org-board';
import { computeTreeLayout, type LayoutNode } from '@shared/lib';
import { OrgBoardCanvasComponent } from '@widgets/org-board-canvas';
import { OrgBoardSidebarComponent } from '@widgets/org-board-sidebar';
import { ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-org-board-page',
  imports: [OrgBoardCanvasComponent, OrgBoardSidebarComponent, SpinnerComponent, ErrorAlertComponent, ReassignConfirmComponent],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  protected readonly boardStore = inject(OrgBoardStore);
  private readonly deptStore = inject(DepartmentStore);

  protected readonly pendingConnection = signal<PendingConnection | null>(null);

  private readonly directReportsCounts = computed(() =>
    computeDirectReportsCounts(this.usersStore.entities(), this.boardStore.userIdsOnBoard()),
  );

  protected readonly nodes = computed<BoardNode[]>(() =>
    computeBoardNodes(
      this.boardStore.entities(),
      this.usersStore.entityMap(),
      this.deptStore.entityMap(),
      this.directReportsCounts(),
    ),
  );

  protected readonly edges = computed<BoardEdge[]>(() =>
    computeBoardEdges(this.usersStore.entities(), this.boardStore.userIdsOnBoard()),
  );

  protected readonly validTargetsByUser = computed(() =>
    computeValidTargets(this.usersStore.entities(), this.boardStore.userIdsOnBoard()),
  );

  protected readonly selectedUserId = signal<string | null>(null);

  protected readonly selectedUser = computed(() => {
    const id = this.selectedUserId();
    return id ? (this.usersStore.entityMap()[id] ?? null) : null;
  });

  protected readonly loading = computed(
    () => this.usersStore.loading() || this.boardStore.loading(),
  );

  protected readonly error = computed(
    () => this.usersStore.error() ?? this.boardStore.error(),
  );

  protected readonly highlightedUserIds = computed(() =>
    computeHighlightedUserIds(this.selectedUserId(), this.usersStore.entities()),
  );

  ngOnInit(): void {
    this.usersStore.loadAll();
    this.boardStore.loadPositions();
    this.deptStore.load();
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

  protected async confirmReassignment(pending: PendingConnection): Promise<void> {
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

  protected async autoLayout(): Promise<void> {
    const users = this.usersStore.entities();
    const onBoard = this.boardStore.userIdsOnBoard();
    const layoutNodes: LayoutNode[] = users
      .filter((u) => onBoard.has(u.id))
      .map((u) => ({ id: u.id, parentId: u.managerId }));
    const positions = computeTreeLayout(layoutNodes);
    const positionByUserId = this.boardStore.positionByUserId();
    const updates = positions
      .map((pos) => {
        const existing = positionByUserId.get(pos.id);
        return existing ? { id: existing.id, x: pos.x, y: pos.y } : undefined;
      })
      .filter((u): u is { id: string; x: number; y: number } => u !== undefined);
    if (updates.length) {
      await this.boardStore.bulkUpdatePositions(updates);
    }
  }

  protected async onRemoveFromBoard(userId: string): Promise<void> {
    const pos = this.boardStore.positionByUserId().get(userId);
    if (!pos) return;

    await cascadeRemoveFromBoard(
      userId,
      pos,
      this.usersStore.entityMap()[userId],
      this.usersStore.entities(),
      {
        removeFromBoard: (id) => this.boardStore.removeFromBoard(id),
        setManager: (uid, managerId) => this.usersStore.setManager(uid, managerId),
      },
    );

    if (this.selectedUserId() === userId) {
      this.selectedUserId.set(null);
    }
  }
}
