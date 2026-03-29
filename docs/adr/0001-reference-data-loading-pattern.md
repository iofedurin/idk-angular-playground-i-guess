# ADR 0001 — Reference data loading: Signal Store + HttpClient over httpResource

**Status:** Accepted
**Date:** 2026-03-29

---

## Контекст

В проекте есть статические справочные данные (страны, отделы, должности), которые нужны в выпадающих полях формы. Данные не меняются в runtime, загружаются один раз при первом использовании.

Первоначально был реализован единый `ReferenceDataService` через `httpResource`:

```ts
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  readonly countries = httpResource<Country[]>(() => '/api/countries');
}
```

Впоследствии сервис был разбит на отдельные FSD-entity (`country`, `department`, `job-title`),
каждая со своим API-классом и стором.

## Решение

Использовать пару **`<Entity>Api` (HttpClient) + `<Entity>Store` (NgRx Signal Store)** — тот же паттерн, что используется для `UsersApi` + `UsersStore`.

```ts
// entities/country/country.api.ts — только HTTP
@Injectable({ providedIn: 'root' })
export class CountryApi {
  getAll() {
    return this.http.get<Country[]>('/api/countries');
  }
}

// entities/country/country.store.ts — состояние + кэш
const CountryStore = signalStore(
  { providedIn: 'root' },
  withState({ countries: [] as Country[] }),
  withMethods((store) => ({
    async load() {
      if (store.countries().length) return; // уже загружено
      const data = await lastValueFrom(inject(CountryApi).getAll());
      patchState(store, { countries: data });
    },
  })),
);
```

Каждый select-компонент (`CountrySelectComponent`, `DepartmentSelectComponent` и т.д.)
инжектит свой стор и вызывает `load()` в конструкторе — данные загружаются при первом рендере.

## Причины

**1. Единообразие с `UsersStore`**
В проекте принят паттерн: HTTP-сервис возвращает Observable, стор переводит в сигналы и управляет состоянием. `httpResource` нарушает это единообразие.

**2. `httpResource` — экспериментальный API**
Помечен `@experimental`. Нет гарантий стабильности между минорными версиями Angular.

**3. Доступ к `HttpContext`**
`HttpClient.get()` позволяет передать `HttpContext` для интерцепторов (авторизация, кэш).
С `httpResource` это требует объекта `HttpResourceRequest` — менее очевидно.

**4. Явный кэш**
`if (store.countries().length) return` — очевидное условие, которое легко найти, изменить и покрыть тестом.

**5. Независимость по entity**
Каждая справочная entity загружается только когда её select-компонент реально отрендерен.
При добавлении новой entity (`Position`, `Office`) — добавляется отдельный стор, без изменения существующих.

## Последствия

- Больше файлов (api + store на каждую entity), но паттерн однообразен и предсказуем
- Select-компоненты сами управляют загрузкой через `store.load()` в конструкторе
- `providedIn: 'root'` + проверка кэша гарантируют один HTTP-запрос за жизнь приложения
- При появлении `reload()` (например, после создания нового отдела) — достаточно добавить метод в стор конкретной entity

## Альтернативы, которые рассматривались

| Вариант | Почему отклонён |
|---|---|
| `httpResource` в сервисе | Экспериментальный, нарушает единообразие, меньше контроля над `HttpContext` |
| `resource()` + `firstValueFrom` | Промежуточный вариант — другой паттерн, тот же недостаток с единообразием |
| Единый `ReferenceDataStore` для всех справочников | Нарушает FSD: одна entity знает обо всех остальных; сложнее расширять |
| Загрузка в каждом field-компоненте через прямой HTTP | Множественные запросы, нет кэша, сложнее отслеживать состояние |
