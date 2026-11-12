const { chromium } = require('/tmp/browser/node_modules/playwright');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({headless: true});
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({viewport: {width, height: 950}});
      await page.goto('http://web:5173');
      await page.locator('.app-shell').waitFor();
      const desktopVisible = await page.locator('.desktop-sidebar').isVisible();
      if (desktopVisible !== (width >= 768)) throw new Error(`Sidebar visibility at ${width}`);
      if (width < 768) {
        await page.getByRole('button', {name: 'Open threads'}).click();
        await page.getByRole('dialog', {name: 'Calculation threads', exact: true}).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('button', {name: 'Open threads'}).waitFor();
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error(`Horizontal page overflow at ${width}`);
      await fs.mkdir('/workspace/apps/web/test-results', {recursive:true});
      await page.screenshot({path:`/workspace/apps/web/test-results/layout-${width}.png`,fullPage:true});
      console.log(`PASS responsive layout ${width}px and accessible thread drawer`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1});
