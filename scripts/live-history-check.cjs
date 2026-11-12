const { chromium } = require('/tmp/browser/node_modules/playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://web:5173';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ready(request, message) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await request.get(`${base}/api/v1/health`);
      if (response.ok() && (await response.json()).message === message) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`The latest API source did not become active: ${message}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const paths = [
    '/workspace/apps/api/internal/handlers/api.go',
    '/workspace/apps/api/internal/calculator/calculator.go',
    '/workspace/apps/api/internal/config/config.go',
  ];
  const originals = await Promise.all(paths.map((path) => fs.readFile(path, 'utf8')));
  let thread;
  try {
    await ready(page.request, 'API is ready');
    if (process.env.STRESS_WATCHER === 'true') {
      for (let phase = 0; phase < 3; phase++) {
        for (let edit = 0; edit < 6; edit++) {
          const marker = `API reload regression ${phase}-${edit}`;
          await Promise.all(
            paths.map((path, index) =>
              fs.writeFile(
                path,
                index === 0
                  ? originals[index].replace('API is ready', marker)
                  : `${originals[index]}\n// watcher regression ${phase}-${edit}\n`,
              ),
            ),
          );
          await delay(75);
        }
        await ready(page.request, `API reload regression ${phase}-5`);
        console.log(`PASS rapid nested source burst ${phase + 1}: latest binary is serving`);
      }
      await Promise.all(paths.map((path, index) => fs.writeFile(path, originals[index])));
      await ready(page.request, 'API is ready');
    }
    await page.goto(base);
    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/v1/threads',
    );
    await page.getByRole('button', { name: 'New thread', exact: true }).click();
    const creation = await created;
    assert.equal(creation.status(), 201);
    thread = await creation.json();
    const empty = await page.request.get(`${base}/api/v1/threads/${thread.id}/calculations`);
    assert.equal(empty.status(), 200);
    assert.deepEqual(await empty.json(), []);
    console.log('PASS live newly-created thread history endpoint returns 200 and empty array');
    await page.getByRole('button', { name: 'Clear calculator', exact: true }).click();
    await page.keyboard.type('1+2');
    const calculated = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/v1/calculations',
    );
    await page.keyboard.press('Enter');
    const calculation = await calculated;
    assert.equal(calculation.status(), 201);
    const item = await calculation.json();
    assert.equal(item.result, '3');
    await page.getByRole('button', { name: 'Reuse result 3', exact: true }).waitFor();
    const history = await page.request.get(`${base}/api/v1/threads/${thread.id}/calculations`);
    assert.equal(history.status(), 200);
    assert.equal((await history.json())[0].id, item.id);
    await page.reload();
    await page.getByRole('button', { name: 'Reuse result 3', exact: true }).waitFor();
    assert.equal(
      await page.getByText('The requested endpoint does not exist.', { exact: true }).count(),
      0,
    );
    console.log(
      'PASS real React calculation history renders and survives page reload without endpoint errors',
    );
  } finally {
    await Promise.all(paths.map((path, index) => fs.writeFile(path, originals[index])));
    if (thread) await page.request.delete(`${base}/api/v1/threads/${thread.id}`);
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
