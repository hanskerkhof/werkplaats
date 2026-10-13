const { chromium } = require('playwright'),
  assert = require('node:assert/strict'),
  path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext(),
      errors = [];
    context.setDefaultTimeout(8000);
    for (const tool of [
      'Ping',
      'Offerte',
      'Projectbord',
      'Uren',
      'Contacten',
      'Bronnenkast',
      'Publicatieplanner',
      'Kasboek',
      'Werkbank',
    ]) {
      const p = await context.newPage();
      p.on('pageerror', (e) => errors.push(tool + ': ' + e.message));
      await p.goto(
        'file://' +
          path.resolve(
            __dirname,
            '../app/Apps/' +
              tool +
              '/' +
              (tool === 'Werkbank' ? '▶ Begin hier.html' : 'Start ' + tool + '.html')
          )
      );
      await p.waitForSelector('.workspace-strip');
      await p.waitForSelector('#werkmap', { state: 'attached' });
      assert(await p.locator('#workspace-help').isHidden());
      assert(await p.locator('#file-status').isVisible());
      const saveId = tool === 'Werkbank' ? 'loose-save' : tool === 'Ping' ? 'save' : 'export';
      assert.equal(
        await p.locator('#' + saveId).evaluate((e) => getComputedStyle(e).backgroundColor),
        'rgb(255, 255, 255)'
      );
      assert.equal(
        await p
          .locator('#workspace-help-toggle')
          .evaluate((e) => getComputedStyle(e).borderTopWidth),
        '0px'
      );
      if (tool !== 'Werkbank') {
        await p.evaluate(() => {
          // A fresh workspace is empty, so add one placeholder record to make the tool "dirty".
          const key = ['items', 'entries', 'tasks', 'contacts', 'quotes', 'invoices'].find((k) =>
            Array.isArray(data[k])
          );
          data[key].push({ id: 'compact-test', title: 'test', name: 'test', description: 'test' });
          Werkstatus.update();
        });
        await p.waitForSelector('#file-status[data-save-state="changed"]');
        await p.evaluate(() => Werkstatus.written());
        assert.equal(await p.locator('#file-status[data-save-state="changed"]').count(), 0);
      }
      // The example/own-work switch (#workspace-switch) was removed with example mode.
      assert(await p.locator('#tool-switcher').isVisible());
      if (tool === 'Ping') {
        // #take-hours and #take-quote no longer exist; only the compact placement is checked.
        const editor = await p.locator('.editor').boundingBox();
        assert(!editor || editor.y < 280, 'Ping editor should sit near the top');
        await p.screenshot({
          path: path.join(require('node:os').tmpdir(), 'gk-compact-ping.png'),
          fullPage: true,
        });
      }
      // Help now lives in the header's "Meer" menu and opens the #workspace-help panel.
      await p.locator('details.suite-global-more > summary').click();
      await p.locator('#workspace-help-toggle').click();
      assert(await p.locator('#workspace-help').isVisible());
      await p.locator('#workspace-help-toggle').click();
      assert(await p.locator('#workspace-help').isHidden());
      await p.setViewportSize({ width: 390, height: 844 });
      assert(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        tool + ' mobile overflow'
      );
      console.log('OK compact header, help panel, mobile', tool);
      await p.close();
    }
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
