# Angular Playground — Claude Instructions

This is a research/playground Angular application for exploring modern Angular features (Signal Forms, CVA, etc.).

## Angular Skills

@.claude/angular-skills/angular-developer/SKILL.md
@.claude/angular-skills/angular-new-app/SKILL.md

## Project Notes

- Angular v21+ — use Signal Forms by default
- Vibe coding mode: suggest permanent changes when appropriate, ask to add to CLAUDE.md
- When unsure about modern Angular APIs, check https://angular.dev
- **Plan tracking**: when a plan file (e.g. `PLAN.md`) exists, mark completed steps with `[x]` immediately after finishing them — both in phase headers and in the "Implementation order" checklist

## Testing

- **Runner**: Vitest 4.0.8 + jsdom, builder `@angular/build:unit-test`
- **Run**: `bun run test`
- **Pattern**: `*.spec.ts` colocated next to source files
- **HTTP mocking**: `provideHttpClientTesting()` + `HttpTestingController` — do NOT mock stores, test real store + mocked HTTP
- **Router testing**: `RouterTestingHarness` for navigation integration tests
- **Test plan**: `docs/test-plan.md`

## App Switching (Multi-workspace)

- `AppRouteReuseStrategy` forces child component recreation when `:appId` changes — no need for `paramMap` subscriptions in page components, plain `ngOnInit` + snapshot is sufficient
- `appSwitchGuard` resets all entity stores on app switch
- `appIdInterceptor` adds `?appId=` to `/api/users` GET requests, `appId` to POST body
- Reference data (countries, departments, job-titles) is global — not scoped to app

## Updating Skills

To update Angular skills to the latest version from GitHub:

```bash
git submodule update --remote .claude/angular-skills
```
