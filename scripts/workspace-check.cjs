const { chromium } = require('/tmp/browser/node_modules/playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://web:5173';
const mode = process.env.CHECK_MODE || 'prepare';
const recordPath = '/workspace/tmp/integration-state.json';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const api = async (path) => {
    const response = await page.request.get(`${base}/api/v1${path}`);
    assert.equal(response.status(), 200, `${path}: ${await response.text()}`);
    return response.json();
  };
  const button = (name) => page.getByRole('button', { name, exact: true });
  const postResponse = (path) =>
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/v1${path}`,
    );
  const select = async (thread) => {
    await button(thread.name).click();
    await page.getByRole('heading', { name: thread.name, exact: true }).waitFor();
  };
  const create = async (name) => {
    const response = postResponse('/threads');
    await button('New thread').click();
    const created = await response;
    assert.equal(created.status(), 201);
    const thread = await created.json();
    await button('Rename thread').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Thread name', { exact: true }).fill(name);
    await dialog.getByRole('button', { name: 'Save name', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name, exact: true }).waitFor();
    return { ...thread, name };
  };
  const calculate = async (operation, a, b, expected) => {
    await button('Clear calculator').click();
    await page.keyboard.type(a);
    const labels = {
      add: 'Add',
      subtract: 'Subtract',
      multiply: 'Multiply',
      divide: 'Divide',
      power: 'Power',
      sqrt: 'Square root',
      percent: 'Percentage',
    };
    let pending;
    if (b !== null) {
      await button(labels[operation]).click();
      await page.keyboard.type(b);
      pending = postResponse('/calculations');
      await button('Calculate').click();
    } else {
      pending = postResponse('/calculations');
      await button(labels[operation]).click();
    }
    const response = await pending;
    assert.equal(response.status(), 201);
    const item = await response.json();
    assert.equal(item.operation, operation);
    assert.equal(item.result, expected);
    assert(item.operands.every((value) => typeof value === 'string'));
    await page.waitForFunction(
      (value) => document.getElementById('calculator-display')?.textContent === value,
      expected,
    );
    await page.locator(`[data-calculation-id="${item.id}"]`).waitFor();
    return item;
  };
  try {
    await page.goto(base);
    if (mode === 'prepare') {
      const suffix = Date.now().toString(36);
      const first = await create(`Verification A ${suffix}`);
      const cases = [
        ['add', '25', '15', '40'],
        ['subtract', '10', '3', '7'],
        ['multiply', '2.5', '4', '10'],
        ['divide', '1', '3', '0.333333333333'],
        ['power', '2', '3', '8'],
        ['sqrt', '16', null, '4'],
        ['percent', '25', null, '0.25'],
      ];
      for (const values of cases) {
        await calculate(...values);
        console.log(`PASS browser ${values[0]} through unified API`);
      }
      await button('Reuse result 40').click();
      await button('Divide').click();
      await page.keyboard.type('2');
      const reused = postResponse('/calculations');
      await page.keyboard.press('Enter');
      const reuseResponse = await reused;
      assert.equal((await reuseResponse.json()).result, '20');
      const second = await create(`Verification B ${suffix}`);
      assert.deepEqual(await api(`/threads/${second.id}/calculations`), []);
      await calculate('add', '2', '2', '4');
      await select(first);
      const firstHistory = await api(`/threads/${first.id}/calculations`);
      const secondHistory = await api(`/threads/${second.id}/calculations`);
      assert.equal(firstHistory.length, 8);
      assert.equal(secondHistory.length, 1);
      assert.equal(
        await page.getByRole('list', { name: 'Calculation history' }).locator('li').count(),
        8,
      );
      await fs.mkdir('/workspace/tmp', { recursive: true });
      await fs.writeFile(
        recordPath,
        JSON.stringify({ first, second, firstHistory, secondHistory }, null, 2),
      );
      console.log(
        'PASS thread create/rename/switch/isolation, chronological history, result reuse and keyboard Enter; fixture saved for container recreation',
      );
    } else {
      const saved = JSON.parse(await fs.readFile(recordPath, 'utf8'));
      for (const [thread, history] of [
        [saved.first, saved.firstHistory],
        [saved.second, saved.secondHistory],
      ]) {
        assert.equal((await api(`/threads/${thread.id}`)).name, thread.name);
        assert.deepEqual(await api(`/threads/${thread.id}/calculations`), history);
      }
      await select(saved.first);
      await page.locator(`[data-calculation-id="${saved.firstHistory[0].id}"]`).waitFor();
      console.log(
        'PASS names and exact ordered histories persisted across application-container recreation',
      );
      await select(saved.second);
      await button('Delete thread').click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Delete thread', exact: true })
        .click();
      await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
      const missing = await page.request.get(
        `${base}/api/v1/threads/${saved.second.id}/calculations`,
      );
      assert.equal(missing.status(), 404);
      assert.equal((await api(`/threads/${saved.first.id}/calculations`)).length, 8);
      await page.request.delete(`${base}/api/v1/threads/${saved.first.id}`);
      console.log(
        'PASS confirmed UI deletion cascades history and leaves other threads intact; only verification fixtures removed',
      );
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
