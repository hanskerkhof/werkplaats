// Opens the development version of the app (app/Begin hier.html) in the browser.
// Folder access needs Chrome or Edge, so those are tried first; otherwise the default browser is used.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(path.resolve(__dirname, '../app/Begin hier.html')).href;
const attempts = {
  darwin: [
    ['open', ['-a', 'Google Chrome', url]],
    ['open', ['-a', 'Microsoft Edge', url]],
    ['open', [url]],
  ],
  win32: [
    ['cmd', ['/c', 'start', '', 'chrome', url]],
    ['cmd', ['/c', 'start', '', url]],
  ],
  linux: [
    ['google-chrome', [url]],
    ['chromium', [url]],
    ['xdg-open', [url]],
  ],
}[process.platform] || [['xdg-open', [url]]];

for (const [command, args] of attempts) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  if (result.status === 0) {
    console.log('Opened ' + url);
    process.exit(0);
  }
}
console.error('Could not open a browser. Open this file yourself:\n' + url);
process.exit(1);
