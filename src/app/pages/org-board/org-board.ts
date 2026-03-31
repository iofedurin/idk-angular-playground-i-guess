import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FFlowModule } from '@foblex/flow';

@Component({
  selector: 'app-org-board-page',
  imports: [FFlowModule],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage {}
