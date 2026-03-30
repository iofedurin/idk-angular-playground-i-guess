# Adding a New Page

**Trigger**: задача требует новый роут / экран.

---

## File Structure

```
pages/<name>/
  <name>.ts           — component
  <name>.html         — template (или inline для маленьких)
  <name>.spec.ts      — тесты
  index.ts            — export { PageComponent }
```

Имена страниц: `<action>-<entity>` (user-create, departments-list) или функциональные (dashboard, audit-log).

---

## Component

```ts
@Component({
  selector: 'app-page-name',
  imports: [RouterLink, /* entity components, shared UI */],
  templateUrl: './page-name.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNamePage implements OnInit {
  private readonly store = inject(EntityStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly appId = this.route.snapshot.paramMap.get('appId')!;

  ngOnInit() {
    this.store.loadAll();  // одноразовая загрузка
  }
}
```

### Почему `ngOnInit`, а не `effect`

`AppRouteReuseStrategy` гарантирует destroy/recreate компонента при смене `appId`. Поэтому `ngOnInit` вызывается заново при переключении workspace — `effect` не нужен.

### Когда использовать `effect`

Только если страница имеет **реактивные params** (фильтры, сортировка, пагинация), которые меняются в runtime:

```ts
private readonly params = computed(() => ({
  page: this.page(),
  q: this.filters().search || undefined,
  sort: this.sort(),
}));

constructor() {
  effect(() => { void this.store.loadPage(this.params()); });
}
```

Для одноразовой загрузки — **всегда** `ngOnInit`.

---

## Template — Three-Phase Pattern

Каждая страница с данными рендерится в трёх фазах: loading → error → content.

```html
<!-- Header + actions -->
<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold">Page Title</h1>
  <a [routerLink]="['/app', appId, 'entities', 'new']" class="btn btn-primary">
    Add Entity
  </a>
</div>

<!-- Three-phase block -->
@if (store.loading()) {
  <app-spinner />
} @else if (store.error()) {
  <app-error-alert [message]="store.error()!" />
} @else {
  <!-- Content -->
  @for (item of store.entities(); track item.id) {
    <!-- render item -->
  } @empty {
    <p class="text-center py-8 opacity-60">No entities found.</p>
  }
}
```

---

## Route Registration

```ts
// app.routes.ts — внутри children: [] роута app/:appId
{
  path: '<path>',
  loadComponent: () => import('./pages/<name>').then(m => m.PageComponent),
}
```

Lazy loading через `loadComponent` — каждая страница загружается по требованию.

---

## Navigation

| Контекст | Способ | Пример |
|---|---|---|
| Ссылка в шаблоне | `RouterLink` | `[routerLink]="['/app', appId, 'entities']"` |
| После мутации | `Router.navigate` (с `await`) | `await this.router.navigate(['/app', appId, 'entities'])` |

**Навигация после мутации** — всегда в submission action, не в `effect`:

```ts
onSubmit: async () => {
  const entity = await this.store.create(dto);
  if (entity) await this.router.navigate(['/app', this.appId, 'entities']);
},
```

---

## Checklist

- [ ] Component + template + spec + index.ts
- [ ] Route зарегистрирован в `app.routes.ts` через `loadComponent`
- [ ] `ngOnInit` для одноразовой загрузки, `effect` только для реактивных params
- [ ] Template: three-phase (loading/error/content)
- [ ] Навигация после мутации через `Router.navigate` с `await`
