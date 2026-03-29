import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppStore } from '@entities/app';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="navbar bg-base-200 shadow-sm px-4">
      <div class="flex-1">
        <span class="text-lg font-bold">HR Portal</span>
      </div>
      <div class="flex-none">
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-sm gap-1" aria-haspopup="true" aria-label="Switch workspace">
            {{ appStore.currentAppName() }}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box shadow-md w-48 z-10" role="menu">
            @for (app of appStore.apps(); track app.id) {
              <li role="none">
                <a
                  role="menuitem"
                  [routerLink]="['/app', app.id, 'users']"
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
export class App implements OnInit {
  protected readonly appStore = inject(AppStore);

  ngOnInit() {
    this.appStore.loadApps();
  }
}
