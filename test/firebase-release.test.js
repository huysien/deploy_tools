import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describeError, pickBiggestRelease } from '../lib/firebase-release.js';

const bin = fileURLToPath(new URL('../bin/next-version-code.js', import.meta.url));

test('pickBiggestRelease finds the max even when it is not the newest release', () => {
  const releases = [{ buildVersion: '26092501' }, { buildVersion: '1' }, { buildVersion: '26092599' }];
  assert.equal(pickBiggestRelease(releases).buildVersion, '26092599');
});

test('pickBiggestRelease ignores non-numeric build versions and returns null when nothing is numeric', () => {
  assert.equal(pickBiggestRelease([{ buildVersion: 'abc' }, { buildVersion: '7' }]).buildVersion, '7');
  assert.equal(pickBiggestRelease([{ buildVersion: 'abc' }, {}]), null);
  assert.equal(pickBiggestRelease([]), null);
});

test('describeError reports the HTTP status and API message', () => {
  const httpError = { response: { status: 403, data: { error: { message: 'The caller does not have permission' } } } };
  assert.equal(describeError(httpError), 'HTTP 403: The caller does not have permission');
  assert.equal(describeError(new Error('ENOENT: no such file')), 'ENOENT: no such file');
});

test('next-version-code exits 1 and prints no number when releases cannot be read', () => {
  const result = spawnSync(process.execPath, [
    bin, '--project', '123', '--app-id', '1:123:android:abc',
    '--credentials', '/nonexistent/service-account.json', '--initial-version', '1'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout.trim(), '');
  assert.match(result.stderr, /cannot read releases of 1:123:android:abc/);
});
