// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Mohammed Maruff (Esan Maruff) <esan@etamil.in>
//
// Where the language server binary is.
//
// Pure, with the file system passed in, for the same reason `bundle.ts` is: the
// lookup is a decision table, and a decision table is worth testing without an
// editor. The order mirrors the compiler's (see toolchain.ts):
//
//   `etamil.languageServer.path`   an explicit choice always wins.
//   beside the carried compiler     what a VSIX built with the server carries.
//   `etamil-lsp` on the PATH        a separate installation.

import * as path from 'path';

export type ServerSource = 'setting' | 'carried' | 'path';

export interface ServerLocation {
  path: string;
  source: ServerSource;
}

export interface ServerLookup {
  /** The `etamil.languageServer.path` setting, possibly empty. */
  configured: string;
  /** The carried compiler's path, if this VSIX carries one. */
  carriedCompiler: string | undefined;
  /** The PATH environment variable. */
  pathEnv: string;
  platform: string;
  exists: (candidate: string) => boolean;
}

export function serverBinaryName(platform: string): string {
  return platform === 'win32' ? 'etamil-lsp.exe' : 'etamil-lsp';
}

/**
 * The server to run, or `undefined` when there is none.
 *
 * A configured path is returned without checking that it exists: it was an
 * explicit choice, and a missing file is better reported by name than skipped
 * in favour of a different binary the user did not ask for.
 */
export function findServer(lookup: ServerLookup): ServerLocation | undefined {
  const configured = lookup.configured.trim();
  if (configured.length > 0) {
    return { path: configured, source: 'setting' };
  }

  const name = serverBinaryName(lookup.platform);

  if (lookup.carriedCompiler) {
    const sibling = path.join(path.dirname(lookup.carriedCompiler), name);
    if (lookup.exists(sibling)) {
      return { path: sibling, source: 'carried' };
    }
  }

  const delimiter = lookup.platform === 'win32' ? ';' : ':';
  for (const directory of lookup.pathEnv.split(delimiter)) {
    if (directory.length === 0) {
      continue;
    }
    const candidate = path.join(directory, name);
    if (lookup.exists(candidate)) {
      return { path: candidate, source: 'path' };
    }
  }

  return undefined;
}
