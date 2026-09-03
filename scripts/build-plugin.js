// Generates the root plugin.json from package.json so the Agent Plugins manifest never
// drifts from the published package identity.
//
//   node scripts/build-plugin.js          # write the file
//   node scripts/build-plugin.js --check  # fail (exit 1) if the committed file is stale
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createCodexPluginManifestJson, createPluginManifestJson } from "../src/plugin.js";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const targets = [
  {
    target: new URL("../plugin.json", import.meta.url),
    expected: createPluginManifestJson(packageJson),
    label: "plugin.json",
  },
  {
    target: new URL("../.codex-plugin/plugin.json", import.meta.url),
    expected: createCodexPluginManifestJson(packageJson),
    label: ".codex-plugin/plugin.json",
  },
];
const check = process.argv.includes("--check");

if (check) {
  let stale = false;
  for (const { target, expected, label } of targets) {
    let actual = null;
    try {
      actual = await readFile(target, "utf8");
    } catch {
      // missing file falls through to the mismatch branch below
    }
    if (actual !== expected) {
      console.error(`${label} is out of date. Run \`node scripts/build-plugin.js\` and commit the result.`);
      stale = true;
    } else {
      console.log(`${label} is up to date.`);
    }
  }
  if (stale) {
    process.exit(1);
  }
} else {
  await mkdir(new URL("../.codex-plugin/", import.meta.url), { recursive: true });
  for (const { target, expected } of targets) {
    await writeFile(target, expected);
    console.log(`Wrote ${fileURLToPath(target)}`);
  }
}
