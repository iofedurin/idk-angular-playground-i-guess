# Adding a New Entity

**Trigger**: задача требует новую доменную сущность (модель данных + API + state management).

---

## File Structure

Минимальная entity:

```
entities/<name>/
  <name>.model.ts          — interface, type aliases, DTO
  <name>-api.ts            — @Injectable, HttpClient methods
  <name>.store.ts          — signalStore
  index.ts                 — public API (barrel)
```

Если entity имеет UI-компоненты (select/options):

```
entities/<name>/
  ui/
    <name>-options/<name>-options.ts    — рендер <option>, host: display: contents
    <name>-select/<name>-select.ts     — form wrapper + store.load() + skeleton
```

Если entity имеет валидацию или утилиты:

```
entities/<name>/
  lib/
    <name>-form-factory.ts   — createEntityForm()
    field-schemas.ts          — schema-функции для валидации
```

---

## Model

```ts
// entities/<name>/<name>.model.ts
export interface Entity {
  id: string;
  // domain fields
}

export interface CreateEntityDto {
  // fields without id
}

export interface UpdateEntityDto extends Partial<CreateEntityDto> {}
```

---

## API

```ts
// entities/<name>/<name>-api.ts
@Injectable({ providedIn: 'root' })
export class EntityApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Entity[]>('/api/entities');
  }

  create(dto: CreateEntityDto) {
    return this.http.post<Entity>('/api/entities', dto);
  }

  update(id: string, dto: UpdateEntityDto) {
    return this.http.patch<Entity>(`/api/entities/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`/api/entities/${id}`);
  }
}
```

API-класс **не экспортируется** через barrel — приватная деталь реализации, доступен только через store.

---

## Store

```ts
// entities/<name>/<name>.store.ts
import { withAppScoped } from '@shared/lib';

interface EntityState {
  loading: boolean;
  error: string | null;
  // entity-specific state
}

export const EntityStore = signalStore(
  { providedIn: 'root' },
  withEntities<Entity>(),           // если коллекция
  withState<EntityState>({ loading: false, error: null }),
  withMethods((store, api = inject(EntityApi)) => ({

    // Чтения — try/catch + loading/error state
    async loadAll(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const items = await lastValueFrom(api.getAll());
        patchState(store, setAllEntities(items), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load entities' });
      }
    },

    // Мутации — httpMutation + boolean/T|undefined return
    async create(dto: CreateEntityDto): Promise<Entity | undefined> {
      const r = await httpMutation(api.create(dto));
      if (!r.ok) return;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    async remove(id: string): Promise<boolean> {
      const r = await httpMutation(api.remove(id));
      if (!r.ok) return false;
      patchState(store, removeEntity(id));
      return true;
    },

    // reset — обязателен для app-scoped stores
    reset(): void {
      patchState(store, setAllEntities([] as Entity[]), {
        loading: false, error: null,
      });
    },
  })),
  withAppScoped(),  // авторегистрация для app-switch reset
);
```

### Reference data store (загружается один раз)

Для справочных данных (неизменяемые в runtime) — кэш по наличию данных:

```ts
async load(): Promise<void> {
  if (store.entities().length) return;  // уже загружено
  const data = await lastValueFrom(api.getAll());
  patchState(store, setAllEntities(data));
}
```

---

## Options Component (если нужен select)

Чистый рендер `<option>`/`<optgroup>` без формовой обвязки. Используется и в form-select, и в фильтрах.

```ts
// entities/<name>/ui/<name>-options/<name>-options.ts
@Component({
  selector: 'app-entity-options',
  host: { style: 'display: contents' },  // убрать host-элемент из layout внутри <select>
  template: `
    @for (item of store.entities(); track item.id) {
      <option [value]="item.id">{{ item.name }}</option>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityOptionsComponent {
  private readonly store = inject(EntityStore);
}
```

**Не вызывает `store.load()`** — это ответственность родителя (form-select или filter-компонент).

---

## Select Component (form wrapper)

```ts
// entities/<name>/ui/<name>-select/<name>-select.ts
@Component({
  selector: 'app-entity-select',
  imports: [FormField, FieldErrorsComponent, EntityOptionsComponent, SpinnerComponent],
  template: `
    @if (store.entities().length === 0) {
      <app-spinner />
    } @else {
      <select [formField]="field()" class="select w-full">
        <option value="">Select entity...</option>
        <app-entity-options />
      </select>
      <app-field-errors [field]="field()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitySelectComponent {
  readonly field = input.required<Field<string>>();
  private readonly store = inject(EntityStore);
  constructor() { this.store.load(); }
}
```

---

## Barrel Export (index.ts)

```ts
// Экспортировать:
export type { Entity, CreateEntityDto, UpdateEntityDto } from './<name>.model';
export { EntityStore } from './<name>.store';
export { EntitySelectComponent } from './ui/<name>-select/<name>-select';       // если есть
export { EntityOptionsComponent } from './ui/<name>-options/<name>-options';     // если есть
export { createEntityForm, type EntityForm } from './lib/<name>-form-factory';  // если есть
export { fieldBaseSchema } from './lib/field-schemas';                          // если есть

// НЕ экспортировать:
// EntityApi — приватный, доступен только через store
// EntityState — internal implementation detail
```

---

## Checklist

- [ ] Model + API + Store + index.ts созданы
- [ ] Store использует `withAppScoped()` (если entity scoped к workspace)
- [ ] Store имеет `reset()` метод
- [ ] Чтения: try/catch + loading/error state
- [ ] Мутации: `httpMutation()` + `T | undefined` / `boolean` return
- [ ] API-класс НЕ экспортирован через barrel
- [ ] `bun run test` — все тесты проходят
- [ ] `bun run build` — сборка без ошибок
