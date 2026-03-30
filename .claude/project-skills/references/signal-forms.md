# Signal Forms Patterns

**Trigger**: задача требует форму ввода данных.

---

## Form Model Ownership

`WritableSignal<FormModel>` живёт на **странице**, не в store и не в widget.

**Принцип:**
- **Store** — source of truth для серверных данных (entities)
- **Page signal** — source of truth для пользовательского ввода (form state)
- **Form factory** — декоратор: принимает model, навешивает валидаторы, возвращает form object
- **Widget** — презентация: принимает form object и model, рендерит поля

### Create page

```ts
// pages/entity-create/entity-create.ts
export class EntityCreatePage {
  private readonly model = signal<EntityFormModel>({ /* initial empty */ });

  protected readonly entityForm = createEntityForm(this.model, {
    onSubmit: async () => {
      const entity = await this.store.create(this.model());
      if (entity) await this.router.navigate(['/app', this.appId, 'entities']);
    },
  });
}
```

### Edit page

Model инициализируется из store однократно в `ngOnInit` — **pull, не push**:

```ts
// pages/entity-edit/entity-edit.ts
export class EntityEditPage implements OnInit {
  private readonly model = signal<EntityFormModel>({ /* initial empty */ });

  protected readonly entityForm = createEntityForm(this.model, {
    excludeId: () => this.entityId,  // исключить себя из uniqueness checks
    onSubmit: async () => {
      if (await this.store.update(this.entityId, this.model())) {
        await this.router.navigate(['/app', this.appId, 'entities']);
      }
    },
  });

  ngOnInit() {
    const entity = this.store.entityMap()[this.entityId];
    if (entity) this.model.set(mapEntityToFormModel(entity));
  }
}
```

**Почему не `linkedSignal` от store:** `store.update()` перезапишет model серверными данными → мерцание формы. Одноразовый `model.set()` в `ngOnInit` — форма забирает данные один раз и живёт автономно.

---

## Form Factory

Живёт в `entities/<entity>/lib/`. Не знает о create/edit — различие определяется опциями.

```ts
// entities/<entity>/lib/<entity>-form-factory.ts
export interface EntityFormOptions {
  excludeId?: () => string | undefined;  // для edit — исключить себя из uniqueness checks
  onSubmit: () => Promise<void>;
}

export function createEntityForm(
  model: WritableSignal<EntityFormModel>,
  options: EntityFormOptions,
) {
  return form(model, (s) => {
    // Shared schema functions
    nameBaseSchema(s.name);

    // Entity-specific validators
    if (options.excludeId) {
      debounce(s.name, 400);
      validateHttp(s.name, { /* uniqueness check */ });
    }
  }, {
    submission: {
      action: async () => { await options.onSubmit(); return undefined; },
    },
  });
}

export type EntityForm = ReturnType<typeof createEntityForm>;
```

---

## Schema Functions

Чистые функции, применяющие набор валидаторов к schema path. Переиспользуются между формами (create, edit, invite dialog...).

```ts
// entities/<entity>/lib/field-schemas.ts
import { email, required } from '@angular/forms/signals';

type StringSchemaField = Parameters<typeof email>[0];
type AnySchemaField = Parameters<typeof required>[0];

export function emailBaseSchema(emailField: StringSchemaField): void {
  required(emailField, { message: 'Email is required' });
  email(emailField, { message: 'Enter a valid email address' });
}

export function roleSchema(roleField: AnySchemaField): void {
  required(roleField, { message: 'Role is required' });
}
```

**Типизация**: `Parameters<typeof validator>[0]` — type-safe без зависимости от internal API Angular.

**Композиция**: вызывающая форма может добавить валидаторы после schema-функции:

```ts
emailBaseSchema(s.email);       // shared: required + email format
debounce(s.email, 400);         // form-specific
validateHttp(s.email, { ... }); // form-specific
```

---

## Field Components

Живут в `entities/<entity>/ui/fields/`. Инкапсулируют fieldset + input + error messages.

```ts
@Component({
  selector: 'app-entity-name-field',
  imports: [FormField, FieldErrorsComponent],
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Name</legend>
      <input [formField]="field()" class="input w-full" />
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityNameFieldComponent {
  readonly field = input.required<Field<string>>();
  protected readonly messages: Record<string, string> = {
    required: 'Name is required',
    // custom error kinds from validateHttp
  };
}
```

---

## Widget Form

Создавать **только** если шаблон формы нужен на 2+ страницах (create + edit):

```ts
// widgets/<entity>-form/ui/<entity>-form.ts
@Component({
  selector: 'app-entity-form',
  imports: [FormRoot, RouterLink, /* field components */],
  templateUrl: './<entity>-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFormComponent {
  readonly entityForm = input.required<EntityForm>();
  readonly model = input.required<Signal<EntityFormModel>>();
  readonly title = input.required<string>();
  readonly submitLabel = input<string>('Save');
  readonly cancelLink = input<string[]>(['/']);
}
```

Если форма используется только на одной странице — шаблон остаётся inline на странице.

---

## Checklist

- [ ] `model = signal<FormModel>()` — на странице, не в store
- [ ] Form factory в `entities/<entity>/lib/` — принимает model + options
- [ ] Schema-функции для переиспользуемых валидаций
- [ ] Field-компоненты в `entities/<entity>/ui/fields/`
- [ ] Widget-форма только при 2+ потребителях
- [ ] Навигация после submit — в `onSubmit` callback, не в `effect`
