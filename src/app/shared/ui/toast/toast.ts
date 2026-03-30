import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';

interface Toast {
  id: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  error(message: string, duration = 4000): void {
    const id = crypto.randomUUID();
    this.toasts.update((t) => [...t, { id, message }]);
    setTimeout(() => this.#dismiss(id), duration);
  }

  #dismiss(id: string): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast toast-top toast-end z-50' },
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div class="alert alert-error">
        <span>{{ toast.message }}</span>
      </div>
    }
  `,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
