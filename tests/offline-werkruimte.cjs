const { press } = require('./helpers.cjs');
const { chromium } = require('playwright'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.GK_BROWSER ? { executablePath: process.env.GK_BROWSER } : {}),
  });
  try {
    const ctx = await browser.newContext(),
      page = await ctx.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    const url = pathToFileURL(
      path.resolve(__dirname, '../app/Apps/Contacten/Start Contacten.html')
    );
    url.searchParams.set('werkruimte', 'eigen');
    await page.goto(url.href);
    await page.waitForSelector('#tool-switcher');
    await page.evaluate(() => BewaarAlles.ready);
    await press(page, '#new');
    await page.fill('#firstName', 'Offline contact');
    await page.fill('#organization', 'Offline bedrijf');
    await page.locator('#form button.primary').click();
    await page.waitForFunction(() => !document.getElementById('dialog').open);
    // The browser copy is written with a short delay; leave the page only after that.
    await page.waitForTimeout(1000);
    // Factureren is no longer in the default tool switcher (it is added via Mijn gereedschappen),
    // so open it by its file URL like the tool links do.
    const ping = pathToFileURL(path.resolve(__dirname, '../app/Apps/Ping/Start Ping.html'));
    ping.searchParams.set('werkruimte', 'eigen');
    await page.goto(ping.href);
    await page.waitForSelector('#tool-switcher');
    await page.evaluate(() => BewaarAlles.ready);
    await press(page, '#new');
    await page.click('#choose-contact');
    // The picker now lists contacts as buttons instead of a <select>.
    await page.locator('#contact-list .picker-item').first().click();
    await page.click('#contact-apply');
    assert.equal(
      await page.locator('[data-scope="invoice"][data-key="customer"]').inputValue(),
      'Offline bedrijf'
    );
    assert.deepEqual(errors, []);
    console.log(
      'OK offline file opening, contact entry, internal navigation and contact reuse without server'
    );
    await ctx.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
