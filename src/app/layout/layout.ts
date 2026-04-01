import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStore } from '@entities/app';
import { ActivityBellComponent } from '@features/activity-feed';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ActivityBellComponent],
  template: `
    <header class="navbar bg-base-200 shadow-sm px-4">
      <div class="flex-1">
        <span class="text-lg font-bold mr-4">HR Portal</span>
        <ul class="menu menu-horizontal px-0 gap-1">
          <li>
            <a
              [routerLink]="['/app', appStore.currentAppId()]"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
            >Dashboard</a>
          </li>
          <li>
            <a
              [routerLink]="['/app', appStore.currentAppId(), 'users']"
              routerLinkActive="active"
            >Users</a>
          </li>
          <li>
            <a
              [routerLink]="['/app', appStore.currentAppId(), 'departments']"
              routerLinkActive="active"
            >Departments</a>
          </li>
          <li>
            <a
              [routerLink]="['/app', appStore.currentAppId(), 'org-board']"
              routerLinkActive="active"
            >Org Board</a>
          </li>
          <li>
            <a
              [routerLink]="['/app', appStore.currentAppId(), 'audit']"
              routerLinkActive="active"
            >Audit Log</a>
          </li>
        </ul>
      </div>
      <div class="flex-none flex items-center gap-1">
        <app-activity-bell />
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-sm gap-1" aria-haspopup="true" aria-label="Switch workspace">
            {{ appStore.currentAppName() }}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box shadow-md w-48 z-50" role="menu">
            @for (app of appStore.apps(); track app.id) {
              <li role="none">
                <a
                  role="menuitem"
                  [routerLink]="['/app', app.id]"
                  [class.active]="app.id === appStore.currentAppId()"
                >
                  {{ app.name }}
                </a>
              </li>
            }
          </ul>
        </div>
      </div>
    </header>
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  protected readonly appStore = inject(AppStore);
}
