import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { App } from '@tinyhttp/app';
import { json } from 'milliparsec';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { WebSocketServer } from 'ws';

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

// ---------- WebSocket broadcast (hoisted, wss assigned after listen) ----------
let wss;

function broadcast(event) {
  if (!wss) return;
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

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
  broadcast({
    channel: 'user.bulk-deleted',
    payload: { resource: 'users', action: 'bulk-deleted', summary: `${ids.length} users deleted`, timestamp: Date.now() },
  });
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
  broadcast({
    channel: 'user.bulk-updated',
    payload: { resource: 'users', action: 'bulk-updated', summary: `${ids.length} users updated`, timestamp: Date.now() },
  });
  res.json(updated);
});

// Broadcast intercept middleware for json-server mutations
app.use((req, res, next) => {
  if (req.method === 'GET') return next();

  const parts = req.url.split('/').filter(Boolean);
  const resource = parts[0];
  if (!resource) return next();

  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const actionMap = { POST: 'created', PUT: 'updated', PATCH: 'updated', DELETE: 'deleted' };
      const action = actionMap[req.method] ?? 'changed';
      const singular = resource.replace(/s$/, '');
      broadcast({
        channel: `${singular}.${action}`,
        payload: { resource, action, summary: `${singular} ${action}`, timestamp: Date.now() },
      });
    }
    return originalEnd(...args);
  };
  next();
});

// All other requests go to json-server
app.use(jsonServerApp);

const PORT = Number(process.env['PORT'] ?? 3000);
const server = app.listen(PORT, () => {
  console.log(`JSON Server (+ bulk routes + WebSocket) started on PORT :${PORT}`);
  console.log(`  POST /users/bulk-delete`);
  console.log(`  PATCH /users/bulk-update`);
  console.log(`  WS   ws://localhost:${PORT}`);
});

// ---------- WebSocket server ----------
wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Heartbeat: ping every 30s, kill zombie connections
const heartbeatInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (!client.isAlive) { client.terminate(); continue; }
    client.isAlive = false;
    client.ping();
  }
}, 30_000);

wss.on('close', () => clearInterval(heartbeatInterval));
