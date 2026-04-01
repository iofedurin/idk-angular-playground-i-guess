import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { FCanvasComponent, FCreateConnectionEvent, FCreateNodeEvent, FFlowModule, FReassignConnectionEvent } from '@foblex/flow';
import { IPoint } from '@foblex/2d';
import { UserBoardCardComponent } from '@widgets/user-board-card';
import type { BoardEdge, BoardNode } from '@features/org-board';
import { ORG_BOARD_CURVE_BUILDER } from './org-board-curve-builder';

export type ConnectionMode = 'org-board-curve' | 'bezier';

@Component({
  selector: 'app-org-board-canvas',
  imports: [FFlowModule, UserBoardCardComponent],
  templateUrl: './org-board-canvas.html',
  providers: [ORG_BOARD_CURVE_BUILDER],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host ::ng-deep .f-minimap-view {
      fill: transparent !important;
      stroke: #6366f1 !important;
      stroke-width: 2 !important;
    }
    :host ::ng-deep .f-minimap-node {
      fill: #6366f1 !important;
    }
  `,
})
export class OrgBoardCanvasComponent {
  readonly nodes = input.required<BoardNode[]>();
  readonly edges = input.required<BoardEdge[]>();
  readonly selectedUserId = input<string | null>(null);
  readonly validTargetsByUser = input.required<Map<string, string[]>>();
  readonly highlightedUserIds = input<Set<string>>(new Set());

  readonly nodePositionChanged = output<{ userId: string; positionId: string; x: number; y: number }>();
  readonly connectionCreated = output<{ managerId: string; subordinateId: string }>();
  readonly connectionRemoved = output<{ subordinateId: string }>();
  readonly nodeClicked = output<string>();
  readonly externalDrop = output<{ userId: string; x: number; y: number }>();

  protected readonly connectionMode = signal<ConnectionMode>('org-board-curve');

  private readonly fCanvas = viewChild(FCanvasComponent);

  protected readonly hasIncomingEdge = computed(() => {
    const set = new Set<string>();
    for (const e of this.edges()) set.add(e.subordinateId);
    return set;
  });

  protected toggleConnectionMode(): void {
    this.connectionMode.update(m => m === 'org-board-curve' ? 'bezier' : 'org-board-curve');
  }

  protected fitToScreen(): void {
    this.fCanvas()?.fitToScreen(undefined, true);
  }

  protected zoomIn(): void {
    const c = this.fCanvas();
    if (!c) return;
    c.setScale(c.getScale() + 0.2);
    c.redraw();
  }

  protected zoomOut(): void {
    const c = this.fCanvas();
    if (!c) return;
    c.setScale(Math.max(0.1, c.getScale() - 0.2));
    c.redraw();
  }

  private isDragging = false;

  protected onDragStarted(): void {
    this.isDragging = true;
  }

  protected onDragEnded(): void {
    // Reset after the click event fires (click fires synchronously after mouseup)
    setTimeout(() => (this.isDragging = false), 0);
  }

  protected onNodeClick(userId: string): void {
    if (this.isDragging) return;
    this.nodeClicked.emit(userId);
  }

  protected onPositionChange(node: BoardNode, position: IPoint): void {
    this.nodePositionChanged.emit({
      userId: node.userId,
      positionId: node.positionId,
      x: position.x,
      y: position.y,
    });
  }

  protected onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    const managerId = event.sourceId.replace('out-', '');
    const subordinateId = event.targetId.replace('in-', '');
    this.connectionCreated.emit({ managerId, subordinateId });
  }

  /** Handles disconnect only (drag to void). If Foblex emits reassign to new target, handle here. */
  protected onConnectionReassigned(event: FReassignConnectionEvent): void {
    if (event.endpoint === 'target' && event.nextTargetId == null) {
      const subordinateId = event.previousTargetId.replace('in-', '');
      this.connectionRemoved.emit({ subordinateId });
    }
  }

  protected onExternalDrop(event: FCreateNodeEvent<string>): void {
    this.externalDrop.emit({
      userId: event.data,
      x: event.externalItemRect.x,
      y: event.externalItemRect.y,
    });
  }

}
