const { chromium } = require('/tmp/browser/node_modules/playwright');
const fs = require('node:fs/promises');
const root = '/workspace';
const webPath = `${root}/apps/web/src/App.tsx`;
const apiPath = `${root}/apps/api/cmd/api/main.go`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitHealth(request, message) {
  for (let n = 0; n < 80; n++) {
    try {
      const response = await request.get('http://api:8080/api/v1/health');
      if (response.ok() && (await response.json()).message === message) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`API did not rebuild to ${message}`);
}

(async () => {
  const web = await fs.readFile(webPath, 'utf8');
  const api = await fs.readFile(apiPath, 'utf8');
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  page.on('console', message => console.log('BROWSER', message.type(), message.text()));
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  page.on('response', async response => {
    if (response.url().includes('/src/App.tsx')) console.log('APP MODULE', response.url(), (await response.text()).includes('Docker HMR verified'));
  });
  page.on('websocket', socket => {
    console.log('WEBSOCKET', socket.url());
    socket.on('socketerror', error => console.log('WEBSOCKET ERROR', error));
    socket.on('framereceived', frame => console.log('WEBSOCKET FRAME', String(frame.payload).slice(0, 300)));
  });
  try {
    await page.goto('http://web:5173');
    await page.getByRole('heading', {name: 'Calculator Workspace', exact: true}).waitFor();
    await page.getByRole('status').filter({hasText: 'API is ready'}).waitFor();
    console.log('PASS React rendered and proxy health reached Go');
    await page.evaluate(() => { window.__hmrToken = 'preserved'; });
    await fs.writeFile(webPath, web.replace('Docker development environment', 'Docker HMR verified'));
    await page.getByText('Docker HMR verified', {exact: true}).waitFor().catch(async error => {
      console.log('DOM AT HMR FAILURE', await page.locator('body').innerText());
      console.log('SOURCE AT HMR FAILURE', await fs.readFile(webPath, 'utf8'));
      throw error;
    });
    if (await page.evaluate(() => window.__hmrToken) !== 'preserved') throw new Error('Frontend performed full reload');
    await fs.writeFile(webPath, web);
    await page.getByText('Docker development environment', {exact: true}).waitFor();
    console.log('PASS frontend host-mounted edit and restoration rendered through HMR without reload');
    await fs.writeFile(apiPath, api.replace('API is ready', 'API hot reload verified'));
    await waitHealth(page.request, 'API hot reload verified');
    await fs.writeFile(apiPath, api);
    await waitHealth(page.request, 'API is ready');
    console.log('PASS backend host-mounted edit and restoration rebuilt automatically');
  } finally {
    await fs.writeFile(webPath, web);
    await fs.writeFile(apiPath, api);
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
