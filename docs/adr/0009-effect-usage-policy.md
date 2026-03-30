# ADR 0009 — effect() как escape hatch: политика минимального использования

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

Angular Signals предоставляют `effect()` для выполнения side-effects в ответ на изменение сигналов. Документация Angular предупреждает о злоупотреблении: effect не должен заменять computed, не должен мутировать сигналы без необходимости, не должен использоваться для data flow.

В проекте нужно было определить, когда использование `effect()` оправдано, а когда — нет.

## Решение

**Правило**: effect — последнее средство. Использовать только когда задача **не решается** через:
1. `computed()` + template binding
2. `ngOnInit()` + `await`
3. Signal Forms submission action
4. Event handler в шаблоне

### Допустимые кейсы (реализованы)

**1. Computed → effect pipeline для реактивной загрузки данных**

```ts
// pages/users-list/users-list.ts
private readonly params = computed<UserPageParams>(() => ({
  page: this.page(),
  q: this.filters().search || undefined,
  // ...
}));

constructor() {
  effect(() => { void this.store.loadPage(this.params()); });
}
```

Оправдание: `params` — computed от 3 сигналов (page, filters, sort). При изменении любого из них нужно автоматически перезагрузить данные. Альтернативы:
- Вызывать `loadPage` в каждом setter'е (page, filters, sort) — дублирование, race conditions
- Подписка на paramMap — params не из роута, а из локальных сигналов
- `ngOnInit` — недостаточно, params меняются в runtime

**2. Императивное управление DOM API**

```ts
// features/user-invite/ui/user-invite-dialog.ts
effect(() => {
  const dialog = this.dialogRef()?.nativeElement;
  if (!dialog) return;
  if (this.open()) dialog.showModal();
  else { dialog.close(); this.inviteForm().reset(); }
});
```

Оправдание: `HTMLDialogElement.showModal()` — императивный API. Нельзя выразить через template binding (`[open]` атрибут не вызывает `showModal()`; `showModal()` нужен для backdrop и focus trap).

### Недопустимые кейсы (не реализованы — и правильно)

**Загрузка данных на странице без реактивных params**

```ts
// ❌ НЕ делать:
effect(() => { this.store.loadAll(); });

// ✅ Правильно:
ngOnInit() { this.store.loadAll(); }
```

Dashboard, audit-log, departments-list, user-profile — все используют `ngOnInit()`. Загрузка данных — одноразовое действие при маунте, не реакция на сигнал. `AppRouteReuseStrategy` гарантирует destroy/recreate при смене appId → `ngOnInit` вызывается заново.

**Навигация после мутации**

```ts
// ❌ НЕ делать:
effect(() => { if (this.submitted()) this.router.navigate(...); });

// ✅ Правильно:
onSubmit: async () => {
  await this.store.create(...);
  await this.router.navigate(...);
}
```

Навигация — следствие конкретного user action (submit), а не реакция на state change. Signal Forms submission action — правильное место.

**Синхронизация между сторами**

```ts
// ❌ НЕ делать:
effect(() => { this.departmentStore.loadAll(this.appStore.currentAppId()); });

// ✅ Правильно:
// appSwitchGuard → AppScopeRegistry.resetAll() → store.load() при первом использовании
```

Cross-store синхронизация решается через guard + registry pattern, не через effect.

## Причины

**1. Предсказуемость**
2 effect'а легко найти, легко дебажить. 20 effect'ов — «магия», где один effect триггерит другой через shared signal.

**2. Тестируемость**
`ngOnInit()` + `await` легко тестируется: `fixture.detectChanges() → httpMock.flush() → await flush()`. Effect в тесте требует дополнительного `TestBed.flushEffects()` или ожидания microtask drain.

**3. Согласованность с zoneless-подходом (ADR 0003)**
В zoneless-мире нет автоматического change detection от effect'ов. Чем меньше effect'ов — тем меньше неявных update-циклов.

## Последствия

- Каждый новый `effect()` — осознанное решение, требующее обоснования
- Для новых страниц — по умолчанию `ngOnInit()`, effect — только если есть реактивные params
- Для dialog/modal — effect + imperative DOM API как установленный паттерн
- Метрика здоровья проекта: количество effect'ов должно расти значительно медленнее количества компонентов

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| effect для каждой загрузки данных | Избыточно для one-shot загрузки. `ngOnInit` проще и тестируемее |
| `afterRenderEffect` для dialog | `afterRenderEffect` привязан к render-циклу, а dialog открывается по user action. `effect()` реагирует на input signal — семантически точнее |
| Запрет effect полностью | Есть легитимные кейсы (computed→load pipeline, imperative DOM). Полный запрет вынудит использовать менее читаемые workaround'ы |
