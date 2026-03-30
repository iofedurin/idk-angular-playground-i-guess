# ADR 0008 — Form model ownership: сигнал на странице, не в сторе

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

Signal Forms (`@angular/forms/signals`) требуют `WritableSignal<T>` как source of truth для формы. Функция `form(model, schema, options)` принимает сигнал и строит реактивное дерево полей.

Вопрос: **где** должен жить этот `WritableSignal<FormModel>`?

Варианты:
1. В entity store (UsersStore) — рядом с серверными данными
2. В feature store — отдельный store для формового состояния
3. На странице (page component) — как локальный сигнал
4. В widget-компоненте формы — рядом с шаблоном

## Решение

`model = signal<UserFormModel>({...})` создаётся на **странице** (page component). Form factory получает его как аргумент:

```ts
// pages/user-create/user-create.ts
export class UserCreatePage {
  private readonly model = signal<UserFormModel>({ /* initial empty */ });

  protected readonly userForm = createUserForm(this.model, {
    onSubmit: async () => {
      await this.store.create({ ...this.model() });
      await this.router.navigate(['/app', this.appId, 'users']);
    },
  });
}
```

Edit-страница инициализирует model из стора однократно в `ngOnInit`:

```ts
// pages/user-edit/user-edit.ts
export class UserEditPage implements OnInit {
  private readonly model = signal<UserFormModel>({ /* initial empty */ });

  protected readonly userForm = createUserForm(this.model, {
    excludeId: () => this.userId,
    onSubmit: async () => { /* store.update + navigate */ },
  });

  ngOnInit() {
    const user = this.store.entityMap()[this.userId];
    if (user) this.model.set(mapUserToFormModel(user));
  }
}
```

### Принцип

- **Store** — source of truth для серверных данных (entities)
- **Page signal** — source of truth для пользовательского ввода (form state)
- **Form factory** — декоратор: принимает model, навешивает валидаторы, возвращает form object
- **Widget** — презентация: принимает form object и model, рендерит поля

## Причины

**1. Форма — транзиентное состояние**
Пользовательский ввод не должен персистироваться в глобальном store. При уходе со страницы form state уничтожается — это ожидаемое поведение. Если model жил бы в store, потребовался бы explicit cleanup.

**2. Edit-форма не должна реактивно обновляться из стора**
Если `model` — `linkedSignal` от `store.entityMap()[id]`, то `store.update()` (вызванный в submit) перезапишет model новыми серверными данными. Пользователь увидит «мерцание» формы. Одноразовый `patchModel()` в ngOnInit — **pull, не push**: форма забирает данные один раз и далее живёт автономно.

**3. Create-форма начинает с пустого состояния**
Нет серверных данных для инициализации. Model начинается как `{ username: '', email: '', ... }`. Хранить это в store бессмысленно.

**4. Form factory не владеет model — она декорирует**
`createUserForm(model, options)` принимает model извне. Factory не знает, создаётся ли форма для create или edit. Различие определяется вызывающей стороной (page) через `options.excludeId` и `options.onSubmit`.

**5. Widget не владеет model — он отображает**
`<app-user-form [userForm]="userForm" [model]="model" />` — widget получает оба: form object и model signal. Widget рендерит поля, не знает о create/edit.

## Последствия

- `signal<FormModel>()` — на каждой странице с формой (user-create, user-edit, department-create, department-edit, user-invite-dialog)
- Нет auto-save, нет draft persistence. Уход со страницы = потеря несохранённых данных
- `linkedSignal` не используется для form models — осознанный отказ от reactive binding
- Маппинг FormModel → DTO происходит в submission action (единственная точка трансформации)

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| Model в entity store | Store хранит серверные данные, не пользовательский ввод. Требует cleanup при уходе со страницы. Нарушает single responsibility |
| Model в feature store | Over-engineering: один потребитель (page), не нужен глобальный доступ |
| `linkedSignal` от store | Перезаписывает ввод при store update. Подходит для read-only derived state, не для mutable form state |
| Model в widget | Widget не знает о create/edit различии. Не может инициализировать model из стора |
