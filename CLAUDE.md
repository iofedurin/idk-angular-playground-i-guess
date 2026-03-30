# Angular Playground — Claude Instructions

This is a research/playground Angular application for exploring modern Angular features (Signal Forms, CVA, etc.).

## Angular Skills

@.claude/angular-skills/angular-developer/SKILL.md
@.claude/angular-skills/angular-new-app/SKILL.md

## Architecture Decision Records

Before making architectural decisions, consult the ADRs:

@docs/adr/0001-reference-data-loading-pattern.md
@docs/adr/0002-fsd-architecture.md
@docs/adr/0003-zoneless-testing.md
@docs/adr/0004-entity-options-components.md
@docs/adr/0005-signal-forms-schema-decomposition.md

Follow the established patterns. When making a new non-obvious decision, create a new ADR in `docs/adr/`.

**ADR authoring**: ADRs require careful architectural reasoning. Before creating or updating an ADR, ask the user to switch to Opus. Sonnet should flag the need for an ADR (e.g., in a plan file) but not write it directly.

## Project Notes

- Angular v21+ — use Signal Forms by default
- Vibe coding mode: suggest permanent changes when appropriate, ask to add to CLAUDE.md
- When unsure about modern Angular APIs, check https://angular.dev
- **Plan tracking**: when a plan file exists in `docs/`, mark completed steps with `[x]` immediately after finishing them — both in phase headers and in the "Implementation order" checklist
- **Plan file lifecycle**: plan files are named `docs/PLAN-<feature>.md` and are temporary. When all items are `[x]`, review the file — if it documents a non-obvious architectural decision, extract an ADR to `docs/adr/`; if it captures a reusable Angular pattern, consider updating the skills. Then **delete the plan file**. (`docs/epics.md` is the permanent project roadmap, not a temporary plan.)

## Testing

- **Runner**: Vitest 4.0.8 + jsdom, builder `@angular/build:unit-test`
- **Run**: `bun run test`
- **HTTP mocking**: `provideHttpClientTesting()` + `HttpTestingController` — do NOT mock stores, test real store + mocked HTTP
- **Router testing**: `RouterTestingHarness` for navigation integration tests
- **Zoneless**: no zone.js — do NOT use `fakeAsync`/`tick()`. Store tests: `await store.method()`. Component tests: `const flush = () => new Promise<void>(r => setTimeout(r))` after `httpMock.flush()`

### Test file naming — unit vs UI

Always use **separate files** for unit tests and UI/component tests:

| Type | File | When |
|---|---|---|
| Unit | `*.unit.spec.ts` | Pure functions, no TestBed (e.g. `applyFilters`, `SelectionStore`) |
| Store / Integration | `*.spec.ts` | Store methods with `HttpTestingController` + `TestBed` |
| UI / Component | `*.spec.ts` | Component rendering, colocated next to the component |

Rule: if a slice has both a pure function and a component, they get separate spec files. Never mix `TestBed`-based tests with pure function tests in one file.

## App Switching (Multi-workspace)

- `AppRouteReuseStrategy` forces child component recreation when `:appId` changes — no need for `paramMap` subscriptions in page components, plain `ngOnInit` + snapshot is sufficient
- `appSwitchGuard` resets all entity stores on app switch
- `appIdInterceptor` adds `?appId=` to `/api/users` GET requests, `appId` to POST body
- Reference data (countries, departments, job-titles) is global — not scoped to app

## User Todo File

`docs/user-todo.md` is where the user writes down thoughts and requests while Claude is busy with something else.

- **Read it at the start of every session** before starting work
- **Treat each item as a task** — implement it, then **delete the item** from the file immediately after completing it
- The file always contains two permanent headers — `TODO для Sonnet:` and `TODO для Opus:` — **never delete them**, only the items beneath them
- Items may be rough notes; use judgment to interpret intent

## Updating Skills

To update Angular skills to the latest version from GitHub:

```bash
git submodule update --remote .claude/angular-skills
```
