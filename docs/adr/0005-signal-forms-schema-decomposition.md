# ADR 0005 — Schema-декомпозиция Signal Forms: переиспользование валидации между формами

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

В проекте появилась вторая форма — invite dialog (`features/user-invite/`), которая использует подмножество полей user form: `email` и `role`. Обе формы нуждаются в одинаковых базовых валидаторах:

```ts
// user-form-factory.ts (до рефакторинга)
required(s.email, { message: 'Email is required' });
email(s.email, { message: 'Enter a valid email' });
// + user-specific: debounce, validateHttp

required(s.role, { message: 'Role is required' });
```

```ts
// user-invite-dialog.ts (до рефакторинга)
required(s.email);
email(s.email, { message: 'Invalid email address' });

required(s.role);
```

Проблемы:
1. **Дублирование** — одни и те же правила записаны дважды с разными сообщениями об ошибках
2. **Дрейф** — при изменении правила (например, добавить `maxLength` к email) нужно помнить обо всех местах
3. **UI + валидация расходятся** — `EmailFieldComponent` и `RoleFieldComponent` уже переиспользуются как UI, но валидация остаётся inline

## Решение

Извлечь **schema-функции** — чистые функции, которые применяют набор валидаторов к schema path внутри `form()` callback.

### Schema-функции

**Файл:** `entities/user/lib/field-schemas.ts`

```ts
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

### Типизация schema path

Signal Forms передаёт в schema callback (`(s) => { ... }`) объект, чьи свойства — `SchemaPath<T>`. Это internal API Angular, не экспортируемый публично. Вместо `unknown` или `any` используем **вывод через `Parameters`**:

- `Parameters<typeof email>[0]` → `SchemaPath<string, 1, PathKind>` — для валидаторов, привязанных к строковым полям
- `Parameters<typeof required>[0]` → `SchemaPath<unknown, 1, PathKind>` — для валидаторов, работающих с любым типом

Это даёт type safety без зависимости от internal API: если Angular изменит сигнатуру валидаторов, TypeScript поймает несовместимость на этапе компиляции.

### Использование

**User form** — shared schema + user-specific валидаторы:

```ts
emailBaseSchema(s.email);       // shared: required + email format
debounce(s.email, 400);         // user-specific
validateHttp(s.email, { ... }); // user-specific

roleSchema(s.role);             // shared: required
```

**Invite form** — только shared schema:

```ts
emailBaseSchema(s.email);
roleSchema(s.role);
```

Schema-функции **композируемы**: вызывающая сторона может добавить дополнительные валидаторы после вызова shared schema. Порядок вызова определяет приоритет — Angular Signal Forms применяет валидаторы в порядке объявления.

### Публичный API

Экспортируется через `entities/user/index.ts`:

```ts
export { emailBaseSchema, roleSchema } from './lib/field-schemas';
```

## Причины

**1. Единый источник правил валидации**
Базовые правила для email и role определены один раз. Сообщения об ошибках одинаковы во всех формах. При добавлении нового правила (например, `maxLength` для email) — одно изменение.

**2. Композиция, а не наследование**
Schema-функции — обычные функции, не классы и не декораторы. Вызывающая форма может добавить свои валидаторы до или после. Нет жёсткой иерархии — только вызов функции.

**3. Симметрия с UI-компонентами**
`EmailFieldComponent` уже переиспользуется для UI (fieldset + input + errors). `emailBaseSchema` переиспользуется для валидации. Поле email теперь имеет единый источник и для отображения, и для правил.

**4. FSD-совместимость**
`field-schemas.ts` живёт в `entities/user/lib/` — это чистые функции без компонентного контекста, корректный `lib/` сегмент. `features/user-invite/` импортирует из `entities/user` — разрешённый импорт (features → entities). `entities/invitation` не импортирует из `entities/user` — FSD не нарушен.

**5. Минимальная гранулярность**
Каждая schema-функция покрывает одно поле. Это самая мелкая единица переиспользования — если будущая форма нуждается только в email-валидации без role, она импортирует только `emailBaseSchema`.

## Последствия

- Schema-функции экспортируются из `entities/user` — любая feature-форма с полями email/role может их использовать
- `RoleFieldComponent` расширен до `Field<string>` (вместо `Field<UserRole>`) для совместимости с `InviteRole` и другими строковыми union-типами
- Типизация через `Parameters<typeof validator>[0]` — стабильна пока Angular не меняет сигнатуры валидаторов (публичный API)
- При добавлении нового shared поля (например, `phone`) — создать `phoneBaseSchema` в том же файле

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| Оставить inline дублирование | Дрейф правил между формами, разные сообщения об ошибках для одних и тех же полей |
| Единая mega-schema для всех полей формы | Негибко — invite form не имеет username, age, country и т.д. Пришлось бы делать все поля optional или передавать флаги |
| `shared/lib/` вместо `entities/user/lib/` | Валидация email/role семантически привязана к domain entity User, а не к абстрактному shared-слою. Если бы валидация была generic (например, `requiredWithMessage`), shared был бы уместен |
| Типизация через `unknown` | Потеря type safety — `emailBaseSchema` можно было бы вызвать на числовом поле, и `email()` валидатор упал бы в runtime |
| Schema-класс с методами | Избыточная абстракция для двух функций. Функции проще, не требуют инстанцирования, легко tree-shakeable |
