const { chromium } = require('/tmp/browser/node_modules/playwright');
const AxeBuilder = require('/tmp/browser/node_modules/@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.APP_URL || 'http://web:5173';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  let thread;
  try {
    const created = await page.request.post(`${base}/api/v1/threads`, {
      data: { name: `Responsive verification ${Date.now()}` },
    });
    assert.equal(created.status(), 201);
    thread = await created.json();
    const calculated = await page.request.post(`${base}/api/v1/calculations`, {
      data: {
        threadId: thread.id,
        operation: 'add',
        operands: ['999999999999999999999999.999999999999', '0'],
      },
    });
    assert.equal(calculated.status(), 201);
    await page.goto(base);
    await page.getByRole('button', { name: thread.name, exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Reuse result 999999999999999999999999.999999999999',
        exact: true,
      })
      .click();
    await fs.mkdir('/workspace/tmp/qa', { recursive: true });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const sizes = await page.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
        display: document.querySelector('#calculator-display').scrollWidth,
        displayWidth: document.querySelector('#calculator-display').clientWidth,
      }));
      assert(
        sizes.content <= sizes.width + 1,
        `Horizontal page overflow at ${width}: ${JSON.stringify(sizes)}`,
      );
      assert(
        sizes.display <= sizes.displayWidth + 1,
        `Maximum precision number clipped at ${width}: ${JSON.stringify(sizes)}`,
      );
      const findings = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      if (findings.violations.length)
        console.log(
          JSON.stringify(
            findings.violations.map(({ id, impact, nodes }) => ({
              id,
              impact,
              nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
            })),
            null,
            2,
          ),
        );
      assert.equal(findings.violations.length, 0, `Accessibility violations at ${width}`);
      await page.screenshot({ path: `/workspace/tmp/qa/workspace-${width}.png`, fullPage: true });
      console.log(
        `PASS ${width}px: no page/display overflow, axe WCAG A/AA clean, screenshot captured`,
      );
    }
    await page.getByRole('button', { name: 'Open threads', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    const modal = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.equal(modal.violations.length, 0, 'Mobile drawer accessibility');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page
        .getByRole('button', { name: 'Open threads', exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    console.log('PASS mobile drawer opens, Escape closes, focus restored, axe clean');
  } finally {
    if (thread) await page.request.delete(`${base}/api/v1/threads/${thread.id}`);
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
