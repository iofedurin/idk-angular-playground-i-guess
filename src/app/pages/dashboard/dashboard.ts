import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { getAncestors, UserRole, UsersStore } from '@entities/user';
import { ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-dashboard',
  imports: [SpinnerComponent, ErrorAlertComponent],
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

  protected readonly orphanedUsers = computed(() =>
    this.store.entities().filter((u) => !u.managerId).length,
  );

  protected readonly topManagers = computed(() => {
    const users = this.store.entities();
    const counts = new Map<string, number>();
    for (const u of users) {
      if (u.managerId) counts.set(u.managerId, (counts.get(u.managerId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => {
        const manager = users.find((u) => u.id === id);
        return { name: manager ? `${manager.firstName} ${manager.lastName}` : id, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  protected readonly maxDepth = computed(() => {
    const users = this.store.entities();
    let maxD = 0;
    for (const u of users) {
      maxD = Math.max(maxD, getAncestors(u.id, users).size);
    }
    return maxD;
  });

  ngOnInit() {
    this.store.loadAll();
  }
}
