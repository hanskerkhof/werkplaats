// Runs every tests/*.cjs file (or only those whose name contains the given argument)
// and prints a pass/fail summary. Exit code is 1 if any test failed.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// HEADED=1 opens a visible browser (see scripts/headed.cjs); SLOWMO=<ms> sets the delay per action.
const headed = process.env.HEADED === '1';
const dir = path.resolve(__dirname, '../tests');
const filter = process.argv[2] || '';
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('.cjs') && name !== 'helpers.cjs' && name.includes(filter))
  .sort();

if (!files.length) {
  console.error(`No tests match "${filter}".`);
  process.exit(1);
}

// tests/skipped.json maps a test file name to the reason it is skipped.
const skipped = JSON.parse(fs.readFileSync(path.join(dir, 'skipped.json'), 'utf8'));
const failed = [];
let skipCount = 0;
for (const name of files) {
  if (skipped[name]) {
    skipCount++;
    console.log(`SKIP  ${name}  (${skipped[name].slice(0, 90)}...)`);
    continue;
  }
  const started = Date.now();
  const nodeArgs = headed ? ['--require', path.join(__dirname, 'headed.cjs')] : [];
  const run = spawnSync(process.execPath, [...nodeArgs, path.join(dir, name)], {
    encoding: 'utf8',
    timeout: headed ? 600000 : 120000,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = run.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${seconds}s)`);
  if (!ok) {
    failed.push(name);
    const output = (run.stderr || run.stdout || String(run.error || '')).trim().split('\n');
    console.log(
      output
        .slice(0, 6)
        .map((line) => `      ${line.slice(0, 160)}`)
        .join('\n')
    );
  }
}

console.log(
  `\n${files.length - failed.length - skipCount}/${files.length - skipCount} passed, ${skipCount} skipped`
);
process.exit(failed.length ? 1 : 0);
