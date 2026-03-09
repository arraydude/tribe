# TRIBE_REPO_STRUCTURE_PLAN.md

## Purpose

Define a scalable repository structure for `tribe` that supports:

- content production
- media intake from Telegram
- iterative review loops
- reusable brand assets
- project-based organization
- internal tools and operational apps
- future Tribe sub-agents and skills

This plan is intentionally practical. It should reflect the real workflow of Tribe, not an abstract ideal.

## Current Problem

The repository currently mixes several different kinds of things at the root:

- business and brand documentation
- raw media assets
- project media folders
- reusable brand assets
- music
- production code
- internal app prototypes
- spreadsheet / operations material

This works at small scale, but it becomes harder to:

- find things quickly
- separate raw vs processed assets
- reuse project context
- let a Tribe sub-agent operate cleanly
- scale content production across many projects

## Design Principles

1. Organize around the actual workflow.
2. Keep one canonical place for each type of artifact.
3. Separate raw, selected, working, and final outputs.
4. Make project folders self-contained when possible.
5. Keep business/docs separate from production assets.
6. Keep reusable brand assets separate from project-specific assets.
7. Keep apps and automation code separate from media.

## Proposed Top-Level Structure

```text
tribe/
├── CLAUDE.md
├── incoming/
├── docs/
├── assets/
├── projects/
├── production/
├── apps/
├── ops/
└── archive/
```

## Top-Level Directory Definitions

### `incoming/`
Temporary intake/staging area for media arriving from Telegram before it is assigned to a project.

Use for:
- newly received photos
- newly received videos
- unsorted content waiting to be mapped to a project

This should be treated as a staging area, not a permanent home.

Lifecycle rule:
- media lands in `incoming/`
- once a project folder is created, the relevant files are moved into that project
- `incoming/` should not accumulate long-term project material

### `docs/`
Business, brand, workflow, and agent-facing documentation.

```text
docs/
├── CLAUDE.md
├── PHOTO_SPEC.md
├── TRIBE_AGENTS_PLAN.md
├── workflows/
├── references/
└── business/
```

Use for:
- identity and business context
- visual/content rules
- agent plans
- process documents
- technical references

### `assets/`
Reusable cross-project assets that are not tied to one specific project.

```text
assets/
├── infinity/
├── logo/
├── watermark/
├── music/
├── templates/
└── fonts/
```

Use for:
- reusable product photography libraries
- logos
- watermark files
- reusable music / audio references
- graphic elements
- reusable branded assets

### `projects/`
The main working area for project-based content and builds.

Each project should get its own folder.

```text
projects/
├── g87-lerda/
├── m2-cs-abel/
├── m5-g90-luis/
├── ranger-raptor/
└── volvo-billet/
```

Each project should gradually follow a common internal structure.

### `production/`
Reusable production systems and cross-project media tooling.

```text
production/
├── video/
└── image-processing/
```

Use for:
- Remotion projects
- image processing scripts

### `apps/`
Internal product/app work for Tribe operations.

```text
apps/
└── order-management/
```

Use for:
- the current `demo/` app
- future internal tools
- POCs that are actual software products

### `ops/`
Operational artifacts not tied to one specific project folder.

```text
ops/
├── spreadsheets/
├── quotations/
└── imports/
```

Use for:
- the Excel source of truth while migration still exists
- operational exports
- business-side working files

### `archive/`
Old, legacy, or superseded material that should not clutter active workflows.

Use for:
- deprecated exports
- old experiments
- retired project material

## Standard Project Structure

Each project under `projects/` should evolve toward this shape:

```text
projects/<project-slug>/
├── README.md
├── context/
├── raw/
│   ├── photo/
│   ├── video/
│   └── audio/
├── working/
├── exports/
├── captions/
└── plans/
```

## Meaning of Project Subfolders

### `README.md`
Short overview of the project:
- what it is
- owner / client
- key parts / brands
- current status
- goals

### `context/`
Non-media context specific to the project:
- build specs
- client notes
- part list
- workshop context
- shoot notes

### `raw/`
Original source material only.

Rules:
- do not overwrite originals
- do not rename destructively unless absolutely needed
- separate `photo`, `video`, and `audio` where possible

### `working/`
Intermediate assets and drafts.
This is the main working area for chosen material, drafts, and iterative production.

Use for:
- shortlisted clips/photos chosen for the piece
- temporary exports
- cropped assets
- rough edits
- branded image variants
- review-ready drafts before final export

### `exports/`
Final output files or versioned final candidates.
This is the canonical final-output location for each project.

Use for:
- final reels
- final photo exports
- final delivery versions sent for review/publication

### `captions/`
Copywriting outputs.

Use for:
- captions
- CTA variants
- hooks
- post copy options

### `plans/`
Planning documents for the piece.

Use for:
- reel plans
- shot lists
- storyline docs
- audio selection notes

## Versioning and Tracking Strategy

The repo should **not** try to track all heavy project media by default.

### Track by default
- docs
- plans
- captions
- project README/context files
- reusable assets
- selected metadata or lightweight project artifacts
- carefully chosen final exports when they are worth preserving in git

### Do not track by default
- large raw project videos
- large raw photo sets
- heavy intermediate renders
- bulky working files
- full project media backups
- content inside `incoming/`
- project media contents inside `projects/` by default

Rule:
This repo is an operational workspace and knowledge base, not the canonical backup for all raw media.
By default, media-heavy contents under `incoming/` and `projects/` should be ignored unless there is a deliberate reason to keep a lightweight or reusable artifact in git.

## Naming Conventions

### Top-level project folders
Use lowercase kebab-case when creating new canonical project directories.

Examples:
- `m5-g90-luis`
- `m2-cs-abel`
- `g87-lerda`
- `ranger-raptor`

Legacy names can remain temporarily during migration, but the target should be normalized names.

### Files
- use lowercase kebab-case for new docs and generated assets when practical
- keep original camera/media filenames inside `raw/`
- use explicit suffixes for outputs such as:
  - `-draft`
  - `-v2`
  - `-final`
  - `-caption`

## Audio Organization

Default cross-project audio location:

```text
assets/music/
```

Suggested future structure:

```text
assets/music/
├── reusable/
├── reference/
└── licensed/
```

Project-specific audio should live in:

```text
projects/<project-slug>/raw/audio/
```

Rule:
- reusable or general music → `assets/music/`
- project-specific audio → inside the project folder

## Where Current Repo Items Would Move

### Docs
- `PHOTO_SPEC.md` → `docs/PHOTO_SPEC.md`
- `TRIBE_AGENTS_PLAN.md` → `docs/TRIBE_AGENTS_PLAN.md`
- future agent docs can live under `docs/AGENTS/`
- `CLAUDE.md` stays in root for now, with a future symlink strategy if needed

### Assets
- `infinity/` → `assets/infinity/`
- `logo/` → `assets/logo/`
- `music/` → `assets/music/`

### Production
- `video/` → `production/video/`

### Apps
- `demo/` → `apps/order-management/`

### Ops
- `Seguimiento compras Tribe.xlsx` → `ops/spreadsheets/`

### Projects
- `m2 g87  - lerda/` → `projects/g87-lerda/`
- `m2_cs/` → `projects/m2-cs-abel/`
- `m5_g90_luis/` → `projects/m5-g90-luis/`
- `ranger_raptor/` → `projects/ranger-raptor/`
- `volvo billet/` → `projects/volvo-billet/`

## Migration Strategy

Do not migrate everything at once.

### Phase A — Planning
- approve the target structure
- approve naming conventions
- confirm asset vs project boundaries

### Phase B — Low-risk moves first
Move only the clearest folders first:
- `demo` → `apps/order-management`
- `logo` → `assets/logo`
- `music` → `assets/music`
- `infinity` → `assets/infinity`
- spreadsheet → `ops/spreadsheets`
- create `incoming/`

### Phase C — Higher-risk moves later
- `video` → `production/video` only after path and symlink audit

### Phase D — Project normalization
Move and rename the project folders one by one.
For each project:
- create target folder
- preserve originals while moving
- add `README.md`
- split into `raw/`, `selected/`, `working/`, `exports/`, `plans/`, `captions/` over time

### Phase E — Update references and scripts
After moving folders:
- update script paths
- update Remotion/public links if needed
- update docs
- update future Tribe agent assumptions
- update `CLAUDE.md` in the same phase/commit as every relevant structural change so the agent context stays accurate

## Recommendation

Start with structure, not mass reorganization.

The first practical move should be to approve:
- top-level folders
- naming conventions
- project folder pattern
- audio placement rules

Only then begin incremental migration.

## Phase 1 Decision Checklist

Before moving files, decide:

- Should `docs/AGENTS/` be introduced now or later?
- Should audio under `assets/music/` be split into reusable vs reference vs licensed from day one?
- Should captions live inside each project or under a central content area? (current decision: per project)
- Should final exports live per project only, or also in a central delivery folder? (current decision: per project)

## Working Principle

The repo should optimize for the real Tribe workflow:

1. media comes in
2. context is attached
3. assets are selected
4. content is produced
5. drafts are reviewed
6. finals are exported
7. outputs remain easy to find later

If a structure does not make that workflow easier, it should be rejected.
