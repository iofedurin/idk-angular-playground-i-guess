import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { UserRole } from '@entities/user';
import { SelectionStore } from '../../lib/selection.store';

@Component({
  selector: 'app-bulk-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectionStore.selectedCount() > 0) {
      <div class="flex items-center gap-3 p-3 bg-base-200 rounded-box mb-4">
        <span class="text-sm font-medium">{{ selectionStore.selectedCount() }} selected</span>

        <button class="btn btn-sm btn-error" (click)="deleteSelected.emit()">
          Delete selected ({{ selectionStore.selectedCount() }})
        </button>

        <div class="dropdown">
          <button tabindex="0" class="btn btn-sm btn-outline">Change role ▾</button>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-36 p-2 shadow">
            @for (role of roles; track role) {
              <li><button (click)="changeRole.emit(role)">{{ role }}</button></li>
            }
          </ul>
        </div>

        <button class="btn btn-sm btn-ghost ml-auto" (click)="selectionStore.clearAll()">Clear</button>
      </div>
    }
  `,
})
export class BulkToolbarComponent {
  protected readonly selectionStore = inject(SelectionStore);
  protected readonly roles: UserRole[] = ['viewer', 'editor', 'admin'];

  readonly deleteSelected = output<void>();
  readonly changeRole = output<UserRole>();
}
