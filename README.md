# Showme

Open agent-generated HTML in a local browser, point at what needs changing, and send that feedback straight back to the agent.

> **Showme is a fork of [lavish-axi](https://github.com/kunchenguid/lavish-axi) by [Kun Chen](https://github.com/kunchenguid), used under the MIT license.**
> Kun Chen wrote the editor, the review loop, the whiteboards, and nearly everything this tool does.
> This fork only removes the parts that sent data off the machine and renames what was left.
> The original copyright is kept verbatim in [`LICENSE`](LICENSE).

### How this differs from lavish-axi

Everything Showme does well is Kun Chen's design.
This fork changes seven things and leaves the rest alone.

|                         | lavish-axi                                                                                                | Showme                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Usage tracking          | Sends anonymous events to the author's analytics server, on by default                                    | None. A test points the old settings at a listener and asserts nothing is sent |
| Publishing an artifact  | `share` uploads it to ht-ml.app, public by default, no delete                                             | Removed                                                                        |
| Network reach           | Also binds your Tailscale address automatically, so other devices can reach it                            | Binds `127.0.0.1` only                                                         |
| Reviewing on your phone | Yes, over Tailscale                                                                                       | No                                                                             |
| `update`                | Looks the package up on the npm registry                                                                  | Refuses. That name belongs to an unrelated package                             |
| How you install it      | npm package                                                                                               | Git clone. Nothing is published to npm                                         |
| Default appearance      | Dark review chrome and dark artifact fallback                                                             | Light review chrome, annotation card, whiteboards, and artifact fallback       |
| Everything else         | The editor, review loop, annotations, Mermaid whiteboards, layout inbox, attachments, live reload, export | Unchanged                                                                      |

Full detail is in [About this fork](#about-this-fork) below.

HTML is the new markdown.
Showme is the new editor for your HTML artifacts.

Agents are good at producing rich HTML artifacts, but the human-agent loop on those artifacts is lacking and falls back into screenshots and long "tell me what to change" replies.
That loses the thing HTML is best at: interactivity.

Showme opens agent-generated HTML files in a local browser, lets you pinpoint elements and selected text, edit diagrams your agent authored as Mermaid whiteboards, and send feedback to the agent to address.

- **Local only** - Everything runs on this machine.
  By default the server listens on `127.0.0.1` and nothing else (see Network binding), there is no account, no cloud service, and no hosted sharing.
  Showme itself never makes an outbound network request.
- **Human-AI collaboration** - Annotate elements and selected text ranges, edit Mermaid whiteboard diagrams, and send messages to the agent without leaving Showme.
- **Batteries included** - Showme teaches your agent good visualization for common use cases such as product or technical plans, design explorations and more out of the box.

Showme is an AXI, a command-line tool shaped for an agent to drive rather than a person, which means -

- It is just a command-line tool, so any capable agent can run it once it is on your PATH.
- It is optimized for agent ergonomics.
  TOON output (a compact way of printing structured data), long polling, and contextual disclosure make it token efficient.
- The skill, plugin, and hooks below only handle discovery.
  Agents learn to use the tool by using it.

## About this fork

This repository is a fork of **lavish-axi** by Kun Chen, used under the MIT license.
The original copyright notice is untouched in `LICENSE`, and `CHANGELOG.md` is the upstream project's history, not this fork's.

The fork exists for two reasons: the project was renamed to Showme, and every part of it that sent data off this machine was deleted.

What was removed, in plain language:

- **Usage tracking.**
  The original shipped an analytics client (Umami) that posted anonymous events to a remote server.
  The code is gone.
  There is no opt-out setting any more, because there is nothing left to opt out of.
  A test (`test/cli-version.test.js`) points every one of the old tracking settings at a local listener and asserts that nothing is ever sent.
- **Hosted sharing.**
  The original could publish your artifact to ht-ml.app, a third-party website.
  The `share` command, the browser's "Publish link" menu item and dialog, the share API route, and the self-hosting document are all gone.
- **Tailscale and every automatic non-loopback bind.**
  The original detected Tailscale (a private-network tool) and also listened on your Tailscale address so you could open the review on your phone.
  That is gone.
  The server binds `127.0.0.1` only.
  There is no phone URL, no MagicDNS name, and no network health reporting.
- **`showme update`.**
  The self-updater used to look this package up on the public npm registry, where `showme` is an unrelated package.
  It really did offer to "upgrade" you to that stranger's code.
  The command now refuses and tells you to `git pull` instead.
- **The release and publish pipeline.**
  Release automation, the generated-file guard, the pull-request gate, and the npm publish path are gone.
  Only `.github/workflows/ci.yml` remains, which runs lint, format check, typecheck, tests, and build.
  `package.json` is marked `"private": true`, so nothing can be published by accident.
- **The marketing page and the upstream author's internal brand skill.**
  The marketing build uploaded renders to a third-party service, and the brand skill pulled fonts and scripts from remote CDNs at author time.
  Both directories are gone.

What was deliberately **kept**:

- `showme export` still writes a self-contained copy of an artifact.
  It only inlines files already on your disk and makes no network request of its own.
- The design guidance still points at public CDNs (Tailwind, DaisyUI, and Mermaid from jsdelivr, and `@pierre/diffs` from esm.sh).
  A CDN reference downloads a library **into** the browser that views the page.
  It does not send your data anywhere, and it is what lets an exported artifact still render on its own.

**This is not on npm.**
Never run `npx showme` or `npm install -g showme`.
That name belongs to somebody else's package.

## Install

### On another machine, as a Claude Code or Codex plugin

This is the easy path, and it needs no build and no package manager.

Claude Code:

```
/plugin marketplace add josuemarlique/claude-plugins
/plugin install showme@jmarlique-tools
```

Codex CLI:

```sh
codex plugin marketplace add josuemarlique/claude-plugins
codex plugin add showme@jmarlique-tools
```

`josuemarlique/claude-plugins` is the marketplace that lists the plugins.
`jmarlique-tools` is the marketplace's own name, which is why it appears after the `@`.

That is it.
`dist/` is committed to this repo with every dependency bundled into it, so the plugin works the moment Claude Code clones it.
The only requirement on the machine is Node 22 or newer.

Your agent finds the CLI on its own from there: the skill resolves it relative to its own installed location.
If you also want to type `showme` yourself in a terminal, add the launcher below.

### From a checkout, to work on Showme

```sh
git clone https://github.com/josuemarlique/showme.git
cd showme
pnpm install
pnpm run build
```

`pnpm run build` rewrites `dist/`.
Commit `dist/` along with your source change, or machines installing the plugin keep running the old code.

### Optional: put `showme` on your PATH

```sh
mkdir -p ~/.local/bin
cat > ~/.local/bin/showme <<'EOF'
#!/bin/sh
exec node "$HOME/Projects/showme/dist/cli.mjs" "$@"
EOF
chmod +x ~/.local/bin/showme
```

Point it at wherever your checkout lives, and make sure `~/.local/bin` is on your PATH.
Or skip the launcher and call the built file directly:

```sh
node ~/Projects/showme/dist/cli.mjs --help
```

## Give your agent the skill

An agent does not need any of this to use Showme.
It can just run the CLI.
These integrations only help the agent discover the tool on its own.

### Claude Code and Codex plugins

This repo root carries `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, which is the format Claude Code reads.
It also carries `.codex-plugin/plugin.json`, which is the native Codex manifest.
Both hosts load the same skill from `skills/showme/SKILL.md`.
That file is generated by `pnpm run build:skill` from `src/skill.js`.

Installing from GitHub is covered above.
To install from a local checkout instead, for example while changing the skill:

```
/plugin marketplace add ~/Projects/showme
/plugin install showme@showme-local
```

Once installed, invoke it directly in Claude Code:

```
/showme let's discuss our plan here
```

Or in Codex:

```
$showme let's discuss our plan here
```

Or just ask for anything easier to grasp visually, such as a plan, comparison, diagram, table, code view, or report, and the agent loads the skill on its own when it recognizes the task.

### Agent Plugin, for VS Code, Cursor, and GitHub Copilot CLI

The repo root also carries a `plugin.json` that follows [Agent Plugins](https://agent-plugins.org), a different, vendor-neutral standard.
The Claude Code, Codex, and Agent Plugins manifests do not conflict.
All three can sit in this repo at the same time, and each client reads only the one it understands.

Register the checkout with every supported client it can find:

```sh
showme setup plugin
```

That registers **VS Code**, **Cursor**, and **GitHub Copilot CLI**, and reports which ones were absent.
It is opt-in and idempotent, and it repairs the registered path after the repo moves.
Reload each client afterward.

Each client is registered independently.
One that cannot be registered is reported with what to do about it, and never blocks the others or fails the command.

To register by hand instead, point the client at this repo's root directory:

| Client             | Register with                                                      |
| ------------------ | ------------------------------------------------------------------ |
| VS Code            | `"chat.pluginLocations": { "<repo-root>": true }` in user settings |
| Cursor             | link the repo root at `~/.cursor/plugins/local/showme`             |
| GitHub Copilot CLI | `copilot plugin install <repo-root>`                               |

Codex installs the native plugin through the marketplace commands above.
Showme declares no MCP server.
The CLI itself is the agent interface, so a plugin install brings the same `showme` skill.
The session hook below remains optional and adds ambient context about live Showme sessions.

### Session hook

Want Showme's ambient context, including your live open sessions, fed into every agent session instead of loading on demand?

```sh
showme setup hooks
```

This installs a `SessionStart` hook for **Claude Code**, **Codex**, **OpenCode**, and **GitHub Copilot CLI** that surfaces open sessions, visualization playbooks, and usage guidance at the start of each session.
Unlike the skill, the hook also shows your live open sessions, so a fresh agent session can resume a review already in flight.
**Restart your agent session after running this** so the new hook takes effect.
The Claude Code, Codex, and OpenCode hooks record the absolute path to `dist/cli.mjs`, so they work whether or not the launcher is on your PATH.
Only the GitHub Copilot CLI hook calls `showme` by name, so that one does need the launcher.

## How It Works

```
┌────────────────────────────┐
│ Agent writes artifact.html │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ showme <file>              │
│ opens a local browser UI   │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ You annotate elements or   │
│ text, send chat, or queue  │
│ layout issues from the     │
│ inbox                      │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ showme poll waits and      │
│ returns what you queued    │
└────────────────────────────┘
```

- **File-path identity** - Sessions are keyed by the canonical HTML file path, so agents do not need opaque IDs.
- **Portable artifacts** - The artifact runs in a sandboxed iframe while Showme injects a small SDK for annotations, snapshots, feedback controls, and render-time layout checks.
  Author-defined links and popups can open in top-level tabs, while artifact documents remain sandboxed without same-origin access.
  Showme does not inject any design system, so the saved HTML file renders identically whether you open it through `showme` or directly in a browser.
  Run `showme design` for the single source of agent-facing design guidance, including optional CDN snippets and the whiteboard (Mermaid) opt-in snippet.
- **Self-paint warning** - `showme <html-file>` and `showme export` run a render-free check for artifacts missing an explicit page background and return a one-line `self_paint_warning`.
  The check fails open.
  Any stylesheet link, `@import`, Tailwind runtime script, `color-scheme`, or `html`/`body`/`:root` background signal suppresses it, and it never blocks the open.
- **Open-time layout gate** - The browser chrome masks an artifact only while the real in-iframe audit waits for fonts and final geometry.
  The first completed client-side check reveals the artifact, whatever it found and even if reporting that check to the server fails.
  The gate never holds the review hostage waiting for a repair or a network round-trip.
  You can click **Show anyway**, and a bounded safety timeout fails open from every gate state.
  If the review cannot load at all, because the chrome's own script never runs or the server does not answer the artifact's load request after several retries, the mask names the problem and offers **Check and reload** without removing the independent **Show anyway** escape.
  A review already loaded in another browser tab is named the same way, with a **Take over here** button that moves it into the current tab, because Showme loads an artifact in one tab at a time.
- **Layout issues inbox** - Detection is passive.
  After fonts and finite animations settle, the injected SDK confirms severe failures from direct rendered evidence such as materially escaped meaningful content or required controls, clipped text fragments, viewport reachability, or near-total semantic occlusion.
  Explicit ellipsis and line clamp, standard visually hidden accessibility text, intentional scrollers or masks, parent overhang, generic element scroll geometry, decorative overlap, and uncertain motion do not produce findings by themselves.
  Proven failures are filed in a **Layout issues** button in the top bar, which is hidden while nothing is unresolved and otherwise shows the unresolved count.
  Its drawer lists each issue with severity, a plain-language explanation, the affected viewport, the target or component identity, when it was last seen, and its lifecycle state, plus per-issue **Reveal** (highlight it in the artifact) and **Dismiss** actions.
  Nothing is selected by default.
  You pick issues (or **Select all**), and **Queue selected fixes** turns that whole group into one ordinary queued prompt, tagged `layout-warnings`, that reaches the agent through the normal feedback path when you send.
  Detection never returns `showme poll` and never wakes an agent.
  Only you queueing a fix does.
  The one exception is a fatal `artifact_failures` response, for failures that make the review itself unusable, such as the artifact document or one of its own local assets failing to load.
- **Layout issue lifecycle** - Each issue is identified by a stable fingerprint of the diagnostic rule, the normalized target identity, and the viewport class, so repeat detections update one record instead of inflating the count.
  `Open` means the latest completed check for its viewport still detects it.
  `Queued for fix` means you asked for a repair.
  It stays unresolved and counted, and cannot be queued again while that request is outstanding.
  `Resolved` requires a newer successful artifact load plus a complete check at the same viewport that no longer detects it.
  It then leaves the count but keeps a bounded history.
  `Still present` (recurring) means a queued issue survived a newer revision, so it is selectable again with its earlier attempt retained.
  `Unverified` means a reload or check failed or was incomplete, so the prior issue was preserved rather than cleared.
  `Returned` means a resolved issue came back on a later revision.
  Dismissal applies only to the current artifact revision.
  A later revision surfaces the issue again if it is still detected.
  A check at one viewport never clears an issue found at another, and a viewport removed from the configured diagnostic set (`SHOWME_DIAGNOSTIC_VIEWPORTS`, default all) is marked obsolete with an explicit reason rather than reading as fixed.
- **Local assets** - Copy local images, CSS, fonts, and scripts next to the HTML artifact and reference them with relative paths from that directory.
  Root-prefixed paths such as `/assets/logo.png` will not resolve through Showme's artifact route.
- **Export** - `showme export` writes `<name>.export.html` by inlining local assets only, stripping the annotation SDK, and leaving remote CDN and font references as links that still need network access to render.
  The export makes no outbound request of its own.
  It only reads files from disk, confined to the artifact's own directory, and absolute `file://` paths outside safe inlined asset references are redacted before output.
  Per-asset and per-bundle inline caps default to 10 MiB and 25 MiB, overridable with `SHOWME_EXPORT_MAX_ASSET_BYTES` and `SHOWME_EXPORT_MAX_BUNDLE_BYTES`.
  Unresolved local assets, or export notices such as author-set CSP meta tags and redacted file URLs, are surfaced in command or browser output.
  You can also export from the browser chrome's overflow menu.
- **Live reload** - Showme watches the HTML artifact file by default and preserves review context across reloads: the artifact iframe scroll position, an open annotation card's unsent text, and answers to `data-showme-question` controls (application-owned form state is left alone).
  Unsent annotation text also survives a full reload of the review page itself.
  While a queued layout-issue batch is outstanding, closely spaced saves coalesce so one batch of fixes costs one refresh.
  To also reload on sibling asset changes, add `data-showme-live-reload-root` to the root element or `<meta name="showme-live-reload" content="root">`.
  If the element an unsent annotation was attached to is gone from the artifact for good, Showme cannot reopen that card, so it writes your text into the conversation panel under **Unsent annotation**.
  That copy is selectable, is never written over anything you have typed, and is kept across reloads.
  No note is ever dropped to make room for a newer one, and a note the browser refuses to store says so where it is shown.
- **Feedback controls** - Native controls (radios, checkboxes, inputs, selects, buttons, labels, disclosure summaries, contenteditable) are interactive automatically, so they do not need `data-showme-action`.
  For reversible choices, let option clicks update local state, then queue exactly one final answer from a per-question submit or Queue answer button with `window.showme.queuePrompt()`.
  Mark only custom (non-native) clickable elements with `data-showme-action` so Showme does not annotate them, and use `data-showme-question` or `queueKey` when pre-send updates for the same question should replace each other.
  On wider screens, queued annotation preview pills and chat history share a scrollable Conversation panel above a sticky composer, so long feedback queues do not push the text box or send controls off screen.
  The browser chrome keeps editing actions in the overflow menu (copy path, reload artifact, copy DOM snapshot, export standalone HTML, end session), while the composer exposes **Send & End** beside **Send to Agent** to submit queued prompts and user-ended attribution together.
- **Narrow windows** - Below 860px wide, the artifact takes the whole screen above a **Conversation** dock, and the conversation opens as a bottom sheet over it.
  Tap the dock, swipe it up, or press the chevron to raise it; tap the dimmed artifact, swipe the sheet down, press the chevron, or press Escape to lower it.
  The dock reports what matters while the sheet is down, such as how many prompts are queued, a reply that arrived while you were reading, or whether the agent is listening, and the sheet stays open across a reload of the review page.
  The sheet sizes itself to the visible viewport and respects safe-area insets.
  If the keyboard or attachments leave little room, conversation content yields or scrolls while the send actions remain pinned above the bottom edge.
  In landscape the sheet covers the top bar as well.
  Wider windows keep the side-by-side layout.
- **Keyboard shortcuts** - In the chrome composer, Enter sends queued prompts and Shift+Enter inserts a newline.
  In the annotation card, Enter queues the annotation, Shift+Enter inserts a newline, and Ctrl+Enter (Cmd+Enter on macOS) queues it and sends all queued prompts immediately.
  Escape closes the card, same as Cancel, but only while it is empty (no text, no attachment).
  With unsent text or an attachment present, Escape does nothing rather than risk discarding it.
  Cmd+I or Ctrl+I toggles between annotate and explore mode from either the browser chrome or the artifact iframe, including while focus is in a textarea or control.
- **Agent presence** - The browser shows when no agent is listening, keeps queued feedback for the next successful `showme poll` send even across reloads, and keeps human feedback actions available while the agent is working because the server queues them for the next poll.
  The agent's reply (`--agent-reply`) concludes delivered work and returns presence to waiting.
  The no-timeout poll always writes an immediate stderr banner so it is visibly not hung.
  It adds the periodic stderr wait ticks only in an interactive terminal, so when stderr is piped (as under agent harnesses) the captured output carries no tick noise.
  Stdout always stays reserved for the final response.
  If the poll is interrupted or times out before feedback arrives, re-run it, because feedback remains queued until delivery.
  Poll delivery consumes the response, so read the complete response before truncating or filtering it.
  Codex-specific guidance keeps that poll attached to the active turn instead of hiding it in a background task, because completed background tasks may not resume the agent.
- **Session end etiquette** - Showme tracks who ended a session.
  A human clicking **End session** (or **Send & End**) in the browser is a user-initiated end, while `showme end <html-file>` is agent-initiated.
  When either side ends the session, every open review tab becomes visibly read-only and disables its feedback controls, and feedback submitted after the end is refused instead of being accepted with no agent to receive it.
  A plain `showme <html-file>` after a user-initiated end refuses to reopen the browser and returns guidance instead.
  Pass `--reopen` only when the user asks for further review or something important needs their visual attention.
  Agent-initiated ends keep reopening normally.
  `showme poll`'s `ended` response, and the `feedback` response for the final batch before an end, both carry `next_step` guidance telling the agent to stop polling and deliver remaining updates in chat instead of reopening.
- **Precise targets** - Text annotations include selected text plus range anchors, and text selections carry those anchors only.
  Clicking an element inside a table also carries the cell's visible row and column names alongside the exact CSS locator, so filtered or sorted rows do not make feedback look misdirected.
  When merged cells make either name ambiguous, Showme leaves that name out rather than guessing.
  An explicit `<th scope="row">` remains authoritative even when a `rowspan` makes the row's position ambiguous.
  The CSS locator still points at the exact element you clicked, so an annotation with an omitted name is only less descriptive, never mislabelled.
- **Image attachments** - Attach reference images (PNG, JPEG, WebP) in either the Conversation composer or an annotation card by pasting, drag-dropping, or using its image picker.
  Each image shows a thumbnail chip with upload, remove, retry, and error states.
  A paste containing both text and images preserves the text while attaching the images (a copied file's own name or path is treated as placeholder and not pasted).
  Conversation messages may contain text and images together, or images only.
  Images are stored under the state dir, and the queued prompt carries a server-generated absolute `path` and content-hash `id` (plus mime and dimensions) rather than the raw bytes, so `showme poll` hands the agent a local file path to open.
  Limits are `SHOWME_MAX_ATTACHMENT_BYTES` (default 10 MiB per image), `SHOWME_MAX_ATTACHMENTS_PER_PROMPT` (default 4), and `SHOWME_MAX_PROMPT_ATTACHMENT_BYTES` (default 25 MiB per prompt).
  If any image is missing or any prompt breaches a count or byte cap, the entire send batch is rejected, the queue is preserved, and the reason is surfaced in the composer rather than silently dropping images.
  As a browser-side abuse guard, each chrome page allows 30 upload attempts per rolling minute, 4 uploads in flight at once, and 256 MiB of attempted image bytes over its lifetime.
  Rejected uploads stay visible for retry or removal.
  Attachments are cleaned up by `SHOWME_ATTACHMENT_TTL_MS` (default 7 days; `0` or `off` disables), but only once no pending prompt still references them, and `SHOWME_MAX_ATTACHMENT_DISK_MB` (default 512 MiB; `0` or `off` disables) caps total attachment disk.
  The cap is enforced when an image is uploaded, not just periodically.
  The upload first reclaims unreferenced files (oldest first, and never one added within the last hour), and if it still would not fit, that upload is refused with a storage-full error on its chip instead of discarding an image you are about to send.
- **Mermaid diagrams** - Whiteboards are an opt-in.
  Agents author a diagram as Mermaid only when you ask for an editable whiteboard, and hand-authored inline SVG illustrations are the default figure medium otherwise.
  In the Showme browser, every rendered Mermaid diagram in a `.mermaid` container becomes an embedded editable Excalidraw whiteboard.
  Click a diagram to unlock editing, and use its Fullscreen action to edit it over the whole viewport.
  Whiteboard scenes autosave locally.
  If a live reload changes the Mermaid source, an unmodified whiteboard silently re-converts to the new diagram.
  If you had edited the scene, reopening it lets you re-convert and discard the saved edits, or keep editing the saved scene.
  Use **Queue feedback** to add a bounded edit summary plus local `.excalidraw` scene and PNG preview paths to the Conversation panel, then click **Send to Agent** to deliver it.
  The agent updates the artifact's Mermaid source, which remains authoritative.
  Flowchart, sequence, class, ER, and state diagrams convert to editable shapes.
  Other diagram types are images that you can draw on and annotate.
  Showme changes only the browser view, so saved, standalone, and exported artifacts still render plain Mermaid.
- **Server cleanup** - The detached server stops after the last session ends when nothing is connected, or after `SHOWME_IDLE_TIMEOUT_MS` (default 30 minutes) with no browser or poll connections.
  Set `SHOWME_IDLE_TIMEOUT_MS=0` or `off` to disable idle self-shutdown.
- **Server upgrades** - One background server serves every session, so rebuilding Showme while reviews are open makes the next `showme <html-file>` replace that server.
  Only the review page for the artifact being opened reloads itself once the replacement answers, and not even that one while you have unsent annotation text open, which gets a banner instead so the reload is yours to make.
  Every other open review page keeps working and shows a banner reading "Showme was updated. This page is running the previous version.", with a Check and reload button and a Dismiss button, so no page you are reading reloads on its own.
  After `showme stop` those pages say Showme was stopped and to reload after you start it again, and a restart that only picks up a local build says that rather than claiming an update.
  Every **Check and reload** control asks the server whether it is running before it navigates.
  While nothing answers, the page stays where it is and says so, and a check that gets no answer at all says that instead of guessing.
  In-flight `showme poll` commands end with an interrupted-poll error and are safe to re-run.
  Queued feedback is never lost, and annotation text you have typed but not queued yet survives the reload as described under **Live reload**.
  A page waits for the replacement rather than reloading into a port nothing is listening on, and tells you to restart Showme if it never returns.
- **Local-first state** - Session state stays under `~/.showme/` by default, or `SHOWME_STATE_DIR` when set.
- **Diagnostic viewports** - `SHOWME_DIAGNOSTIC_VIEWPORTS` sets which viewport classes the layout-issue inbox tracks (`mobile`, `compact`, `desktop`; comma-separated, default all).
  Warnings whose class leaves the set are marked obsolete with an explicit reason instead of silently reading as fixed.
- **Server port** - Set `SHOWME_PORT` to choose the server port.
  It defaults to `4387`.
- **Network binding** - The review server listens on loopback (`127.0.0.1`) only, so nothing on your network can reach it.
  Wildcard values such as `0.0.0.0` or `::` are reduced to loopback and are never listened on.
  Setting `SHOWME_HOST` to one explicit non-wildcard address changes that single bind address.
  Binding beyond loopback exposes an unauthenticated server that can read and serve arbitrary local files to anything that can reach it, so only do that on a network you trust.
  `SHOWME_LINK_HOST` controls the hostname written into session links.
- **Allowed hosts** - To defend against DNS rebinding (a trick where a hostile web page points its own domain at your loopback port), the server rejects (`403`) any request whose `Host` header is missing or not one it answers to: loopback names, plus the concrete bind address and link host.
  If you configure a reverse proxy or another intentional hostname, list it in `SHOWME_ALLOWED_HOSTS` (whitespace-separated).
  Behind a reverse proxy, the forwarded `X-Forwarded-Host` is validated against the same list, so add the public hostname there and have the proxy send it together with `X-Forwarded-Proto`.
  Set `SHOWME_ALLOWED_HOSTS` to `*` to disable the check entirely, only when the server sits behind your own authentication or proxy.
  Mutating routes also reject a present foreign `Origin` or `Referer` (`403`); header-less CLI control requests remain allowed where supported.
- **Browser opening** - Set `SHOWME_NO_OPEN=1`, equivalent to `--no-open`, to create or resume a session without launching a browser window.

## CLI Reference

| Command                     | Description                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showme`                    | Show current sessions and usage guidance.                                                                                                                                                                                                                                                                                                    |
| `showme <html-file>`        | Open or resume a Showme session, with the open-time layout gate enabled by default. Unresolved layout issues from earlier in the session are preserved. Refuses to reopen a session the user explicitly ended from the browser unless `--reopen` is passed.                                                                                  |
| `showme poll <html-file>`   | Long-poll until the user sends feedback or ends the session; detected layout issues wait in the user's Layout issues inbox and arrive only when queued. Leave no-timeout polls running, or re-run them if interrupted. Codex guidance keeps polls attached to the active turn. On `status: ended`, stop polling and do not reopen uninvited. |
| `showme end <html-file>`    | End a session as the agent; unlike a user-initiated end from the browser, this still allows a plain reopen later.                                                                                                                                                                                                                            |
| `showme export <html-file>` | Write a portable copy of the artifact: one HTML file with its local assets inlined, so it opens with no server and no sibling files. Remote CDN and font references are left as links.                                                                                                                                                       |
| `showme stop`               | Shut down the background server.                                                                                                                                                                                                                                                                                                             |
| `showme playbook [id]`      | List focused artifact guidance or show one playbook; agents must open each matching playbook before writing HTML.                                                                                                                                                                                                                            |
| `showme design`             | Show agent-facing design guidance, including optional CDN snippets and the whiteboard (Mermaid) opt-in snippet.                                                                                                                                                                                                                              |
| `showme setup hooks`        | Install or repair optional SessionStart hooks for Claude Code, Codex, OpenCode, and GitHub Copilot CLI; restart the agent session afterward.                                                                                                                                                                                                 |
| `showme setup plugin`       | Register this checkout as an [Agent Plugin](https://agent-plugins.org) in VS Code, Cursor, and GitHub Copilot CLI; opt-in, idempotent, no marketplace involved. Reload each client afterward.                                                                                                                                                |
| `showme server`             | Run the local Showme server.                                                                                                                                                                                                                                                                                                                 |
| `showme update`             | Refuses. This is a local checkout, not an npm package. Update with `git pull`, then `pnpm install && pnpm run build`.                                                                                                                                                                                                                        |

Known playbook IDs: `diagram`, `table`, `comparison`, `plan`, `code`, `input`, `slides`.
One artifact often combines several playbooks, such as a plan that includes a comparison and a diagram, so agents must match against each `use_when` trigger and open every matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, open the diagram playbook for the recommended tooling and SVG guidance.

### Flags

| Command              | Flag                  | Description                                                                                                                                                                                                             |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showme <html-file>` | `--no-open`           | Ensure the server and session exist without opening another browser window.                                                                                                                                             |
| `showme <html-file>` | `--no-gate`           | Skip the open-time layout curtain for this browser open.                                                                                                                                                                |
| `showme <html-file>` | `--reopen`            | Reopen a session the user explicitly ended from the browser; without it, a plain open refuses and explains why instead of reopening uninvited.                                                                          |
| `showme export`      | `--out <path>`        | Write the export to a specific path instead of `<name>.export.html` next to the source.                                                                                                                                 |
| `showme poll`        | `--agent-reply "..."` | Show the agent's reply in the existing browser chat, conclude delivered work, and return presence to waiting before polling again.                                                                                      |
| `showme poll`        | `--timeout-ms <ms>`   | Test and debug escape hatch only; agents should normally omit it and leave the long poll running.                                                                                                                       |
| `showme stop`        | `--port <port>`       | Shut down a server running on a non-default port.                                                                                                                                                                       |
| `showme server`      | `--port <port>`       | Run the server on a non-default port.                                                                                                                                                                                   |
| `showme server`      | `--verbose`           | Log session and watcher events to stderr; can also be enabled with `SHOWME_DEBUG=1`. Detached server output is appended to `~/.showme/server.log` (or `SHOWME_STATE_DIR/server.log`) for startup and crash diagnostics. |

## Environment Variables

Every `SHOWME_*` setting that changes how Showme behaves when you run it.
The build- and test-only variables (`SHOWME_BUILD_VERSION`, `SHOWME_BROWSER_E2E`) are covered under Development instead.

| Variable                             | Default                | What it does                                                                                                          |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SHOWME_HOST`                        | `127.0.0.1`            | The one address the server binds. Wildcards are reduced to loopback. Anything else exposes an unauthenticated server. |
| `SHOWME_PORT`                        | `4387`                 | Server port.                                                                                                          |
| `SHOWME_LINK_HOST`                   | the bind host          | Hostname written into session links.                                                                                  |
| `SHOWME_ALLOWED_HOSTS`               | none                   | Extra `Host` header values the rebinding guard accepts, whitespace-separated. A lone `*` disables the guard.          |
| `SHOWME_STATE_DIR`                   | `~/.showme`            | Where session state, whiteboard scenes, attachments, and `server.log` live.                                           |
| `SHOWME_NO_OPEN`                     | unset                  | `1` behaves like `--no-open` and suppresses the browser launch.                                                       |
| `SHOWME_DEBUG`                       | unset                  | `1` behaves like `showme server --verbose`.                                                                           |
| `SHOWME_IDLE_TIMEOUT_MS`             | `1800000` (30 minutes) | Idle self-shutdown budget. `0` or `off` disables it.                                                                  |
| `SHOWME_DIAGNOSTIC_VIEWPORTS`        | all                    | Which viewport classes the layout-issue inbox tracks: `mobile`, `compact`, `desktop`, comma-separated.                |
| `SHOWME_EXPORT_MAX_ASSET_BYTES`      | 10 MiB                 | Largest single local asset `showme export` will inline.                                                               |
| `SHOWME_EXPORT_MAX_BUNDLE_BYTES`     | 25 MiB                 | Largest total inlined payload in one export.                                                                          |
| `SHOWME_MAX_ATTACHMENT_BYTES`        | 10 MiB                 | Largest single attached image.                                                                                        |
| `SHOWME_MAX_ATTACHMENTS_PER_PROMPT`  | `4`                    | How many images one prompt may carry.                                                                                 |
| `SHOWME_MAX_PROMPT_ATTACHMENT_BYTES` | 25 MiB                 | Total image bytes one prompt may carry.                                                                               |
| `SHOWME_ATTACHMENT_TTL_MS`           | 7 days                 | How long unreferenced attachments are kept. `0` or `off` disables cleanup.                                            |
| `SHOWME_MAX_ATTACHMENT_DISK_MB`      | 512 MiB                | Total disk attachments may occupy. `0` or `off` disables the cap.                                                     |

## Development

```sh
pnpm run check          # Run all verification commands
pnpm run build          # Bundle the CLI, chrome, and design assets into dist/
pnpm run build:skill    # Regenerate skills/showme/SKILL.md
pnpm run build:plugin   # Regenerate the Agent Plugins and Codex manifests
pnpm test               # Run node:test tests
pnpm run lint           # Run ESLint
pnpm run format:check   # Check Prettier formatting
pnpm run typecheck      # Run TypeScript checkJs validation
```

The real-browser test suites are opt-in and need `chrome-devtools-axi`:

```sh
SHOWME_BROWSER_E2E=1 node --test test/layout-audit-browser.test.js
```

## License and credit

MIT.
This is a local fork of **lavish-axi** by Kun Chen, used under the MIT license.
The original copyright notice is preserved verbatim in `LICENSE`, and `CHANGELOG.md` is upstream's history.
Third-party dependency notices are in `THIRD-PARTY-NOTICES.md`.
