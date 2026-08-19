# Career-Ops Workshop Slide Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 32-slide, offline Vietnamese HTML workshop deck that teaches high-school students how to install and use Career-Ops with OpenCode.

**Architecture:** A single `index.html` contains the visible deck, styling, presenter notes, and navigation runtime. Screenshots remain replaceable local assets under `assets/screenshots/`; a small Node test suite loads the real embedded runtime in a fake DOM and validates navigation plus screenshot fallback behavior.

**Tech Stack:** Semantic HTML, embedded CSS, vanilla JavaScript, Node.js built-in test runner.

**Spec:** Approved plan in the conversation on 2026-08-19.

## Global Constraints

- Exactly 32 primary slides in Vietnamese; commands and URLs remain in English.
- No CDN, build step, network dependency, API key, or real CV content.
- Include 13 command types and 16 supplied demo prompts after excluding `contacto` and `patterns`.
- Use Windows/macOS setup lanes, OpenRouter free, screenshot IDs, presenter notes, overview, fullscreen, progress, and print support.
- `apply` must always be described as draft-only and never as automatic submission.

---

### Task 1: Executable deck contracts

**Files:**
- Create: `tests/deck.test.mjs`
- Create: `package.json`
- Create: `index.html`

**Interfaces:**
- Produces: `window.CareerOpsDeck` with `goTo(index)`, `next()`, `previous()`, `toggleNotes()`, `toggleOverview()`, and `hydrateScreenshot(image)`.

- [ ] Write tests that load the embedded runtime and assert slide navigation, boundaries, notes toggling, overview toggling, and screenshot success/failure states.
- [ ] Run `npm test` and confirm failure because `index.html` or the runtime is missing.
- [ ] Add the minimal 32-section HTML shell and runtime.
- [ ] Run `npm test` and confirm all runtime tests pass.

### Task 2: Workshop content and visual system

**Files:**
- Modify: `index.html`
- Create: `assets/screenshots/README.md`

**Interfaces:**
- Consumes: `window.CareerOpsDeck` and screenshot paths `assets/screenshots/<ID>.png`.
- Produces: 32 rendered slides, stable screenshot IDs, hidden presenter notes, command cards, and copyable prompts.

- [ ] Add failing structural tests for 32 slides, unique slide numbers, screenshot contracts, 16 demo prompts, command coverage, and forbidden command absence.
- [ ] Run `npm test` and confirm the new assertions fail for missing content.
- [ ] Implement the four workshop acts, setup lanes, hands-on checkpoints, command explanations, safety guidance, cheat sheet, and sources.
- [ ] Add embedded responsive/print styling and the screenshot replacement guide.
- [ ] Run `npm test` and confirm the structural suite passes.

### Task 3: Handoff documentation and verification

**Files:**
- Create: `README.md`
- Modify: `index.html`

**Interfaces:**
- Produces: local launch, controls, screenshot replacement, PDF export, and workshop preparation instructions.

- [ ] Add failing tests for accessible slide labels, offline-safe references, and required control help.
- [ ] Run `npm test` and confirm expected failures.
- [ ] Add accessibility labels, control help, source metadata, and README instructions.
- [ ] Run `npm test` and `npm run verify`; inspect output for zero failures.
- [ ] Open the deck in a browser, verify the first/last slides and keyboard navigation, and record any environment limitation honestly.
