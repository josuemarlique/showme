import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function expandHex(hex) {
  const value = String(hex).replace(/^#/, "");
  return value.length === 3
    ? value
        .split("")
        .map((digit) => digit + digit)
        .join("")
    : value;
}

function relativeLuminance(hex) {
  const value = expandHex(hex);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const luminances = [relativeLuminance(a), relativeLuminance(b)].sort((left, right) => right - left);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function hexToken(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{3,6})`, "i"));
  assert.ok(match, `${name} must be a literal hex token`);
  return match[1];
}

test("Showme-owned review surfaces default to a light color scheme", async () => {
  const [chromeCss, artifactSdk] = await Promise.all([
    readFile(new URL("../src/chrome.css", import.meta.url), "utf8"),
    readFile(new URL("../src/artifact-sdk.js", import.meta.url), "utf8"),
  ]);

  assert.match(chromeCss, /body\.showme\s*\{\s*color-scheme:\s*light;/);
  assert.match(chromeCss, /--bg:\s*var\(--cream-50\)/);
  assert.match(chromeCss, /--bg-panel:\s*#fff/);
  assert.match(chromeCss, /--fg:\s*var\(--ink-900\)/);

  assert.match(artifactSdk, /color-scheme:light;--ink-900/);
  assert.match(artifactSdk, /--bg:var\(--cream-50\);--bg-panel:#fff/);
  assert.match(artifactSdk, /--fg:var\(--ink-900\)/);
  assert.doesNotMatch(artifactSdk, /color-scheme:dark;--ink-900/);
});

test("light text controls keep a three-to-one visible boundary", async () => {
  const [chromeCss, artifactSdk] = await Promise.all([
    readFile(new URL("../src/chrome.css", import.meta.url), "utf8"),
    readFile(new URL("../src/artifact-sdk.js", import.meta.url), "utf8"),
  ]);

  const chromeBorder = hexToken(chromeCss, "--border-control");
  const annotationBorder = hexToken(artifactSdk, "--border-control");
  assert.equal(annotationBorder, chromeBorder, "both Showme-owned surfaces use the same control boundary");

  for (const background of ["#fff", "#fffbf3", "#f7f3ea"]) {
    assert.ok(contrastRatio(chromeBorder, background) >= 3, `${chromeBorder} must reach 3:1 against ${background}`);
  }

  assert.match(chromeCss, /\.composer textarea\s*\{[^}]*border:\s*1px solid var\(--border-control\)/s);
  assert.match(artifactSdk, /\.showme-annotation-card textarea\{[^}]*border:1px solid var\(--border-control\)/);
});

test("the annotation card uses the shared semantic accent-ink token", async () => {
  const artifactSdk = await readFile(new URL("../src/artifact-sdk.js", import.meta.url), "utf8");

  assert.match(artifactSdk, /--accent-ink:#fff/);
  assert.match(artifactSdk, /\.showme-send\{background:var\(--accent\);color:var\(--accent-ink\)\}/);
  assert.doesNotMatch(artifactSdk, /--brass-ink:/);
});
