# Repository instructions

MrCarlsama Canvas is a desktop-first, local-first infinite canvas for character
photography planning.

## Architectural boundaries

- `packages/core` owns the canonical project, node, frame, edge, and saved-view
  models. It must not import Vue, X6, Tauri, SQL, or filesystem APIs.
- `packages/card-sdk` owns public card contracts and registration. Built-in
  cards use the same public API as third-party cards.
- `packages/editor-x6` adapts canonical canvas state to AntV X6. X6 graph JSON
  is never the persisted source of truth.
- `packages/assets` owns asset metadata, hashing, virtual collections, and
  storage ports. Binary files remain outside SQLite.
- `packages/studio` composes product workflows. UI components do not execute
  SQL directly.
- `apps/desktop` is the Tauri shell and composition root.

## Product invariants

- One project has one infinite canvas with any number of root nodes.
- Frames organize content; they are not additional canvases.
- Unknown card payloads must round-trip without data loss.
- AI is optional and must remain outside the core editing path.
- Imported assets are managed copies and deduplicated by SHA-256.
- Moving an asset between collections never moves or duplicates its file.
- Local data formats are versioned and migrations are forward-only.

## Engineering rules

- Prefer boring data structures and explicit boundaries.
- Keep domain packages deterministic and testable without a browser or Tauri.
- Do not introduce compatibility shims without a real compatibility need.
- New persisted fields require a migration and a round-trip test.
- Never log API keys, source media paths, or user content.
- Run `pnpm check` before submitting a change.
