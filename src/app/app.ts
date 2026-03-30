import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppStore } from '@entities/app';
import { ToastComponent } from '@shared/ui';
import { WebSocketService } from '@shared/lib';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `<router-outlet /><app-toast />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly appStore = inject(AppStore);

  constructor() {
    inject(WebSocketService).connect('ws://localhost:3000');
  }

  ngOnInit() {
    this.appStore.loadApps();
  }
}
