# TRIBE_AGENTS_PLAN.md

## Purpose

Define the first implementation plan for a dedicated Tribe sub-agent without polluting the main assistant context.

## Ground Rule

Everything related to Tribe should live inside this repository:

- plans
- documentation
- context files
- local Tribe skills
- operational work

Canonical location:

`~/.openclaw/workspace/tribe`

## Phase 1 Goal

Create the Tribe sub-agent first, plus the communication protocol with Emiliano.
Do **not** optimize skills first.
Get the agent operating in a clean, isolated way, then design skills from real usage.

## Why this order

1. Define the operational unit first.
2. Keep Tribe context out of the main assistant session.
3. Learn from real workflows before over-designing skills.
4. Let the future skills emerge from repeated tasks.

## Phase 1 Scope

### Build
- A dedicated Tribe sub-agent.
- A dedicated subthread / persistent working context for Tribe.
- A clear communication protocol between Emiliano and the Tribe agent.

### Not yet
- No large skill suite yet.
- No over-engineered automation yet.
- No premature split into multiple Tribe agents yet.

## Initial Mission of the Tribe Agent

The Tribe agent exists to help operate Tribe across three broad domains:

1. Content generation for Instagram / reels
2. Import quotation support
3. Project / build research

At the beginning, it should function as a specialist generalist for Tribe, not as multiple micro-agents.

## Communication Model

### Expected interaction style
The Tribe agent should:

- ask only the minimum necessary questions
- use existing repository context before asking obvious things
- turn raw media + answers into structured deliverables
- stay close to Tribe's premium, technical, obsessive brand tone

### Typical input from Emiliano
- media sent over Telegram
- quick answers to key project questions
- links to products or builds
- requests for quotations
- research prompts for parts / platforms / project directions
- YouTube links for music / audio references when needed for content production

### Typical output from the Tribe agent
- reel brief
- content plan
- caption / CTA draft
- quote draft with assumptions
- project research summary
- build recommendation options

## Content Operational Workflow

### Supported content requests
The Tribe agent should initially support these content request types:

- branding of images
- photo reel
- reel

Later, this can expand to caption-only, stories, carousels, and other formats.

### Content workflow loop

1. Emiliano sends a Telegram message requesting a content task.
2. Emiliano attaches the relevant media (photos, videos, or both).
3. Emiliano may also provide a YouTube link for the desired audio reference.
4. The Tribe agent asks only the minimum missing questions.
5. The Tribe agent uses the existing `tribe` repository workflows, examples, and assets to generate the content.
6. The Tribe agent sends the draft back to Emiliano via Telegram.
7. Emiliano reviews it and gives feedback.
8. The Tribe agent iterates until approved.
9. Once approved, the Tribe agent sends back:
   - the final media asset
   - the final caption for publication

### Minimum missing questions allowed
The Tribe agent should only ask questions when key context is missing, such as:

- what project this belongs to
- what should be highlighted
- whether the goal is brand, sales, or both
- whether there is a CTA
- whether there is a deadline or urgency
- whether a specific audio reference should be used

### Content working principle
The Tribe agent is not just an ideation assistant.
It is a production-oriented content operator that turns media + context + feedback into final deliverables.

## Audio Handling for Content

### Accepted audio input
For content work, Emiliano may provide:

- a YouTube URL to use as music or audio reference
- a direct audio preference or track reference

### Required behavior
When a YouTube link is provided for a content request, the Tribe agent should:

1. download or extract the audio
2. store it inside the `tribe` repository
3. place it in the appropriate music location for reuse or project association
4. reference and use it in the relevant reel or draft if applicable

### Repository rule for audio
Audio used for Tribe content should live inside the `tribe` repo, not outside it.

Default location:

- `tribe/assets/music/` for reusable or general music assets

If later needed, the music structure can evolve into more specific conventions such as reusable vs project-specific audio.

## Escalation Rules

The Tribe agent should escalate to Emiliano when:

- critical pricing assumptions are missing
- commercial promises could create risk
- technical compatibility is uncertain
- content is ready for approval
- a decision affects brand positioning or customer trust

## Phase 2 Preview

Once the sub-agent is working well, define focused Tribe skills inside this repo, likely including:

- `tribe-content`
- `tribe-quoting`
- `tribe-research`

These should be created from repeated real workflows, not from guesses.

## Working Principle

Start simple:

- one Tribe sub-agent
- one clean communication model
- one canonical repo for all Tribe context

Then split into multiple skills or agents only if usage proves the need.
