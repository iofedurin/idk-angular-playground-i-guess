import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { UserRole, UsersStore } from '@entities/user';
import { StatsCardsComponent } from '@widgets/stats-cards';

@Component({
  selector: 'app-dashboard',
  imports: [StatsCardsComponent],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  protected readonly store = inject(UsersStore);

  protected readonly totalUsers = computed(() => this.store.entities().length);
  protected readonly activeUsers = computed(() =>
    this.store.entities().filter((u) => u.active).length,
  );
  protected readonly byRole = computed(() => {
    const result: Record<UserRole, number> = { admin: 0, editor: 0, viewer: 0 };
    for (const u of this.store.entities()) result[u.role]++;
    return result;
  });
  protected readonly byDepartment = computed(() => {
    const counts: Record<string, number> = {};
    for (const u of this.store.entities()) {
      counts[u.department] = (counts[u.department] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });
  protected readonly recentUsers = computed(() =>
    [...this.store.entities()].slice(-5).reverse(),
  );

  ngOnInit() {
    this.store.loadAll();
  }
}
