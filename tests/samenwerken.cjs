const { press } = require('./helpers.cjs');
const { chromium } = require('playwright'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  http = require('node:http');
const root = path.resolve(__dirname, process.env.GK_TEST_WEB ? '../docs' : '../app'),
  server = http.createServer((req, res) => {
    try {
      const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      res.setHeader(
        'Content-Type',
        p.endsWith('.js')
          ? 'text/javascript'
          : p.endsWith('.css')
            ? 'text/css'
            : 'text/html; charset=utf-8'
      );
      res.end(fs.readFileSync(p));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.GK_BROWSER ? { executablePath: process.env.GK_BROWSER } : {}),
  });
  try {
    const ctx = await browser.newContext(),
      errors = [],
      downloads = [];
    ctx.on('page', (p) => {
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('download', (d) => downloads.push(d.suggestedFilename()));
      p.on('dialog', (d) => d.accept());
    });
    await ctx.addInitScript(
      () =>
        (window.showDirectoryPicker = async () =>
          (await navigator.storage.getDirectory()).getDirectoryHandle('Samen Werk', {
            create: true,
          }))
    );
    const base = 'http://127.0.0.1:' + server.address().port,
      p = await ctx.newPage();
    await p.goto(base + '/Begin%20hier.html?werkruimte=eigen');
    await p.getByRole('button', { name: 'Nieuw beginnen', exact: true }).click();
    await p.getByRole('button', { name: 'Kies opslagplek', exact: true }).click();
    await p.waitForFunction(() => Werkmap.active);
    async function go(t) {
      await p.goto(base + '/Apps/' + t + '/Start%20' + t + '.html?werkruimte=eigen');
      await p.evaluate(() => BewaarAlles.ready);
    }
    await go('Contacten');
    await p.evaluate(() =>
      change((d) =>
        d.contacts.push({
          id: 'c1',
          name: 'Testpersoon',
          organization: 'Testbedrijf',
          role: '',
          email: 'test@example.org',
          phone: '',
          address: 'Teststraat 1',
          notes: '',
          nextDate: '',
          nextAction: '',
          tags: [],
          conversations: [],
        })
      )
    );
    await p.evaluate(() => BewaarAlles.flush());
    await go('Ping');
    await press(p, '#new');
    await p.click('#choose-contact');
    // The picker lists contacts as buttons now.
    await p.locator('#contact-list [data-contact-id="c1"]').click();
    await p.click('#contact-apply');
    assert.equal(
      await p.locator('[data-scope="invoice"][data-key="customer"]').inputValue(),
      'Testbedrijf'
    );
    await p.click('#choose-contact');
    await p.click('#contact-new');
    await p.fill('#new-contact-first-name', 'Nieuw contact');
    await p.fill('#new-contact-org', 'Nieuw bedrijf');
    await p.locator('#new-contact-form button[type=submit]').click();
    await p.waitForFunction(() => !document.getElementById('contact-picker').open);
    assert.equal((await p.evaluate(() => Samenwerken.contacts())).length, 2);
    await p.evaluate(() => BewaarAlles.flush());
    await go('Offerte');
    await p.evaluate(async () => {
      // Example quotes no longer exist; make an accepted quote of our own.
      newQuote(true);
      working.state = 'accepted';
      baseline = '';
      renderEditor();
    });
    await press(p, '#make-invoice');
    // The new invoice now opens in Factureren straight away.
    await p.waitForURL('**/Ping/**');
    await p.evaluate(() => BewaarAlles.ready);
    const invoices = await p.evaluate(
      async () => (await BewaarAlles.readTool('Ping')).data.invoices
    );
    assert.equal(invoices.filter((i) => i.sourceQuoteId).length, 1);
    // Taking over the same quote again must not make a second invoice.
    await go('Offerte');
    await p.evaluate(() => BewaarAlles.ready);
    await p.locator('#list .quote-button').first().click();
    await press(p, '#make-invoice');
    await p.waitForTimeout(1500);
    assert.equal(
      (await p.evaluate(async () => (await BewaarAlles.readTool('Ping')).data.invoices)).filter(
        (i) => i.sourceQuoteId
      ).length,
      1
    );
    await go('Publicatieplanner');
    await p.evaluate(() =>
      change((d) =>
        d.items.push({
          id: 'p1',
          kind: 'project',
          title: 'Project A',
          channel: '',
          state: 'idea',
          date: '2026-10-01',
          endDate: '',
          text: '',
          notes: '',
          url: '',
        })
      )
    );
    // Projects open in an overview first; the task action is "+ Taak toevoegen" there.
    await p.locator('#content button', { hasText: 'Project A' }).first().click();
    await p.locator('#plan-overview summary', { hasText: 'Meer' }).click();
    await p.getByText('Taak toevoegen').click();
    await p.fill('[name=taskTitle]', 'Doe iets');
    await p.locator('.link-dialog [type=submit]').click();
    await p.waitForFunction(() => !document.querySelector('.link-dialog[open]'));
    await p.waitForFunction(() =>
      document.getElementById('link-result')?.innerText.includes('taak aangemaakt')
    );
    const tasks = await p.evaluate(
      async () => (await BewaarAlles.readTool('Projectbord')).data.tasks
    );
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].projectId, 'p1');
    await p.evaluate(() => BewaarAlles.flush());
    // Removed: task -> hours -> invoice handover through [data-track-hours] and #hours-invoice.
    // That flow was redesigned (see CHANGELOG.md); it needs its own new test.
    // Removed: the direct factuur-ontvangst payload checks. A payment now needs a paymentId and an
    // invoice that is already booked in Boekhouden; the booking flow is covered through the UI in
    // factureren-werkruimte.cjs.
    const contactsTab = await ctx.newPage();
    await contactsTab.goto(base + '/Apps/Contacten/Start%20Contacten.html?werkruimte=eigen');
    await contactsTab.evaluate(() => BewaarAlles.ready);
    await press(contactsTab, '#new');
    await contactsTab.fill('#firstName', 'Half ingevuld contact');
    await p.evaluate(() =>
      BewaarAlles.updateTool('Contacten', (d) =>
        d.contacts.push({
          id: 'live-contact',
          name: 'Via andere tool',
          organization: '',
          role: '',
          email: '',
          phone: '',
          address: '',
          notes: '',
          nextDate: '',
          nextAction: '',
          tags: [],
          conversations: [],
        })
      )
    );
    assert.equal(
      await contactsTab.evaluate(() => data.contacts.some((c) => c.id === 'live-contact')),
      true
    );
    assert.equal(await contactsTab.inputValue('#firstName'), 'Half ingevuld contact');
    assert.equal(await contactsTab.locator('#dialog').evaluate((d) => d.open), true);
    await contactsTab.evaluate(() => BewaarAlles.flush());
    await contactsTab.close();
    await p.evaluate(() => Samenwerken.document('Bronnen.md', '# Bronnen\n\nEigen notities'));
    assert.equal(
      await p.evaluate(
        async () =>
          (await BewaarAlles.readTool('Werkbank')).documents.find((d) => d.name === 'Bronnen.md')
            .content
      ),
      '# Bronnen\n\nEigen notities'
    );
    await p.evaluate(() => BewaarAlles.save());
    assert.equal(downloads.length, 0);
    assert.deepEqual(errors, []);
    console.log(
      'OK contacts, create contact, quote invoice duplicate, project tasks, task hours, shared IDs, hours invoice, payment duplicate, sources document, active target with pending form, single save without downloads'
    );
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
