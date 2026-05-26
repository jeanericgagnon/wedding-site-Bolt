# Branch Triage - 2026-05-25

This note captures the post-cleanup branch inventory after local/remote branch and worktree pruning.

## Local state

- `main` only
- no extra worktrees
- clean and synced with `origin/main`

## Remote survivor map

### Revive carefully

#### `origin/codex/launch-main-p0`

Why keep:
- only 3 unique commits beyond `origin/main`
- still carries meaningful launch/auth/RSVP hardening work

Why not treat as PR-ready:
- overlaps with current `main` in smoke/e2e areas
- likely better as selective salvage than direct merge

Recommended next move:
- salvage the desired parts onto a fresh branch from `main`
- see `docs/launch-main-p0-salvage-plan-2026-05-25.md` for the current salvage split

### Preserve as working history

#### `origin/codex/name-change-form-population-clean`

Why keep:
- still has 7 unique patch-visible commits
- coherent name-change form population/runtime line

Why not treat as cleanup residue:
- not merged
- not an ancestor of `origin/main`
- still diverges in real patch content

Recommended next move:
- preserve as alternate history
- salvage intentionally if name-change work resumes
- see `docs/name-change-form-population-salvage-plan-2026-05-25.md` for the current salvage split

#### `origin/codex/non-registry-live-fixes`

Why keep:
- broad preserved non-registry line
- large stacked history with product, proof, docs, and CI changes

Recommended next move:
- leave preserved unless there is explicit product appetite to resurrect pieces
- see `docs/non-registry-live-fixes-salvage-plan-2026-05-25.md` for the current preservation guidance

#### `origin/brand-phase-5-imagery-system`

Why keep:
- real stacked work, not cleanup residue
- includes focused collaborator/privacy/QR hardening at the tip

Recommended next move:
- preserve until there is clear product/design appetite to revisit

#### `origin/codex/v1-finish-hard-gates`

Why keep:
- distinct hardening branch with unique public safety and launch-proof work

Recommended next move:
- preserve as older hardening history
- see `docs/v1-finish-hard-gates-salvage-plan-2026-05-25.md` for the current preservation guidance

#### `origin/codex/v1-finish-hard-gates-3`

Why keep:
- broader later hardening line
- not safely reducible to `v1-finish-hard-gates`

Recommended next move:
- preserve as later hardening history
- see `docs/v1-finish-hard-gates-3-salvage-plan-2026-05-25.md` for the current preservation guidance

#### `origin/feat/builder-v2-setup-route-skeleton`

Why keep:
- compact, coherent setup funnel feature
- focused to four files and six commits

Recommended next move:
- decide separately whether to revive as a real feature branch
- see `docs/builder-v2-setup-route-skeleton-salvage-plan-2026-05-25.md` for the current revival split

## Summary

Cleanup is complete.

What remains is not hygiene work. The remaining remote branches are preserved product/history lines that need explicit portfolio decisions:

1. salvage and revive
2. preserve as historical work
3. retire for product reasons, not cleanup reasons
