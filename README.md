# Career-Ops for Beginners — HTML Slide Deck

A 60-minute workshop deck for high-school seniors who have never used a terminal.

## Open the slides

Open `index.html` in Chrome, Edge, or Safari. The deck does not require a package installation, build step, or network connection for presenting.

Controls:

- `←` / `→`, `Page Up` / `Page Down`, or `Space`: change slides
- `Home` / `End`: jump to the first or last slide
- `O`: toggle overview
- `N`: toggle speaker notes
- `F`: toggle fullscreen
- `Esc`: leave overview or fullscreen

The URL hash points to a slide number. For example, `index.html#14` opens the hands-on demo.

## Full command demo

Watch the complete Career-Ops command walkthrough on YouTube:

https://youtu.be/vQASKFsXKU0?si=d-p91u8i8uJrTeWt

## Demo candidate

The workshop uses a fictional candidate named Andrew Pham so students can test Career-Ops without sharing personal information.

- Markdown: `handouts/andrew-pham-demo-profile.md`
- PDF: `handouts/Andrew-Pham-demo.pdf`

This profile is test data. It must never be submitted to an employer or represented as a student's own education, skills, projects, or experience.

## Demo screenshots

The deck includes all 21 setup and command screenshots from the workshop demo. Click any screenshot in the deck to open its full-resolution version in a new browser tab.

The complete file mapping is in `assets/screenshots/README.md`.

## Prepare the workshop

- Keep the Andrew Pham Markdown and PDF handouts available for onboarding.
- Save all three job descriptions as text in case a live posting expires.
- Rehearse setup and the `auto-pipeline` prompt on the presentation computer.
- Never store a real API key, CV, or output containing personal data in this slide repository.
- Speaker notes total exactly 60 minutes.

## Export to PDF

Open `index.html`, choose Print, enable **Background graphics**, select Landscape, and save as PDF. The print stylesheet produces one 16:9 slide per page.

## Verify

```powershell
npm test
npm run verify
```

The tests use Node.js built-ins and download no dependencies.
