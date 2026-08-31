---
name: showme
description: Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can annotate and send feedback on, using the showme CLI. Use when about to give a plan, comparison, diagram, table, code diff, report, or anything easier to grasp visually than as prose.
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

- `showme --help` for commands and the review-loop workflow
- `showme design` for design-direction priority and current snippets
- `showme playbook <id>` for focused artifact guidance (`showme playbook` lists ids)

## Running it

Showme is installed locally, never from npm.
NEVER run `npx showme` or `npx -y showme` - that name belongs to an unrelated package on the public registry.

Use `showme` if it is on PATH. If it is not, run the copy that ships beside this skill:
`node "<skill base directory>/../../dist/cli.mjs"`, using the base directory given to you when this
skill was loaded. That file needs no install step - every dependency is bundled into it.
Whichever form works, keep using it, and translate any `showme ...` command in the CLI's own output
into that same form.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/showme` explicitly - fetch the current CLI guidance, then build that artifact.
If it is empty, infer what to visualize from the conversation.
