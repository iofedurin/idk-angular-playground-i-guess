import { Injectable } from '@angular/core';

export interface Resettable {
  reset(): void;
}

@Injectable({ providedIn: 'root' })
export class AppScopeRegistry {
  private readonly stores = new Set<Resettable>();

  register(store: Resettable): void {
    this.stores.add(store);
  }

  resetAll(): void {
    this.stores.forEach((s) => s.reset());
  }
}
