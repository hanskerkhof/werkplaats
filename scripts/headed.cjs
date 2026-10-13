// Preloaded with `node --require` when HEADED=1: makes every test open a visible browser window.
// SLOWMO=<ms> (default 200) slows each Playwright action so you can follow along.
const { chromium } = require('playwright');

const launch = chromium.launch.bind(chromium);
chromium.launch = (options = {}) =>
  launch({ ...options, headless: false, slowMo: Number(process.env.SLOWMO || 200) });
