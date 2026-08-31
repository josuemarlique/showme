import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { isVersionOnlyArgv, VERSION } from "../src/cli.js";

const execFileAsync = promisify(execFile);
const BIN = fileURLToPath(new URL("../bin/showme.js", import.meta.url));

// Windows process startup is substantially slower on hosted runners, so give it
// more headroom.
const VERSION_BUDGET_MS = process.platform === "win32" ? 750 : 500;

// A listener that accepts a connection and never answers. Any analytics client
// that ever comes back would have to reach something, so pointing every removed
// telemetry env var at this server proves nothing is sent rather than merely
// proving no code named "telemetry" exists.
async function startBlackHoleListener() {
  const sockets = new Set();
  const requests = [];
  const server = createServer((req) => {
    requests.push(req.url);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    requests,
    host: `http://127.0.0.1:${port}`,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("isVersionOnlyArgv matches exactly the SDK's version-flag shapes", () => {
  for (const flag of ["--version", "-v", "-V"]) {
    assert.equal(isVersionOnlyArgv([flag]), true);
  }
  for (const argv of [[], ["--help"], ["open"], ["--version", "extra"], ["open", "--version"]]) {
    assert.equal(isVersionOnlyArgv(argv), false);
  }
});

test("--version prints the version fast and skips state-dir init", async (t) => {
  const stateParent = await mkdtemp(path.join(tmpdir(), "showme-version-"));
  const stateDir = path.join(stateParent, "state");
  t.after(async () => {
    await rm(stateParent, { recursive: true, force: true });
  });

  const env = { ...process.env, SHOWME_STATE_DIR: stateDir };

  for (const flag of ["--version", "-v", "-V"]) {
    const startedAt = process.hrtime.bigint();
    const { stdout } = await execFileAsync(process.execPath, [BIN, flag], { env });
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    assert.equal(stdout, `${VERSION}\n`);
    assert.ok(
      elapsedMs < VERSION_BUDGET_MS,
      `\`${flag}\` took ${Math.round(elapsedMs)}ms, over the ${VERSION_BUDGET_MS}ms budget`,
    );
  }

  assert.equal(existsSync(stateDir), false);
});

test("a non-version invocation still runs the state-dir init the fast path skips", async (t) => {
  const stateParent = await mkdtemp(path.join(tmpdir(), "showme-version-control-"));
  const stateDir = path.join(stateParent, "state");
  t.after(async () => {
    await rm(stateParent, { recursive: true, force: true });
  });

  await execFileAsync(process.execPath, [BIN, "design"], {
    env: { ...process.env, SHOWME_STATE_DIR: stateDir },
  });

  assert.equal(existsSync(stateDir), true);
});

test("no command phones home, even with the removed analytics env vars set", async (t) => {
  const listener = await startBlackHoleListener();
  const stateParent = await mkdtemp(path.join(tmpdir(), "showme-no-telemetry-"));
  const stateDir = path.join(stateParent, "state");
  t.after(async () => {
    await listener.close();
    await rm(stateParent, { recursive: true, force: true });
  });

  const env = {
    ...process.env,
    SHOWME_STATE_DIR: stateDir,
    // Every env var the deleted Umami client used to read. Setting them must do
    // nothing at all now.
    SHOWME_TELEMETRY: "1",
    SHOWME_UMAMI_WEBSITE_ID: "should-be-ignored",
    SHOWME_UMAMI_HOST: listener.host,
    SHOWME_BUILD_UMAMI_WEBSITE_ID: "should-be-ignored",
    SHOWME_BUILD_UMAMI_HOST: listener.host,
  };

  for (const argv of [["design"], ["playbook"], ["--version"]]) {
    await execFileAsync(process.execPath, [BIN, ...argv], { env });
  }

  assert.deepEqual(listener.requests, [], "expected no outbound analytics request from any command");
});
