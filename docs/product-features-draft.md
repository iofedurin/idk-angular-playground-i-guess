# Product Features — Draft Ideas

Идеи для будущих эпиков. Не приоритизированы, не детализированы до уровня реализации.

---

## B. Отпуска и согласования (Leave Management)

**Суть:** Сотрудники подают заявки на отпуск, менеджер согласовывает/отклоняет. Календарь команды показывает кто когда отсутствует.

**Новые entity:** `LeaveRequest` (userId, type, startDate, endDate, status, approverId, reason, comment), `LeavePolicy` (type, daysPerYear — per-department или global).

**Что интересного:**
- **State machine** — `draft → pending → approved/rejected → cancelled`. Каждый переход — отдельное действие с разными правами. Первый настоящий workflow в проекте
- **Calendar view** — визуализация отпусков команды на timeline. Новый тип UI, совершенно отличный от таблиц и форм
- **Conflict detection** — "в этот период уже 3 из 5 человек отдела в отпуске" → warning при создании заявки. Cross-entity query: LeaveRequest × User × Department
- **Balance tracking** — computed: `policy.daysPerYear - approvedDays(userId, year)`. Обновляется реактивно при approve/reject
- **Approval notifications** — через WebSocket: менеджер получает real-time уведомление о новой заявке (расширение ActivityFeed → actionable notifications)
- **Signal Forms с date range** — валидация: endDate > startDate, не в прошлом, не пересекается с уже approved leaves. Async-валидатор на overlap
- **Фильтры на calendar page** — по department, по period, "только конфликты"

**Модельные взаимодействия:** LeaveRequest → User (заявитель + approver), LeavePolicy → Department, conflict detection = LeaveRequest × LeaveRequest × User × Department.

**Синергия с Org Board:** если `managerId` уже есть — approver автоматически определяется из иерархии подчинения. Не нужно выбирать вручную.

---

## C. Performance Reviews — циклы оценки 360°

**Суть:** HR запускает Review Cycle. Для каждого сотрудника автоматически создаются review-задачи: self-assessment + peer reviews + manager review. Каждый reviewer заполняет оценки по категориям.

**Новые entity:** `ReviewCycle` (name, startDate, endDate, status), `Review` (cycleId, revieweeId, reviewerId, type, status, scores, comments), `ReviewCategory` (name, weight).

**Что интересного:**
- **Orchestration pattern** — запуск цикла генерирует N×M review records. Batch creation с зависимостями (для каждого User: 1 self + peers + 1 manager). Новый паттерн для сторов
- **Multi-step form** — каждый Review имеет несколько категорий (communication, technical, leadership...), по каждой — score 1-5 + comment. Dynamic form fields по количеству категорий
- **Aggregate scoring** — итоговая оценка = weighted average по категориям. `computed()` на уровне entity, пересчитывается при каждом submit
- **Progress tracking** — ReviewCycle dashboard: "15/40 reviews submitted", progress bar per reviewee, overdue reviews highlighted. Cross-entity aggregation
- **Status state machine** — Cycle: `draft → active → completed`. Review: `not_started → in_progress → submitted → acknowledged`. Зависимости: Cycle не может быть completed пока не все Reviews submitted
- **Anonymity** — peer reviews anonymous, manager review visible. UI по-разному показывает данные в зависимости от type
- **Deadline management** — reviews с due date, visual highlighting overdue, "days remaining" countdown

**Модельные взаимодействия:** ReviewCycle → Review (one-to-many), Review → User × User (reviewer + reviewee), ReviewCategory → Review (scoring matrix), completion status propagation Review → ReviewCycle.

**Синергия с Org Board:** manager review автоматически назначается из `managerId`. Peer reviews — коллеги из того же поддерева.

---

## D. Skills Matrix — компетенции и gap analysis

**Суть:** Каталог навыков (иерархический). Каждый сотрудник имеет набор навыков с уровнями. Для каждой должности определены required skills. HR видит gap analysis: кому чего не хватает.

**Новые entity:** `SkillCategory` (id, name, parentId — tree), `Skill` (id, name, categoryId), `UserSkill` (userId, skillId, selfLevel 1-5, managerLevel 1-5), `JobTitleRequirement` (jobTitleId, skillId, requiredLevel).

**Что интересного:**
- **Hierarchical reference data** — SkillCategory — дерево (Frontend → Angular → Signal Forms). Рекурсивный UI для навигации/выбора. Tree select — новый тип UI-компонента
- **Matrix/heatmap visualization** — таблица User × Skill с цветовой кодировкой уровней. Совершенно новый тип представления данных
- **Dual assessment** — self-level vs manager-level. Два независимых score для одного UserSkill. UI показывает расхождения
- **Gap analysis computed view** — для каждого User: `required(jobTitle) - actual(userSkills)` = gaps. Cross-entity computation: JobTitleRequirement × UserSkill × User × JobTitle
- **Team skill search** — "найди всех с Angular ≥ 4 в Department X". Complex filter с multi-entity join
- **Skill endorsement workflow** — manager подтверждает self-assessment или корректирует уровень. WebSocket notification при endorsement
- **Bulk skill assignment** — "добавить Skill X всем в Department Y" — новый тип bulk operation
- **Radar chart** — визуализация профиля навыков сотрудника. Сравнение с требованиями должности

**Модельные взаимодействия:** SkillCategory ↔ SkillCategory (self-ref tree), Skill → SkillCategory, UserSkill → User + Skill, JobTitleRequirement → JobTitle + Skill, gap analysis = UserSkill × JobTitleRequirement × User.

**Синергия с Org Board:** на карточке сотрудника на доске — ключевые скиллы как теги. При клике на скилл — подсветить всех на доске кто им владеет.
