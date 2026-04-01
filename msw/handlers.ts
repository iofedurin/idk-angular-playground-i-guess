import { http, HttpResponse, delay } from 'msw';
import { db } from './db';

/** Simulate network latency for realistic demo feel */
const DELAY_MS = 150;

/**
 * MSW handlers replicating fake-backend/server.mjs + json-server behavior.
 * Proxy rewrites /api/* → /* on real backend; MSW intercepts /api/* directly.
 */
export const handlers = [
  // ─── Apps ───
  http.get('/api/apps', async () => {
    await delay(DELAY_MS);
    return HttpResponse.json(db.apps.getAll());
  }),

  // ─── Users (paginated) ───
  http.get('/api/users', async ({ request }) => {
    await delay(DELAY_MS);
    const url = new URL(request.url);
    const params = url.searchParams;

    // json-server: if _page param present → paginated response, otherwise array
    if (params.has('_page')) {
      return HttpResponse.json(db.users.getPage(params));
    }
    return HttpResponse.json(db.users.getAll(params));
  }),

  http.get('/api/users/:id', async ({ params }) => {
    await delay(DELAY_MS);
    const user = db.users.getById(params['id'] as string);
    if (!user) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(user);
  }),

  http.post('/api/users', async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const user = db.users.create(body as any);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.patch('/api/users/:id', async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const user = db.users.update(params['id'] as string, body as any);
    if (!user) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(user);
  }),

  http.delete('/api/users/:id', async ({ params }) => {
    await delay(DELAY_MS);
    db.users.remove(params['id'] as string);
    return new HttpResponse(null, { status: 200 });
  }),

  // ─── Users bulk operations ───
  http.post('/api/users/bulk-delete', async ({ request }) => {
    await delay(DELAY_MS);
    const { ids } = (await request.json()) as { ids: string[] };
    db.users.bulkRemove(ids);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch('/api/users/bulk-update', async ({ request }) => {
    await delay(DELAY_MS);
    const { ids, changes } = (await request.json()) as { ids: string[]; changes: Record<string, unknown> };
    const updated = db.users.bulkUpdate(ids, changes as any);
    return HttpResponse.json(updated);
  }),

  // ─── Departments (global, not app-scoped) ───
  http.get('/api/departments', async () => {
    await delay(DELAY_MS);
    return HttpResponse.json(db.departments.getAll());
  }),

  http.post('/api/departments', async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const dept = db.departments.create(body as any);
    return HttpResponse.json(dept, { status: 201 });
  }),

  http.patch('/api/departments/:id', async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const dept = db.departments.update(params['id'] as string, body as any);
    if (!dept) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(dept);
  }),

  http.delete('/api/departments/:id', async ({ params }) => {
    await delay(DELAY_MS);
    db.departments.remove(params['id'] as string);
    return new HttpResponse(null, { status: 200 });
  }),

  // ─── Reference data (global) ───
  http.get('/api/countries', async () => {
    await delay(DELAY_MS);
    return HttpResponse.json(db.countries.getAll());
  }),

  http.get('/api/job-titles', async () => {
    await delay(DELAY_MS);
    return HttpResponse.json(db['job-titles'].getAll());
  }),

  // ─── Invitations ───
  http.get('/api/invitations', async ({ request }) => {
    await delay(DELAY_MS);
    const url = new URL(request.url);
    return HttpResponse.json(db.invitations.getAll(url.searchParams));
  }),

  http.post('/api/invitations', async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const inv = db.invitations.create(body as any);
    return HttpResponse.json(inv, { status: 201 });
  }),

  // ─── Audit log (paginated) ───
  http.get('/api/audit-log', async ({ request }) => {
    await delay(DELAY_MS);
    const url = new URL(request.url);
    const params = url.searchParams;
    if (params.has('_page')) {
      return HttpResponse.json(db['audit-log'].getPage(params));
    }
    return HttpResponse.json(db['audit-log'].getAll(params));
  }),

  // ─── Board positions ───
  http.get('/api/board-positions', async ({ request }) => {
    await delay(DELAY_MS);
    const url = new URL(request.url);
    return HttpResponse.json(db['board-positions'].getAll(url.searchParams));
  }),

  http.post('/api/board-positions', async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const pos = db['board-positions'].create(body as any);
    return HttpResponse.json(pos, { status: 201 });
  }),

  http.patch('/api/board-positions/bulk', async ({ request }) => {
    await delay(DELAY_MS);
    const { updates } = (await request.json()) as { updates: { id: string; x: number; y: number }[] };
    if (!Array.isArray(updates)) return new HttpResponse(null, { status: 400 });
    const updated = updates
      .map((u) => db['board-positions'].update(u.id, { x: u.x, y: u.y }))
      .filter((p): p is NonNullable<typeof p> => p != null);
    return HttpResponse.json(updated);
  }),

  http.patch('/api/board-positions/:id', async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const pos = db['board-positions'].update(params['id'] as string, body as any);
    if (!pos) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(pos);
  }),

  http.delete('/api/board-positions/:id', async ({ params }) => {
    await delay(DELAY_MS);
    db['board-positions'].remove(params['id'] as string);
    return new HttpResponse(null, { status: 200 });
  }),
];
