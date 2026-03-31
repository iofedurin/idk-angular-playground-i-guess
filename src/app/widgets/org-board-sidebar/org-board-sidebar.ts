import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import type { User } from '@entities/user';

@Component({
  selector: 'app-org-board-sidebar',
  imports: [FFlowModule],
  templateUrl: './org-board-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardSidebarComponent {
  readonly users = input.required<User[]>();
  readonly userIdsOnBoard = input.required<Set<string>>();
  readonly selectedUser = input<User | null>(null);
  readonly directReports = input<User[]>([]);
  readonly manager = input<User | null>(null);

  readonly userSelected = output<string>();
  readonly backToList = output<void>();
  readonly removeFromBoard = output<string>();
  readonly removeManager = output<string>(); // emits userId of the person whose manager should be removed

  protected readonly search = signal('');

  protected readonly mode = computed(() =>
    this.selectedUser() ? ('details' as const) : ('list' as const),
  );

  protected readonly filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    const onBoard = this.userIdsOnBoard();
    return this.users()
      .filter(
        (u) =>
          !q ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // Not-on-board users first (easier to discover who to add)
        const aOnBoard = onBoard.has(a.id) ? 1 : 0;
        const bOnBoard = onBoard.has(b.id) ? 1 : 0;
        return aOnBoard - bOnBoard;
      });
  });

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
