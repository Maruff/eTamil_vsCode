// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Mohammed Maruff (Esan Maruff) <esan@etamil.in>
//
// The eTamil language server, as this extension uses it.
//
// `etamil-lsp` answers from the compiler's own front end, so what it reports is
// what `etamil --check` reports, without starting a process per keystroke. It
// is opt-in (`etamil.languageServer.enabled`) because the release packages do
// not carry the binary yet, and it falls back to the built-in checks whenever
// it cannot start, so turning it on can never leave a file unchecked.
//
// In this editor the server supplies diagnostics. Completion, hover and
// definition are answered by the providers in language.ts, which know the
// keywords, the builtins and the standard library's documentation and the
// location of its source; the server knows only the names in the file, and two
// sources answering the same question would list every local function twice.
// The server offers all four to other editors, which have no such providers.

import { existsSync } from 'fs';
import * as vscode from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

import { findServer } from './serverPath';
import { bundledCompiler, compilerEnv } from './toolchain';

let client: LanguageClient | undefined;

/**
 * Start the server if it is enabled and can be found.
 *
 * Returns whether the server now owns diagnostics. `onFailure` is called if it
 * was started and then could not run, so the caller can put the built-in
 * checks back.
 */
export function startLanguageServer(
  context: vscode.ExtensionContext,
  output: vscode.LogOutputChannel,
  onFailure: () => void
): boolean {
  const settings = vscode.workspace.getConfiguration('etamil');
  if (!settings.get<boolean>('languageServer.enabled', false)) {
    return false;
  }

  const found = findServer({
    configured: settings.get<string>('languageServer.path', ''),
    carriedCompiler: bundledCompiler(),
    pathEnv: process.env.PATH ?? '',
    platform: process.platform,
    exists: existsSync,
  });

  if (!found) {
    output.warn(
      'language server: etamil-lsp was not found (set etamil.languageServer.path, ' +
        'or put it on the PATH); using the built-in checks.'
    );
    return false;
  }
  if (found.source === 'setting' && !existsSync(found.path)) {
    output.warn(`language server: ${found.path} does not exist; using the built-in checks.`);
    return false;
  }

  output.info(`language server: ${found.path} (${found.source})`);

  const serverOptions: ServerOptions = {
    command: found.path,
    args: [],
    transport: TransportKind.stdio,
    // The carried library, so a standard library import resolves.
    options: { env: compilerEnv() },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'etamil' }, { scheme: 'untitled', language: 'etamil' }],
    outputChannel: output,
    middleware: {
      // See the header: diagnostics only, here.
      provideCompletionItem: () => undefined,
      provideHover: () => undefined,
      provideDefinition: () => undefined,
    },
  };

  client = new LanguageClient('etamil', 'eTamil language server', serverOptions, clientOptions);
  client.start().catch((error: unknown) => {
    output.error(`language server failed to start: ${String(error)}; using the built-in checks.`);
    client = undefined;
    onFailure();
  });
  context.subscriptions.push({ dispose: () => void stopLanguageServer() });
  return true;
}

export async function stopLanguageServer(): Promise<void> {
  const running = client;
  client = undefined;
  if (running) {
    await running.stop().catch(() => undefined);
  }
}
