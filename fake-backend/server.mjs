import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { App } from '@tinyhttp/app';
import { json } from 'milliparsec';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- json-server internals (same setup as bin.js) ----------
const { NormalizedAdapter } = await import('json-server/lib/adapters/normalized-adapter.js');
const { Observer } = await import('json-server/lib/adapters/observer.js');
const { createApp } = await import('json-server/lib/app.js');

const dbFile = join(__dirname, 'db.json');
if (!existsSync(dbFile)) {
  writeFileSync(dbFile, '{}');
}
if (readFileSync(dbFile, 'utf-8').trim() === '') {
  writeFileSync(dbFile, '{}');
}

const adapter = new JSONFile(dbFile);
const observer = new Observer(new NormalizedAdapter(adapter));
const db = new Low(observer, {});
await db.read();

const jsonServerApp = createApp(db);

// ---------- Wrapper app with custom bulk routes ----------
const app = new App();
app.use(json());

// POST /users/bulk-delete — body: { ids: string[], appId?: string }
app.post('/users/bulk-delete', async (req, res) => {
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids must be an array' });
    return;
  }
  const idSet = new Set(ids);
  db.data['users'] = (db.data['users'] ?? []).filter((u) => !idSet.has(u.id));
  await db.write();
  res.status(204).end();
});

// PATCH /users/bulk-update — body: { ids: string[], changes: Partial<User> }
app.patch('/users/bulk-update', async (req, res) => {
  const { ids, changes } = req.body ?? {};
  if (!Array.isArray(ids) || typeof changes !== 'object' || changes === null) {
    res.status(400).json({ error: 'ids must be an array and changes must be an object' });
    return;
  }
  const idSet = new Set(ids);
  const updated = [];
  db.data['users'] = (db.data['users'] ?? []).map((u) => {
    if (idSet.has(u.id)) {
      const patched = { ...u, ...changes };
      updated.push(patched);
      return patched;
    }
    return u;
  });
  await db.write();
  res.json(updated);
});

// All other requests go to json-server
app.use(jsonServerApp);

const PORT = Number(process.env['PORT'] ?? 3000);
app.listen(PORT, () => {
  console.log(`JSON Server (+ bulk routes) started on PORT :${PORT}`);
  console.log(`  POST /users/bulk-delete`);
  console.log(`  PATCH /users/bulk-update`);
});
