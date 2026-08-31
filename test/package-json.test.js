import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("check script runs all verification commands", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const checkCommands = packageJson.scripts.check.split(" && ");

  assert.deepEqual(checkCommands, [
    "npm run build",
    "npm run lint",
    "npm run format:check",
    "npm run typecheck",
    "npm test",
    "node scripts/build-skill.js --check",
    "node scripts/build-plugin.js --check",
  ]);
});

test("committed skill matches the generator stub", async () => {
  const { createSkillMarkdown } = await import("../src/skill.js");
  const committed = await readFile(new URL("../skills/showme/SKILL.md", import.meta.url), "utf8");

  assert.equal(committed, createSkillMarkdown(), "run `npm run build:skill` and commit the result");
});

test("published package includes the installable skill", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.ok(packageJson.files.includes("skills/showme"));
});

test("published package root is a complete Agent Plugin", async () => {
  // The tarball root doubles as the plugin root, so both the manifest and the skills it
  // discovers have to ship; without either, an installed copy is not installable as a plugin.
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.ok(packageJson.files.includes("plugin.json"));
  assert.ok(packageJson.files.includes("skills/showme"));
});

test("public showme skill is not marked internal", async () => {
  const skillMd = await readFile(new URL("../skills/showme/SKILL.md", import.meta.url), "utf8");
  const frontmatter = skillMd.slice(4, skillMd.indexOf("\n---\n", 4));

  assert.doesNotMatch(frontmatter, /^metadata:\n {2}internal: true$/m);
});

test("build copies local design assets for published artifact injection", async () => {
  const buildScript = await readFile(new URL("../scripts/build.js", import.meta.url), "utf8");

  assert.match(buildScript, /daisyui\.css/);
  assert.match(buildScript, /daisyui-themes\.css/);
  assert.match(buildScript, /tailwindcss-browser\.js/);
});

test("pnpm lock root importer matches the publish manifest", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const pnpmLock = await readFile(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");

  for (const [name, specifier] of Object.entries(packageJson.dependencies)) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    assert.match(pnpmLock, new RegExp(`["']?${escapedName}["']?:[\\s\\S]*?specifier: ${escapedSpecifier}`));
  }
});

test("the build never bakes in analytics or telemetry credentials", async () => {
  const buildScript = await readFile(new URL("../scripts/build.js", import.meta.url), "utf8");

  assert.doesNotMatch(buildScript, /UMAMI/i);
  assert.doesNotMatch(buildScript, /TELEMETRY/i);
});
