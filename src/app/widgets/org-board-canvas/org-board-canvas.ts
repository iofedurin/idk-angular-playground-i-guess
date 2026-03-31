import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FCreateConnectionEvent, FFlowModule, FReassignConnectionEvent } from '@foblex/flow';
import { IPoint } from '@foblex/2d';
import { UserBoardCardComponent } from '@widgets/user-board-card';
import type { BoardEdge, BoardNode } from '@features/org-board';

@Component({
  selector: 'app-org-board-canvas',
  imports: [FFlowModule, UserBoardCardComponent],
  templateUrl: './org-board-canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardCanvasComponent {
  readonly nodes = input.required<BoardNode[]>();
  readonly edges = input.required<BoardEdge[]>();
  readonly selectedUserId = input<string | null>(null);
  readonly validTargetsByUser = input.required<Map<string, string[]>>();

  readonly nodePositionChanged = output<{ userId: string; positionId: string; x: number; y: number }>();
  readonly connectionCreated = output<{ managerId: string; subordinateId: string }>();
  readonly connectionRemoved = output<{ subordinateId: string }>();
  readonly nodeClicked = output<string>();
  readonly externalDrop = output<{ userId: string; x: number; y: number }>();

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

  protected onConnectionReassigned(event: FReassignConnectionEvent): void {
    if (event.endpoint === 'target' && event.nextTargetId == null) {
      const subordinateId = event.previousTargetId.replace('in-', '');
      this.connectionRemoved.emit({ subordinateId });
    }
  }
}
