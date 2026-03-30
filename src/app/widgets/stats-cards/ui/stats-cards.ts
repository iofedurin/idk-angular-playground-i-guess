import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserRole } from '@entities/user';

@Component({
  selector: 'app-stats-cards',
  template: `
    <div class="stats stats-vertical lg:stats-horizontal shadow w-full">
      <div class="stat">
        <div class="stat-title">Total Users</div>
        <div class="stat-value">{{ total() }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Active</div>
        <div class="stat-value text-success">{{ active() }}</div>
        <div class="stat-desc">{{ total() - active() }} inactive</div>
      </div>
      <div class="stat">
        <div class="stat-title">Admins</div>
        <div class="stat-value">{{ byRole().admin }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Editors</div>
        <div class="stat-value">{{ byRole().editor }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Viewers</div>
        <div class="stat-value">{{ byRole().viewer }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardsComponent {
  total = input.required<number>();
  active = input.required<number>();
  byRole = input.required<Record<UserRole, number>>();
}
