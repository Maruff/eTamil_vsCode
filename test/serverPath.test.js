// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Mohammed Maruff (Esan Maruff) <esan@etamil.in>
//
// Where the language server is found. The order is the whole behaviour: an
// explicit setting, then beside the carried compiler, then the PATH.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, describe } = require('node:test');

const BUILT = path.join(__dirname, '..', 'out', 'serverPath.js');
const available = fs.existsSync(BUILT);
const { findServer, serverBinaryName } = available ? require(BUILT) : {};

const skip = available ? false : 'run `npm run build` first';

/** A lookup over a set of files that "exist". */
function lookup(overrides, existing = []) {
  const files = new Set(existing);
  return {
    configured: '',
    carriedCompiler: undefined,
    pathEnv: '',
    platform: 'linux',
    exists: (candidate) => files.has(candidate),
    ...overrides,
  };
}

describe('language server lookup', { skip }, () => {
  test('the binary is named for the platform', () => {
    assert.equal(serverBinaryName('win32'), 'etamil-lsp.exe');
    assert.equal(serverBinaryName('linux'), 'etamil-lsp');
    assert.equal(serverBinaryName('darwin'), 'etamil-lsp');
  });

  test('nothing is found when nothing is there', () => {
    assert.equal(findServer(lookup({})), undefined);
  });

  test('an explicit setting wins, even over a carried server', () => {
    const carried = path.join('/ext', 'bin', 'linux-x64', 'etamil-lsp');
    const found = findServer(
      lookup(
        { configured: '  /opt/mine/etamil-lsp  ', carriedCompiler: path.join('/ext', 'bin', 'linux-x64', 'etamil') },
        [carried]
      )
    );
    assert.deepEqual(found, { path: '/opt/mine/etamil-lsp', source: 'setting' });
  });

  test('a configured path that does not exist is still returned, so it can be reported by name', () => {
    const found = findServer(lookup({ configured: '/nowhere/etamil-lsp' }));
    assert.equal(found.source, 'setting');
  });

  test('the server beside the carried compiler is used', () => {
    const compiler = path.join('/ext', 'bin', 'linux-x64', 'etamil');
    const sibling = path.join('/ext', 'bin', 'linux-x64', 'etamil-lsp');
    const found = findServer(lookup({ carriedCompiler: compiler }, [sibling]));
    assert.deepEqual(found, { path: sibling, source: 'carried' });
  });

  test('a carried compiler with no server beside it falls through to the PATH', () => {
    const compiler = path.join('/ext', 'bin', 'linux-x64', 'etamil');
    const onPath = path.join('/usr/local/bin', 'etamil-lsp');
    const found = findServer(
      lookup({ carriedCompiler: compiler, pathEnv: '/usr/bin:/usr/local/bin' }, [onPath])
    );
    assert.deepEqual(found, { path: onPath, source: 'path' });
  });

  test('the PATH is searched in order and empty entries are skipped', () => {
    const first = path.join('/a', 'etamil-lsp');
    const second = path.join('/b', 'etamil-lsp');
    const found = findServer(lookup({ pathEnv: '::/a:/b' }, [first, second]));
    assert.equal(found.path, first);
  });

  test('Windows separates PATH with semicolons and looks for the .exe', () => {
    const exe = path.join('C:\\tools', 'etamil-lsp.exe');
    const found = findServer(lookup({ platform: 'win32', pathEnv: 'C:\\Windows;C:\\tools' }, [exe]));
    assert.equal(found.path, exe);
    assert.equal(found.source, 'path');
  });
});
