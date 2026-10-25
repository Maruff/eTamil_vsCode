# Publishing the extension

The extension is published to two places, because the editors that run it read from
different ones:

| Registry | Read by |
|---|---|
| Visual Studio Marketplace | VS Code |
| [Open VSX](https://open-vsx.org) | Cursor, Windsurf, VSCodium, Gitpod and other VS Code forks |

Both get the same five platform builds (`win32-x64`, `linux-x64`, `linux-arm64`,
`darwin-x64`, `darwin-arm64`), because each carries the compiler for one platform.

## Releasing

1. Publish the compiler release first (`eTamil_lang`, tag `vX.Y.Z`), with its five
   archives. The extension carries those exact archives, so they must exist.
2. Make this repository's `package.json` version `X.Y.Z` and merge it. The workflow
   refuses a tag that does not match the version.
3. **Actions > Publish > Run workflow**, with `release_tag` set to `vX.Y.Z`.
   - Leave **publish** off to build only. The five `.vsix` files appear as the
     `vsix` artifact of the run and nothing is published: use this first.
   - Turn **publish** on to send them to the Marketplace and Open VSX.

A publish step whose token is missing warns and does nothing instead of failing, so
one registry can go out without the other.

## One-time setup

**Visual Studio Marketplace**

1. Create the publisher `etamil` at <https://marketplace.visualstudio.com/manage>.
2. Create a personal access token in Azure DevOps with the scope
   *Marketplace > Manage* (organisation: all accessible organisations). Azure DevOps
   is only the Marketplace's sign-in here; nothing else of it is used.
3. Add it to this repository as the secret **`VSCE_PAT`**.

**Open VSX**

1. Sign in at <https://open-vsx.org> with GitHub, link an Eclipse Foundation account
   and sign the Publisher Agreement (Open VSX will not accept uploads without it).
2. Create an access token on your profile page and add it to this repository as the
   secret **`OVSX_PAT`**.
3. Claim the namespace once, from any machine:

   ```bash
   npx ovsx create-namespace etamil -p <the token>
   ```

   The namespace has to match the `publisher` in `package.json` (`etamil`).

## What is not automated

Neither registry can be un-published quietly, and a version number is used once, so
the workflow is run by hand rather than on every tag. It does not attach the
`.vsix` files to a GitHub release; they are an artifact of the run.
