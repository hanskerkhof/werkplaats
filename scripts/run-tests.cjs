// Runs every tests/*.cjs file (or only those whose name contains the given argument)
// and prints a pass/fail summary. Exit code is 1 if any test failed.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '../tests');
const filter = process.argv[2] || '';
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('.cjs') && name.includes(filter))
  .sort();

if (!files.length) {
  console.error(`No tests match "${filter}".`);
  process.exit(1);
}

const failed = [];
for (const name of files) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [path.join(dir, name)], {
    encoding: 'utf8',
    timeout: 120000,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = run.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${seconds}s)`);
  if (!ok) {
    failed.push(name);
    const output = (run.stderr || run.stdout || String(run.error || '')).trim().split('\n');
    console.log(output.slice(0, 6).map((line) => `      ${line.slice(0, 160)}`).join('\n'));
  }
}

console.log(`\n${files.length - failed.length}/${files.length} passed`);
process.exit(failed.length ? 1 : 0);
