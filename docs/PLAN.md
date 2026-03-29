# Playground Expansion Plan

## Stack additions

| Package | Purpose |
|---|---|
| `json-server` | Fake REST backend, zero config |
| `concurrently` | Run Angular dev server + json-server together |
| `@ngrx/signals` | Signal Store for users feature state |

---

## Phase 1 — Fake Backend [x]

### `fake-backend/db.json`
json-server exposes every top-level key as a REST resource automatically.

```jsonc
{
  "users": [
    { "id": "1", "username": "jdoe", "firstName": "John", "lastName": "Doe",
      "email": "john@example.com", "age": 30, "country": "US",
      "department": "engineering", "jobTitle": "senior-frontend",
      "role": "editor", "active": true, "bio": "" }
    // ... 4 more seed users
  ],
  "countries": [
    { "code": "US", "name": "United States" },
    { "code": "DE", "name": "Germany" }
    // ...
  ],
  "departments": [
    { "id": "engineering", "name": "Engineering" },
    { "id": "design", "name": "Design" }
    // ...
  ],
  "job-titles": [
    { "id": "senior-frontend", "name": "Senior Frontend Engineer" }
    // ...
  ]
}
```

**Why these 3 as reference data:**
- `countries` — realistic, large list, always from server
- `departments` — org-specific, changes rarely, good cache candidate
- `job-titles` — same pattern; gives us 3 separate `resource()` calls to explore

### `proxy.conf.json`
```json
{ "/api": { "target": "http://localhost:3000", "pathRewrite": { "^/api": "" } } }
```

### `package.json` scripts
```json
"backend": "json-server fake-backend/db.json --port 3000",
"dev": "concurrently \"bun run start\" \"bun run backend\""
```

---

## Phase 2 — Data model [x]

```ts
// user.model.ts
export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  country: string;      // code, e.g. "US"
  department: string;   // id, e.g. "engineering"
  jobTitle: string;     // id, e.g. "senior-frontend"
  role: 'viewer' | 'editor' | 'admin';
  active: boolean;
  bio?: string;
}
```

---

## Phase 3 — NgRx Signal Store [x]

```ts
// users.store.ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withEntities<User>(),
  withState({ loading: false, error: null as string | null }),
  withMethods((store, api = inject(UsersApiService)) => ({
    async loadAll() { ... },
    async create(dto: Omit<User, 'id'>) { ... },
    async update(id: string, dto: Partial<User>) { ... },
    async remove(id: string) { ... },
  })),
);
```

`withEntities()` gives: `entities()`, `entityMap()`, `ids()` signals + `setAllEntities`, `addEntity`, `updateEntity`, `removeEntity` updaters.

---

## Phase 4 — HTTP Services [x]

```
src/app/
  users/
    users-api.service.ts          CRUD → /api/users
  shared/
    reference-data.service.ts     GET /api/countries, /departments, /job-titles
```

`ReferenceDataService` returns observables; in components we'll use Angular `resource()` to load them into signals.

---

## Phase 5 — Routing [x]

```ts
// app.routes.ts
{ path: '',          redirectTo: 'users', pathMatch: 'full' },
{ path: 'users',     loadComponent: () => UsersListComponent },
{ path: 'users/new', loadComponent: () => UserFormComponent },
{ path: 'users/:id', loadComponent: () => UserFormComponent },
```

---

## Phase 6 — Users List [x]

`UsersListComponent`:
- Reads `UsersStore.entities()` signal
- Table: username, full name, department, role, active badge
- Toolbar: **Add User** button
- Row actions: **Edit** (navigate to `/users/:id`) | **Delete** (store.remove)
- Loading skeleton when `store.loading()`

---

## Phase 7 — Extended User Form [x]

`UserFormComponent` handles both create and edit:
- If route has `:id` → load user from store, patch `model` signal
- On success → navigate back to `/users`

### New field components

| Component | New concept |
|---|---|
| `EmailFieldComponent` | `validateHttp` → `GET /api/users?email=x` uniqueness |
| `UsernameFieldComponent` | `validateHttp` → `GET /api/users?username=x` uniqueness |
| `CountryFieldComponent` | `resource()` loads countries, `<select>` |
| `DepartmentFieldComponent` | `resource()` loads departments, `<select>` |
| `JobTitleFieldComponent` | `resource()` loads job-titles, `<select>` |

`resource()` in the field component itself keeps loading state co-located:
```ts
protected countries = resource({
  loader: () => inject(ReferenceDataService).getCountries(),
});
// template: @if (countries.isLoading()) { spinner } @else { <select> }
```

### `validateHttp` for async uniqueness
```ts
validateHttp(s.email, {
  request: (ctx) => ctx.value
    ? `/api/users?email=${ctx.value()}`
    : undefined,
  onSuccess: (users, ctx) =>
    users.length && users[0].id !== currentId
      ? [{ kind: 'emailTaken' }]
      : null,
  onError: () => null,
});
```

---

## Component file locations (unchanged for now)

```
src/app/
  first-name-field/
  last-name-field/
  name-group/
  field-errors/
  submit-button/
  user-form/          ← extended
  users-list/         ← new
  users-api.service.ts
  users.store.ts
  reference-data.service.ts
```

FSD structure to be applied separately.

---

---

## Phase 8 — ADR (Architecture Decision Records)

Document every non-obvious decision made in this project so the team understands *why*, not just *what*.

```
docs/adr/
  0001-signal-forms-over-reactive-forms.md
  0002-ngrx-signal-store-over-classic-ngrx.md
  0003-field-per-component-pattern.md
  0004-field-errors-component.md
  0005-form-submitted-via-native-submit.md
  0006-json-server-fake-backend.md
```

Each ADR follows the standard format:
- **Status** — Accepted / Superseded / Deprecated
- **Context** — what problem we were solving
- **Decision** — what we chose
- **Consequences** — trade-offs, what becomes easier/harder
- **Alternatives considered** — what we rejected and why

The ADRs around forms (0001–0005) are the most important: they document the exact thought process we went through in this playground so team members can read the journey, not just the outcome.

---

## Phase 9 — Team Skills

Write skill files that codify the patterns established in this playground, suitable for dropping into the main project as Claude Code skills.

```
docs/skills/
  signal-forms.md          How to build forms: model → form() → field components
  field-component.md       Template for a field component (MESSAGES const, FieldErrors)
  ngrx-signal-store.md     How to structure a SignalStore for a feature
  async-validation.md      validateHttp pattern for uniqueness checks
  reference-data.md        resource() pattern for backend-driven dropdowns
```

**Goal:** A developer new to the stack should be able to read one skill file and write correct, idiomatic code without diving into the Angular docs. These files will be reviewed and moved to `.claude/skills/` in the main project if the patterns hold up.

---

## Phase 10 — FSD Migration [x]

Migrated project to Feature-Sliced Design (see `docs/adr/0002-fsd-architecture.md`).

```
src/app/
  pages/
    users-list/       UsersListComponent
    user-form/        UserFormComponent
  entities/
    user/
      user.model.ts, users-api.ts, users.store.ts
      ui/fields/      all field components
    reference-data/
      reference-data.service.ts, reference-data.store.ts
  shared/
    ui/
      field-errors/
      submit-button/
```

---

## Implementation order

1. [x] `fake-backend/db.json` + scripts + proxy
2. [x] `User` model + `UsersApiService`
3. [x] `UsersStore` (Signal Store)
4. [x] Routing scaffold
5. [x] `UsersListComponent`
6. [x] `ReferenceDataService` + reference field components (country, department, job-title)
7. [x] Extend `UserFormComponent` (new fields, create/edit mode)
8. [x] Async validations (email + username uniqueness)
9. [x] FSD migration
10. [ ] ADR documents
11. [ ] Team skill files
