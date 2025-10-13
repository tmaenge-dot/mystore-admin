import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

test('regenerate script dry-run prints proposed changes', async () => {
  const node = process.execPath;
  const script = new URL('../scripts/regenerate-brand-variants.js', import.meta.url).pathname;
  const { stdout, stderr } = await execFileP(node, [script, '--dry-run', '--percent', '10'], { cwd: process.cwd(), timeout: 5000 });
  assert.ok(stdout && stdout.includes('Dry-run mode'), 'should indicate dry-run');
});
