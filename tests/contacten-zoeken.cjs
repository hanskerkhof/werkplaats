const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
// Minimal Dutch-only stand-in for the translation layer (app/taal.js).
const I18n = {
  ui: (_key, text) => text,
  value: (text) => text,
  t: (text) => text,
  assign: (element, text, property) => (element[property] = text),
  attribute: (element, name, text) => element.setAttribute(name, text),
};
const source = fs.readFileSync(path.join(__dirname, '../app/contacten-zoeken.js'), 'utf8');
const book = {
  format: 'contacten',
  version: 1,
  contacts: [
    { id: '1', name: 'Renée Blom', organization: 'Studio Noord', email: 'renee@example.com' },
    { id: '2', name: 'Sam Jansen', organization: 'Buurtwerkplaats', email: 'sam@example.com' },
  ],
};
function setup({ active = false, example = false, data = book, saved = null, error = null } = {}) {
  let toolReads = 0;
  const c = {
    window: {},
    I18n,
    structuredClone,
    GereedschapskistMode: { example },
    // Contacts now come from the shared workspace session (BewaarAlles), not from a raw file or storage key.
    BewaarAlles: {
      readTool: async () => {
        toolReads++;
        if (error) throw Error(error);
        return { data };
      },
      readRound: async () => (saved ? { values: [{ data: saved }] } : null),
    },
    Werkmap: { ready: Promise.resolve(), active, allAccess: async () => ({ root: {} }) },
    GereedschapskistExamples: () => book,
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  return { api: c.window.ContactenZoeken, reads: () => toolReads };
}
(async () => {
  let s = setup();
  const result = await s.api.read();
  assert.equal(result.book.contacts.length, 2);
  assert.match(result.source, /Contact houden/);
  assert.equal(s.api.search(book.contacts, 'noord renee')[0].id, '1');
  assert.equal(s.api.search(book.contacts, 'SAM@EXAMPLE')[0].id, '2');
  assert.equal(s.api.search(book.contacts, '  ').length, 2);
  assert.equal(s.api.search(book.contacts, 'niets').length, 0);
  // A missing address is filled in from the last saved copy in the work folder.
  const withAddress = {
    ...book,
    contacts: book.contacts.map((c) => ({ ...c, address: 'Hoofdstraat 1' })),
  };
  s = setup({ active: true, saved: withAddress });
  const filled = await s.api.read();
  assert.match(filled.source, /adres uit laatste bewaarkopie/);
  assert.equal(filled.book.contacts[0].address, 'Hoofdstraat 1');
  s = setup({ active: true, error: 'Geen toegang' });
  await assert.rejects(s.api.read(), /Geen toegang/);
  s = setup({ example: true });
  assert.match((await s.api.read()).source, /Voorbeeld/);
  assert.equal(s.reads(), 0);
  s = setup();
  assert.throws(
    () => s.api.validate({ ...book, _gereedschapskistExample: true }),
    /voorbeeldbestand/
  );
  assert.throws(
    () => s.api.validate({ ...book, contacts: [book.contacts[0], book.contacts[0]] }),
    /dubbele/
  );
  assert.throws(
    () => s.api.validate({ ...book, contacts: [{ ...book.contacts[0], name: null }] }),
    /Onvolledige/
  );
  const file = {
    name: 'gereedschapskist-contact-houden.json',
    size: 500,
    text: async () => JSON.stringify(book),
  };
  await assert.rejects(s.api.fromFile({ ...file, size: 20000001 }), /20 MB/);
  await assert.rejects(s.api.fromFile({ ...file, text: async () => '{broken' }));
  for (const tool of ['Offerte', 'Kasboek']) {
    const html = fs.readFileSync(
      path.join(__dirname, `../app/Apps/${tool}/Start ${tool}.html`),
      'utf8'
    );
    for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))
      if (script[1].trim()) new vm.Script(script[1]);
    // Offerte's picker was reworded to "Zoek contact"; Kasboek still says "Zoek in Contacten".
    assert.match(html, tool === 'Offerte' ? /Zoek contact/ : /Zoek in Contacten/);
    assert.match(html, /contacten-zoeken.js/);
  }
  console.log(
    'OK: naam/organisatie/email, accenten en meerdere zoekwoorden; werkmap heeft voorrang; ontbrekende bron/toegang; voorbeeldscheiding; ongeldige bestanden; scripts beide tools.'
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

(async () => {
  const nodes = new Map();
  class Element {
    constructor() {
      this.value = '';
      this.textContent = '';
      this.open = false;
      this.options = [];
      this.listeners = {};
    }
    setAttribute() {}
    focus() {}
    dispatchEvent() {}
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      this.listeners.close?.();
    }
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    }
    replaceChildren(...items) {
      this.options = items;
      this.value = items[0]?.value || '';
    }
  }
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  let dialog;
  const doc = {
    getElementById: get,
    createElement: () => (dialog = new Element()),
    body: { append() {} },
  };
  const c = {
    document: doc,
    window: {},
    I18n,
    Option: function (text, value) {
      this.text = text;
      this.value = value;
    },
    Event: function () {},
    Werkstatus: { update() {} },
    ContactenZoeken: {
      read: async () => ({ book, source: 'testcontacten' }),
      search: setup().api.search,
    },
  };
  get('dialog').open = true;
  get('party').value = 'Handmatige invoer';
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../app/koppelingen/kasboek-contacten.js'), 'utf8'),
    c
  );
  await get('party-contact').onclick();
  assert.equal(dialog.open, true);
  assert.equal(get('party').value, 'Handmatige invoer');
  get('party-contact-query').value = 'renee';
  get('party-contact-query').oninput();
  assert.equal(get('party-contact-list').options.length, 1);
  get('party-contact-list').value = '1';
  get('party-contact-list').onchange();
  assert.equal(get('party-contact-apply').disabled, false);
  get('party-contact-apply').onclick();
  assert.equal(get('party').value, 'Studio Noord');
  assert.equal(dialog.open, false);
  await get('party-contact').onclick();
  get('party-contact-close').onclick();
  assert.equal(get('party').value, 'Studio Noord');
  console.log(
    'OK: boeking blijft ongewijzigd tijdens zoeken; selectie vult partij; annuleren behoudt bestaande invoer.'
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
