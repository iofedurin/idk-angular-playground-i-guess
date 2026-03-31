import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 800 });

const logs = [];
page.on('console', msg => {
  const text = `[${msg.type()}] ${msg.text()}`;
  logs.push(text);
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', text);
});

await page.goto('http://localhost:4200/app/acme/org-board');
await page.waitForTimeout(3000);

// Inject debug listeners
await page.evaluate(() => {
  const fflow = document.querySelector('f-flow');
  if (fflow) {
    fflow.addEventListener('fCreateNode', (e) => {
      console.log('fCreateNode fired! data:', JSON.stringify(e.detail || e));
    });
    console.log('Added fCreateNode listener. fflow:', fflow.tagName);
  } else {
    console.log('No f-flow found');
  }
});

// Get sidebar position
const sidebar = await page.evaluate(() => {
  const items = document.querySelectorAll('li.f-external-item, li[fexternalitem]');
  const list = Array.from(items).map((el, i) => {
    const rect = el.getBoundingClientRect();
    return { i, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, id: el.id };
  });
  return list;
});

console.log('External items:', JSON.stringify(sidebar.slice(0, 3)));

// Get canvas position
const canvasPos = await page.evaluate(() => {
  const fflow = document.querySelector('f-flow');
  if (!fflow) return null;
  const rect = fflow.getBoundingClientRect();
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
});
console.log('Canvas (f-flow) rect:', JSON.stringify(canvasPos));

// Perform drag
if (sidebar.length > 0 && canvasPos) {
  const item = sidebar[0];
  const startX = item.rect.x + 10;
  const startY = item.rect.y + 15;
  const endX = canvasPos.x + canvasPos.w / 2;
  const endY = canvasPos.y + canvasPos.h / 2;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Monitor network
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      requests.push({ method: req.method(), url: req.url(), body: req.postData() });
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log(`Response: ${resp.status()} ${resp.url()}`);
    }
  });

  await page.mouse.move(startX, startY);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move in small steps
  for (let i = 1; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(1000);

  console.log('Network requests during drag:', JSON.stringify(requests));

  // Check element at drop position
  const elementsAtDrop = await page.evaluate((pos) => {
    const els = document.elementsFromPoint(pos.x, pos.y);
    return els.slice(0, 5).map(el => ({
      tag: el.tagName,
      id: el.id,
      classes: el.className,
      inFflow: document.querySelector('f-flow')?.contains(el)
    }));
  }, { x: endX, y: endY });
  console.log('Elements at drop position:', JSON.stringify(elementsAtDrop));
}

console.log('\nAll console logs:');
logs.forEach(l => console.log(l));

await browser.close();
