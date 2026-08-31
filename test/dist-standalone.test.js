import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DIST = fileURLToPath(new URL("../dist", import.meta.url));

// Showme is installed as a Claude Code plugin by a plain `git clone`. Nothing runs an install
// step there, so `dist/` lands on disk with no `node_modules` anywhere near it. Everything the
// CLI needs at runtime therefore has to be inside the bundle.
//
// This is not hypothetical: `src/plugin.js` used to reach for cross-spawn through
// `createRequire(import.meta.url)("cross-spawn")`, which a bundler cannot follow, and the built
// CLI died with `Cannot find module 'cross-spawn'` on the very first command. The unit tests
// could not catch it because they import from `src/`, never from `dist/`.
//
// So this suite runs the BUILT artifact, copied away from the repo, with no dependencies present.
const built = existsSync(path.join(DIST, "cli.mjs"));

async function stagedClone(t) {
  // Copy dist/ somewhere with no node_modules above it, the way a cloned plugin sits.
  const root = await mkdtemp(path.join(tmpdir(), "showme-standalone-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(DIST, path.join(root, "dist"), { recursive: true });
  return root;
}

test(
  "the built CLI runs with no node_modules beside it",
  { skip: !built && "run `pnpm run build` first" },
  async (t) => {
    const root = await stagedClone(t);
    const cli = path.join(root, "dist", "cli.mjs");

    const { stdout } = await execFileAsync(process.execPath, [cli, "--version"], {
      env: { ...process.env, SHOWME_STATE_DIR: path.join(root, "state") },
    });

    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/, "the bundled CLI must start and report its version");
  },
);

test(
  "the built CLI can export an artifact with no node_modules",
  { skip: !built && "run `pnpm run build` first" },
  async (t) => {
    const root = await stagedClone(t);
    const cli = path.join(root, "dist", "cli.mjs");
    const artifact = path.join(root, "report.html");
    await writeFile(artifact, "<!doctype html><html><body><h1>Hi</h1></body></html>", "utf8");

    // `export` exercises the HTML parser and the file walker, so it proves more of the bundle
    // than `--version` does, and it needs no server or browser.
    await execFileAsync(process.execPath, [cli, "export", artifact], {
      env: { ...process.env, SHOWME_STATE_DIR: path.join(root, "state") },
    });

    const exported = await readFile(path.join(root, "report.export.html"), "utf8");
    assert.match(exported, /<h1>Hi<\/h1>/);
  },
);

test(
  "the bundle leaves no unresolvable dependency behind",
  { skip: !built && "run `pnpm run build` first" },
  async () => {
    const bundle = await readFile(path.join(DIST, "cli.mjs"), "utf8");

    const required = new Set();
    for (const match of bundle.matchAll(/(?:__require|require)\("([^"]+)"\)/g)) {
      required.add(match[1]);
    }

    // Bare specifiers that are really Node builtins written without the `node:` prefix.
    const builtins = new Set([
      "assert",
      "async_hooks",
      "buffer",
      "child_process",
      "console",
      "constants",
      "crypto",
      "dns",
      "events",
      "fs",
      "http",
      "http2",
      "https",
      "module",
      "net",
      "os",
      "path",
      "process",
      "punycode",
      "querystring",
      "readline",
      "stream",
      "string_decoder",
      "timers",
      "tls",
      "tty",
      "url",
      "util",
      "v8",
      "vm",
      "worker_threads",
      "zlib",
    ]);
    // `debug` probes for this one inside a try/catch purely to decide terminal colours, and runs
    // fine without it. Anything ELSE that escapes the bundle is a real missing dependency.
    const optional = new Set(["supports-color"]);

    const unresolvable = [...required].filter(
      (name) => !name.startsWith("node:") && !builtins.has(name) && !optional.has(name) && !name.startsWith("."),
    );

    assert.deepEqual(
      unresolvable,
      [],
      `dist/cli.mjs still expects packages that a cloned plugin will not have: ${unresolvable.join(", ")}`,
    );
  },
);
