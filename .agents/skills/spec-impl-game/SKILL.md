---
name: spec-impl-game
description: Implements an approved game spec exactly like /spec-impl (same phases, same rules), then runs the skin-designer agent and, after it finishes, the mobile-porter agent to audit the freshly implemented game.
disable-model-invocation: true
argument-hint: <NN-spec-name | game-jam/<id>/NN-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(find:*)
---

# /spec-impl-game — /spec-impl for games, plus a skins and mobile audit

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available (including subfolders such as `game-jam/<id>/`):
!`find specs -name '*.md' 2>/dev/null | sort || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

This command is `/spec-impl` with one extra phase at the end. **Do not re-invent the implementation workflow.**

### Phases 1–4 — Run /spec-impl

1. Read `.agents/skills/spec-impl/SKILL.md` with the Read tool.
2. Follow its Phases 1, 2, 3 and 4 **exactly as written**, with `$ARGUMENTS` as the argument. Its session-context section is already resolved above (use that output; its `!` commands do not run when read from the file). All its rules apply unchanged: the Approved-only gate, the dirty-tree check, never committing automatically, pausing after every step, stopping on ambiguities and refusing out-of-scope work.
3. Only two adjustments for game specs:
   - **Phase 1:** also look for the spec inside subfolders of `specs/`. The user may write `game-jam/papilla/02-motor`, `papilla/02-motor`, or just the slug when it is unambiguous. If several files match (e.g. `02-motor` exists for more than one game), list them and ask.
   - **Phase 3:** a spec under `specs/game-jam/<id>/` uses the branch `game-<id>` (all specs of the same game share it, so an existing branch means resuming). A spec directly in `specs/` keeps the `spec-NN-slug` name.

If the workflow stops in Phase 1, 2 or 3, or the user abandons the implementation before the last step, **stop there. Do not run Phase 5.**

---

### Phase 5 — Post-implementation audit (skins, then mobile)

Start this phase only after showing the final "✅ All steps of the plan are implemented." message of Phase 4. Do not ask for permission to start it; the user asked for it by running this command.

1. **Gather context** for the agents:
   - The spec path and the game id (the `game-jam/<id>` folder, or the catalog id the spec implements).
   - The game's entry in `components/games/registry.ts` (skins listed, `touch` layout).
   - The files touched on this branch: `git diff --name-only main...HEAD` plus `git status --short`.

2. **Run `skin-designer`** with the Agent tool (`subagent_type: "skin-designer"`). Prompt it to audit the game `<id>` that was just implemented from `<spec path>`, include the context above, and ask it to report which specs it wrote or updated in `specs/skins/`.
   - **Wait for it to finish.** Do not launch anything else while it runs.
   - Summarize its result for the user: the specs written and the main findings.

3. **Only then run `mobile-porter`** (`subagent_type: "mobile-porter"`). Pass the same context plus the summary from `skin-designer`, ask it to audit the game `<id>` and its pages on mobile and as a PWA, and to report which specs it wrote or updated in `specs/mobile/`.
   - Wait for it to finish and summarize its result the same way.

4. If an agent fails or returns nothing useful, tell the user what happened and ask whether to continue with the next step. Do not retry blindly.

5. **Close with:**

   ```
   ✅ Implementation and audit finished.

   Spec:            specs/<path>.md
   Skins audit:     <specs written in specs/skins/, or "no changes needed">
   Mobile audit:    <specs written in specs/mobile/, or "no changes needed">

   Next steps:
     1. Verify the spec's acceptance criteria one by one.
     2. If they pass, update its state to "Implemented" and make the final commit.
     3. Review the new Draft specs; approve them before running /spec-impl on them.
   ```

The agents only write Draft specs; never implement their findings on this branch, and never commit on the user's behalf.

---

## Summary of expected behavior

```
/spec-impl-game game-jam/papilla/02-motor   (state: Approved)

  Phases 1–4  →  Same as /spec-impl, on branch game-papilla
  Phase 5     →  skin-designer runs and finishes → summary
              →  mobile-porter runs and finishes → summary
              →  Final message with next steps

/spec-impl-game game-jam/apagon/01-catalogo  (state: Draft)

  Phase 2     →  ❌ stops with the standard /spec-impl error
              →  No branch, no code, no agents
```
