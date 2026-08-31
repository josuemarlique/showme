import assert from "node:assert/strict";
import test from "node:test";

import { POLL_SEND_AND_END_RULE, POLL_WAKE_PATH_RULES, createHomeOutput } from "../src/cli.js";
import { DESIGN_PRIORITY_RULE } from "../src/design-reference.js";
import { PLAYBOOK_ROUTER_HELP } from "../src/playbooks.js";
import {
  ALLOWED_SKILL_FRONTMATTER_KEYS,
  MAX_SKILL_MARKDOWN_CHARS,
  SKILL_DESCRIPTION,
  createSkillMarkdown,
  parseSkillFrontmatter,
  validateSkillMarkdown,
} from "../src/skill.js";

test("createSkillMarkdown emits valid frontmatter naming the showme skill", () => {
  const { frontmatter, errors } = parseSkillFrontmatter(createSkillMarkdown());

  assert.deepEqual(errors, [], "frontmatter parses as plain block-style YAML");
  assert.equal(frontmatter.name, "showme");
  assert.equal(frontmatter.description, SKILL_DESCRIPTION);
});

test("createSkillMarkdown emits Hermes Agent metadata as string-valued frontmatter", () => {
  const { frontmatter } = parseSkillFrontmatter(createSkillMarkdown());

  assert.deepEqual(frontmatter.metadata, {
    author: "Local fork of lavish-axi by Kun Chen (MIT)",
    "argument-hint": "<what the artifact should show>",
    "hermes-tags": "html, review, artifacts, visualization",
    "hermes-category": "productivity",
  });
  assert.equal(frontmatter.version, undefined, "version is omitted to avoid release churn");
});

test("createSkillMarkdown conforms to the Agent Skills frontmatter contract", () => {
  // Agent Plugins delegates skill validity to Agent Skills and silently skips any skill
  // that fails it, so a regression here would quietly remove the skill from the plugin.
  const { valid, errors } = validateSkillMarkdown(createSkillMarkdown(), { directoryName: "showme" });

  assert.deepEqual(errors, []);
  assert.ok(valid);
});

test("createSkillMarkdown keeps every frontmatter field in the allowed set", () => {
  const { frontmatter } = parseSkillFrontmatter(createSkillMarkdown());

  for (const key of Object.keys(frontmatter)) {
    assert.ok(ALLOWED_SKILL_FRONTMATTER_KEYS.includes(key), `\`${key}\` is an allowed Agent Skills field`);
  }
});

test("validateSkillMarkdown rejects the shapes the reference validator rejects", () => {
  const flowCollection = "---\nname: showme\ndescription: d\nmetadata:\n  tags: [a, b]\n---\nbody";
  assert.match(validateSkillMarkdown(flowCollection).errors.join("\n"), /flow collection/);

  const unknownField = "---\nname: showme\ndescription: d\nargument-hint: x\n---\nbody";
  assert.match(validateSkillMarkdown(unknownField).errors.join("\n"), /unexpected frontmatter field `argument-hint`/);

  const nested = "---\nname: showme\ndescription: d\nmetadata:\n  hermes:\n    category: p\n---\nbody";
  assert.match(validateSkillMarkdown(nested).errors.join("\n"), /nests deeper than one level/);

  const mismatched = "---\nname: showme\ndescription: d\n---\nbody";
  assert.match(
    validateSkillMarkdown(mismatched, { directoryName: "other" }).errors.join("\n"),
    /must match skill name/,
  );

  const missing = "---\nname: showme\n---\nbody";
  assert.match(validateSkillMarkdown(missing).errors.join("\n"), /`description` is required/);
});

test("createSkillMarkdown handles explicit /showme invocation arguments", () => {
  const md = createSkillMarkdown();
  const body = md.slice(md.indexOf("\n---\n", 4) + 5);

  assert.ok(body.includes("$ARGUMENTS"), "body consumes slash-command arguments");
  assert.match(body, /empty/i, "explains the model-invoked case where no arguments are passed");
});

test("createSkillMarkdown stays a short stub that defers to the CLI", () => {
  const md = createSkillMarkdown();

  assert.ok(md.length <= MAX_SKILL_MARKDOWN_CHARS, "the generated skill stays drastically smaller than CLI guidance");
  assert.match(md, /Showme/);
  assert.match(md, /`showme --help`/);
  assert.match(md, /`showme design`/);
  assert.match(md, /`showme playbook <id>`/);
  assert.match(md, /stale/i);
});

test("createSkillMarkdown does not bake CLI-owned guidance into the skill", () => {
  const md = createSkillMarkdown();
  const home = createHomeOutput({ bin: "showme", sessions: [], includeSessions: false, agent: "static" });

  for (const item of home.visual_guidance) {
    assert.ok(!md.includes(item), `must not copy visual guidance: ${item.slice(0, 48)}...`);
  }

  for (const playbook of home.playbooks) {
    assert.ok(!md.includes(playbook.use_when), `must not copy playbook use_when: ${playbook.id}`);
  }

  for (const item of POLL_WAKE_PATH_RULES) {
    assert.ok(!md.includes(item), `must not copy poll wake-path rule: ${item.slice(0, 48)}...`);
  }

  assert.ok(!md.includes(POLL_SEND_AND_END_RULE), "must not copy the Send & End rule");
  assert.ok(!md.includes(PLAYBOOK_ROUTER_HELP), "must not copy playbook-router help");
  assert.ok(!md.includes(DESIGN_PRIORITY_RULE), "must not copy the design-priority rule");
  assert.doesNotMatch(md, /self_paint_warning/);
  assert.doesNotMatch(md, /## Workflow/);
  assert.doesNotMatch(md, /## Visual guidance/);
  assert.doesNotMatch(md, /## Playbooks/);
  assert.doesNotMatch(md, /## Commands & rules/);
});

test("createSkillMarkdown does not leak live session state", () => {
  const md = createSkillMarkdown();
  assert.ok(!md.includes("pending_prompts"), "no session bookkeeping fields");
  assert.ok(!/\/session\/[0-9a-f]{8}/.test(md), "no live session URLs");
});

test("createSkillMarkdown omits setup guidance", () => {
  // Installation is the user's business; the skill is agent-facing guidance only.
  const md = createSkillMarkdown();
  assert.doesNotMatch(md, /setup hooks/);
  assert.doesNotMatch(md, /setup plugin/);
});

test("createSkillMarkdown steers the agent away from npx", () => {
  // This fork is never published, and `showme` on npm is an unrelated package, so a skill that
  // told the agent to run `npx -y showme` would have it download and execute somebody else's
  // code. The only npx mention allowed is the warning against it.
  const md = createSkillMarkdown();

  assert.match(md, /NEVER run `npx showme` or `npx -y showme`/);
  assert.match(md, /installed locally, never from npm/);
  // The fallback has to be self-locating: on another machine the plugin lives in Claude Code's
  // cache under a path nobody can hardcode, and Claude Code tells the skill its own base
  // directory when it loads. Anything else leaves a cloned plugin unable to find its own CLI.
  assert.match(md, /skill base directory/, "the fallback must resolve from the skill's own location");
  assert.match(md, /\/\.\.\/\.\.\/dist\/cli\.mjs/, "the fallback must name the bundled CLI path");

  const prescriptions = [...md.matchAll(/`npx[^`]*`/g)].map((match) => match[0]);
  assert.deepEqual(
    prescriptions,
    ["`npx showme`", "`npx -y showme`"],
    "npx may appear only inside the warning, never as an instruction",
  );
});
