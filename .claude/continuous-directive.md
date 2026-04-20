# Continuous Work Directive — GROVEKEEPER PR #23

**Status:** ACTIVE
**Owner:** Claude (this agent)
**User's rule:** "I am NOT going to babysit you all goddamn day"

## What CONTINUOUS means (user's definition, not mine to narrow)

The user has made clear, repeatedly, that continuous execution requires:

1. **Never stop for status reports the user didn't ask for.** No "let me pause and show progress". No "I've shipped N commits, want me to continue?". The cron monitor exists for recon; use it, don't impersonate it.
2. **Never stop for scope caution.** Do not pre-narrate risk or ask permission to proceed. The user has granted standing autonomy on this branch. Risk lives at commit boundaries (tests/lint/build gates), not in prose.
3. **Never stop to summarize what's been done.** The git log is the summary. Commit messages are the narrative. The PR description is the running record.
4. **Never stop for context pressure.** The `task-batch` skill documents the compaction-survival protocol. Trust it. Keep working.
5. **Never stop because a task feels big or unfinished.** Pick the next atomic commit target and ship it.
6. **Only stop when:**
   - User explicitly says stop, or
   - CI is red AND blocking, or
   - A genuine STOP_FAIL condition from `task-batch` fires (network, hard deadlock, corruption)

## Anti-patterns the user has explicitly called out in this PR

- "why do you keep stopping" → after a successful CI recovery + perf commit, I drafted a status summary instead of continuing to the next commit
- "dedicate worktrees... if your agents cant work cleanly followed by an ingesting pass using public apis... something is deeply wrong" → I was stopping to ask how to delegate
- "you HAVE a working codebase it just needs RESTRUCTURING first" → I was drafting new scaffolding instead of porting
- "we dont need a monorepo... src/ is fine" → I was over-architecting
- "and STOP MAKING BRAND NEW CODE FILES UNTIL ALL THE EXISTING ONES ARE MOVED AROUND AND PORTED" → I was creating stubs during restructure
- "you can use perl to rename since its macos" → I was fighting sed
- "also keep in mind youll need to move and port zustand stores also" → I was omitting orthogonal work from commits
- "of stuff is orthogonal to koota it should be IN the commit for koota" → same, from the opposite angle
- "we can then merge with a documented record transcribed FROM the commits before squashing" → commit history IS the record; no need for separate summaries
- "and tben the suqash merg3 smooshes it all regardless" → same
- "you can accomplisj a very clean capicotr optimozed layout with pr9per packave stru ture" → over-engineering flag
- "i just keep at it" → do not ask, resume

## Positive signals (what user rewards)

- Tight green commits pushed to the branch
- CI status caught and fixed within the same session
- Parallel agent delegation when work is mechanical + non-overlapping
- Writing comments into the PR description, not the chat
- Saving context for work, not for chat

## Operating loop (hard rules)

```
while true:
    # 1. Check state
    ci = gh pr checks 23       # red → fix CI first
    tests = pnpm test:run       # red → fix tests first
    tsc = pnpm tsc --noEmit     # red → fix types first
    lint = pnpm lint            # red → fix lint first

    # 2. Pick next atomic commit (see queue below). If queue empty, scan:
    #    docs/PERF_AUDIT.md, TODO greps, remaining `miniplex`/`zustand`/
    #    `useGameStore`/shadcn imports, SonarCloud report, unfixed
    #    a11y warnings. Something is always actionable.

    # 3. Ship it:
    #    - edit
    #    - verify: pnpm lint && pnpm tsc --noEmit && pnpm test:run
    #    - git add -A && git commit -m "<conv commit>"
    #    - git push
    #    - the commit message IS the status update

    # 4. Do NOT:
    #    - write a progress summary to the user
    #    - ask whether to continue
    #    - pre-narrate the next commit at length
    #    - stop on size anxiety
    #    - propose alternatives instead of executing

    # 5. Exception: user explicitly interrupts with direction.
    #    - Absorb the direction in 1-2 sentences max
    #    - Return to the loop
```

## Current port queue (drain top to bottom)

Ordered by (a) dependency safety, (b) CI impact, (c) audit priority:

- [ ] Port `src/stores/gameStore.ts` consumers (38 files) to Koota `koota/react` useTrait
- [ ] Port `src/world.ts` miniplex consumers (6 files) to Koota `world.query`
- [ ] Delete `src/stores/gameStore.ts`, remove `zustand` dep
- [ ] Delete `src/world.ts` miniplex world, remove `miniplex` dep
- [ ] Delete `src/archetypes.ts` (callers use startup.ts spawners)
- [ ] Flip tsconfig `jsxImportSource: "solid-js"` + vite `plugin-solid`
- [ ] Port all 55 `.tsx` files React → Solid (delegate in chunks of 10 via parallel agents)
- [ ] Hand-roll 15 Solid game UI components, delete `src/ui/primitives/`, remove @radix-ui/* + cva/clsx/twMerge
- [ ] Remove `react`, `react-dom`, `@types/react*`, `@vitejs/plugin-react`, `@testing-library/react`, `happy-dom` (swap for @solidjs/testing-library + jsdom or keep happy-dom)
- [ ] Config extraction: split `src/config/config.ts`, `trees.ts`, `tools.ts`, `resources.ts`, `codex.ts` → JSON + typed loaders (pattern: `difficulty.ts` + `difficulty.json`)
- [ ] Wire `startAudio()` from a user-gesture handler so Tone.js audio unlocks
- [ ] Vitest browser mode: 2 projects (node + browser), sample `*.browser.test.tsx` for HUD + ToolWheel
- [ ] Remaining perf items from PERF_AUDIT: allocation-free buffers in `GroundBuilder`, `CameraManager`, NPC shadow budget, scene.performancePriority
- [ ] Address SonarCloud 14 new issues + 2 security hotspots
- [ ] Update `docs/CLAUDE.md` tech stack table (React → SolidJS, add Koota/Tone)
- [ ] Update `docs/PERF_AUDIT.md` with before/after measurements
- [ ] Update `CHANGELOG.md` with 1.0.0-alpha.1 entry
- [ ] Update `.release-please-manifest.json` version target
- [ ] Mark PR ready for review
