// Trigger string Claude Code (and other agents) match against to auto-load the skill.
// Kept terse and outcome-focused so it fires on "about to show something visual" intents.
export const SKILL_DESCRIPTION =
  "Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can " +
  "annotate and send feedback on, using the showme CLI. Use when about to give a plan, " +
  "comparison, diagram, table, code diff, report, or anything easier to grasp visually than as prose.";

// Hard cap so a future regeneration cannot silently re-inflate the stub with CLI-owned
// instructions. The CLI (`showme --help`, `design`, `playbook`) is the source of truth.
export const MAX_SKILL_MARKDOWN_CHARS = 4000;

// Agent Skills allows only these top-level frontmatter keys; the reference validator
// (skills-ref) rejects anything else outright, and an Agent Plugins client skips a skill
// it cannot validate. Everything else we want to publish has to live under `metadata`.
export const ALLOWED_SKILL_FRONTMATTER_KEYS = Object.freeze([
  "allowed-tools",
  "compatibility",
  "description",
  "license",
  "metadata",
  "name",
]);

/**
 * Render the installable SKILL.md for the showme skill.
 *
 * This is a discovery stub, not a copy of CLI guidance. Installed skills go stale;
 * `showme --help`, `showme design`, and `showme playbook <id>` do not.
 * Keep the body to what Showme is, when to reach for it, how to invoke the local CLI,
 * slash-command request handling, and pointers at those commands.
 *
 * The frontmatter is deliberately plain: block-style YAML only (the reference
 * validator rejects `[a, b]` flow collections) and string-valued `metadata`,
 * which is why the Hermes fields are flattened rather than nested.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  const markdown = `---
name: showme
description: ${SKILL_DESCRIPTION}
license: MIT
metadata:
  author: Local fork of lavish-axi by Kun Chen (MIT)
  argument-hint: <what the artifact should show>
  hermes-tags: html, review, artifacts, visualization
  hermes-category: productivity
---

# Showme

Showme opens agent-generated HTML in the browser so a human can annotate it and send feedback back to the agent.
Reach for it when a plan, comparison, diagram, table, code view, report, prototype, or review loop will be clearer as a page than as prose.

## Current guidance lives in the CLI

Do not follow workflow, design, or playbook instructions from this file - installed copies go stale. Get the current source of truth from the CLI:

- \`showme --help\` for commands and the review-loop workflow
- \`showme design\` for design-direction priority and current snippets
- \`showme playbook <id>\` for focused artifact guidance (\`showme playbook\` lists ids)

## Running it

Showme is installed locally, never from npm.
NEVER run \`npx showme\` or \`npx -y showme\` - that name belongs to an unrelated package on the public registry.

Use \`showme\` if it is on PATH. If it is not, run the copy that ships beside this skill:
\`node "<skill base directory>/../../dist/cli.mjs"\`, using the base directory given to you when this
skill was loaded. That file needs no install step - every dependency is bundled into it.
Whichever form works, keep using it, and translate any \`showme ...\` command in the CLI's own output
into that same form.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/showme\` explicitly - fetch the current CLI guidance, then build that artifact.
If it is empty, infer what to visualize from the conversation.
`;

  if (markdown.length > MAX_SKILL_MARKDOWN_CHARS) {
    throw new Error(
      `generated SKILL.md is ${markdown.length} chars; keep it a stub under ${MAX_SKILL_MARKDOWN_CHARS} and defer guidance to the CLI`,
    );
  }

  return markdown;
}

/**
 * Parse SKILL.md frontmatter into a normalized model.
 *
 * Deliberately tiny and strict: it accepts only the block-style shapes Agent Skills
 * permits - flat `key: value` entries plus a single level of indented entries under
 * `metadata:` - and reports anything else rather than guessing. That strictness is the
 * point: a shape this parser rejects is a shape the reference validator rejects too.
 *
 * @param {string} markdown full SKILL.md contents
 * @returns {{ frontmatter: Record<string, string | Record<string, string>>, errors: string[] }}
 */
export function parseSkillFrontmatter(markdown) {
  /** @type {Record<string, string | Record<string, string>>} */
  const frontmatter = {};
  const errors = [];

  if (!markdown.startsWith("---\n")) {
    return { frontmatter, errors: ["frontmatter does not open with `---`"] };
  }
  const end = markdown.indexOf("\n---\n", 3);
  if (end < 0) {
    return { frontmatter, errors: ["frontmatter is not closed with `---`"] };
  }

  let parentKey = null;
  for (const line of markdown.slice(4, end + 1).split("\n")) {
    if (line.trim() === "") continue;

    const indented = /^ {2}\S/.test(line);
    if (!indented && /^\s/.test(line)) {
      errors.push(`unsupported indentation: ${line}`);
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      errors.push(`not a \`key: value\` entry: ${line.trim()}`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (value.startsWith("[") || value.startsWith("{")) {
      errors.push(`\`${key}\` uses a YAML flow collection, which the reference validator rejects`);
      continue;
    }

    if (indented) {
      if (parentKey === null) {
        errors.push(`\`${key}\` is indented under no parent key`);
        continue;
      }
      if (value === "") {
        errors.push(`\`${parentKey}.${key}\` nests deeper than one level`);
        continue;
      }
      const parent = frontmatter[parentKey];
      if (typeof parent === "object") parent[key] = value;
      continue;
    }

    if (value === "") {
      frontmatter[key] = {};
      parentKey = key;
      continue;
    }
    frontmatter[key] = value;
    parentKey = null;
  }

  return { frontmatter, errors };
}

/**
 * Check a generated SKILL.md against the Agent Skills frontmatter rules that the
 * reference validator enforces. Agent Plugins delegates skill validity wholesale to
 * that spec and silently skips skills that fail it, so this doubles as the plugin's
 * skills-component check.
 *
 * @param {string} markdown full SKILL.md contents
 * @param {{ directoryName?: string }} [options] directory the skill is published under
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSkillMarkdown(markdown, { directoryName } = {}) {
  const { frontmatter, errors } = parseSkillFrontmatter(markdown);

  for (const key of Object.keys(frontmatter)) {
    if (!ALLOWED_SKILL_FRONTMATTER_KEYS.includes(key)) {
      errors.push(`unexpected frontmatter field \`${key}\`; allowed: ${ALLOWED_SKILL_FRONTMATTER_KEYS.join(", ")}`);
    }
  }

  const name = frontmatter.name;
  if (typeof name !== "string" || name === "") {
    errors.push("`name` is required");
  } else {
    if (name.length > 64) errors.push("`name` exceeds 64 characters");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      errors.push("`name` must be lowercase alphanumeric with single separating hyphens");
    }
    if (directoryName !== undefined && name !== directoryName) {
      errors.push(`directory name \`${directoryName}\` must match skill name \`${name}\``);
    }
  }

  const description = frontmatter.description;
  if (typeof description !== "string" || description === "") {
    errors.push("`description` is required");
  } else if (description.length > 1024) {
    errors.push("`description` exceeds 1024 characters");
  }

  const metadata = frontmatter.metadata;
  if (metadata !== undefined) {
    if (typeof metadata !== "object") {
      errors.push("`metadata` must be a map");
    } else {
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value !== "string" || value === "") {
          errors.push(`\`metadata.${key}\` must be a non-empty string value`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
