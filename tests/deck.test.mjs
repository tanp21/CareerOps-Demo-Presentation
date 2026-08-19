import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'index.html');

function readDeck() {
  return fs.readFileSync(htmlPath, 'utf8');
}

function matches(source, expression) {
  return [...source.matchAll(expression)];
}

class FakeClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name); else this.values.delete(name);
    return next;
  }
  contains(name) { return this.values.has(name); }
}

function loadRuntime(html) {
  const scriptMatch = html.match(/<script id="deck-runtime">([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'embedded deck runtime must exist');

  const slideCount = matches(html, /<section\b[^>]*class="[^"]*\bslide\b[^"]*"/g).length;
  const slides = Array.from({ length: slideCount }, (_, index) => ({
    dataset: { slide: String(index + 1) },
    classList: new FakeClassList(index === 0 ? ['is-active'] : []),
    setAttribute(name, value) { this[name] = value; },
    querySelectorAll() { return []; }
  }));
  const progress = { style: {} };
  const counter = { textContent: '' };
  const prompts = Array.from({ length: 16 }, () => ({ setAttribute(name, value) { this[name] = value; } }));
  const notes = { classList: new FakeClassList(), setAttribute(name, value) { this[name] = value; } };
  const overview = { classList: new FakeClassList() };
  const body = { classList: new FakeClassList() };
  const document = {
    body,
    fullscreenElement: null,
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === '.slide') return slides;
      if (selector === '.screenshot img') return [];
      if (selector === '.follow-prompt') return prompts;
      return [];
    },
    querySelector(selector) {
      return {
        '.progress__bar': progress,
        '.slide-counter': counter,
        '.notes-panel': notes,
        '.overview': overview
      }[selector] ?? null;
    },
    documentElement: { requestFullscreen: async () => {} },
    exitFullscreen: async () => {}
  };
  const window = {
    location: { hash: '' },
    addEventListener() {},
    requestAnimationFrame(callback) { callback(); }
  };
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
  vm.runInContext(scriptMatch[1], context);
  return { api: window.CareerOpsDeck, slides, progress, counter, notes, overview, body, prompts };
}

test('deck has exactly 33 ordered, labelled slides and 60 minutes of notes', () => {
  const html = readDeck();
  const sections = matches(html, /<section\b([^>]*)class="[^"]*\bslide\b[^"]*"([^>]*)>/g);
  assert.equal(sections.length, 33);
  const numbers = sections.map((match) => Number((match[0].match(/data-slide="(\d+)"/) ?? [])[1]));
  assert.deepEqual(numbers, Array.from({ length: 33 }, (_, index) => index + 1));
  sections.forEach((match) => assert.match(match[0], /aria-label="[^"]+"/));
  const minutes = matches(html, /<aside\b[^>]*class="notes"[^>]*data-minutes="([\d.]+)"/g)
    .map((match) => Number(match[1]));
  assert.equal(minutes.length, 33);
  assert.equal(minutes.reduce((total, value) => total + value, 0), 60);
});

test('deck includes the 13 required command types and exactly 16 supplied demo prompts', () => {
  const html = readDeck();
  const required = [
    'auto-pipeline', 'tracker', 'pdf', 'cover', 'apply', 'oferta', 'ofertas',
    'deep', 'interview-prep', 'scan', 'pipeline', 'project', 'training'
  ];
  const commands = new Set(matches(html, /data-command="([^"]+)"/g).map((match) => match[1]));
  assert.deepEqual([...commands].sort(), [...required].sort());
  const prompts = matches(html, /<pre\b[^>]*class="[^"]*\bdemo-prompt\b[^"]*"[\s\S]*?<\/pre>/g);
  assert.equal(prompts.length, 16);
  const promptText = prompts.map((match) => match[0]).join('\n');
  assert.doesNotMatch(promptText, /career-ops contacto/i);
  assert.doesNotMatch(promptText, /career-ops patterns/i);
});

test('screenshot assets have unique IDs and deterministic local paths', () => {
  const html = readDeck();
  const shots = matches(html, /<img\b[^>]*data-shot="([A-Z0-9-]+)"[^>]*src="assets\/screenshots\/([^\"]+)"/g);
  assert.ok(shots.length >= 12, 'at least twelve guided screenshot slots are expected');
  const ids = shots.map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  shots.forEach((match) => assert.equal(match[2], `${match[1]}.png`));
});

test('deck embeds the 19 retained screenshots with readable expansion links', () => {
  const html = readDeck();
  const expectedFiles = [
    'SS-SETUP-02.png', 'SS-AUTO-01.png', 'SS-AUTO-REPORT.png', 'SS-CMD-PDF.png',
    'SS-CMD-TRACKER.png', 'SS-CMD-COVER.png', 'SS-CMD-APPLY-AUTOFILL.png',
    'SS-CMD-APPLY-QUESTIONS.png', 'SS-CMD-OFERTA-COHERE.png',
    'SS-CMD-OFERTA-WAABI.png', 'SS-CMD-OFERTAS.png', 'SS-CMD-DEEP.png',
    'SS-CMD-INTERVIEW-RECRUITER.png', 'SS-CMD-INTERVIEW-TECHNICAL.png',
    'SS-CMD-SCAN.png', 'SS-CMD-PIPELINE.png', 'SS-CMD-PROJECT.png',
    'SS-CMD-TRAINING.png', 'SS-CMD-TRAINING-COMPARISON.png'
  ];

  for (const file of expectedFiles) {
    const assetPath = path.join(root, 'assets', 'screenshots', file);
    assert.equal(fs.existsSync(assetPath), true, `${file} must be bundled`);
    assert.ok(fs.statSync(assetPath).size > 10_000, `${file} must be a real screenshot`);
    assert.match(html, new RegExp(`href="assets/screenshots/${file}"[^>]*target="_blank"`));
  }
});

test('setup uses Codex with ChatGPT sign-in and removes OpenCode setup screenshots', () => {
  const html = readDeck();
  const setupSlides = [10, 13].map((slide) => {
    const section = html.match(new RegExp(`<section\\b[^>]*data-slide="${slide}"[\\s\\S]*?<\\/section>`));
    assert.ok(section, `slide ${slide} must exist`);
    return section[0];
  }).join('\n');

  assert.match(setupSlides, /npm install -g @openai\/codex/);
  assert.match(setupSlides, /codex --version/);
  assert.match(setupSlides, /Sign in with ChatGPT/);
  assert.match(setupSlides, /codex login status/);
  assert.doesNotMatch(setupSlides, /opencode|OpenRouter/i);
  assert.match(setupSlides, /No API key is needed/);
  assert.equal(fs.existsSync(path.join(root, 'assets', 'screenshots', 'SS-SETUP-01.png')), false);
  assert.equal(fs.existsSync(path.join(root, 'assets', 'screenshots', 'SS-SETUP-03.png')), false);
});

test('every included command slide contains its exact follow-along prompt', () => {
  const html = readDeck();
  const prompts = matches(html, /<pre\b[^>]*class="[^"]*\bfollow-prompt\b[^"]*"[\s\S]*?<\/pre>/g)
    .map((match) => match[0]);
  const combined = prompts.join('\n');
  const required = [
    'Run the /career-ops auto-pipeline command with this job URL:',
    'Run the /career-ops tracker command.',
    'Run the /career-ops pdf command for Cohere.',
    'Run the /career-ops cover command for Cohere.',
    'Run the /career-ops apply command for Cohere.',
    'https://jobs.ashbyhq.com/cohere/8c035d3d-081d-4c8a-914a-72f4efaad254',
    'https://jobs.lever.co/waabi/0fd4e30b-9bd1-4b53-9043-6088457363cb',
    'Run the /career-ops ofertas command.',
    'Run the /career-ops deep command for Cohere.',
    'for Cohere for a recruiter interview.',
    'for Cohere for a technical ML interview.',
    'Run the /career-ops scan command.',
    'Run the /career-ops pipeline command.',
    'Build a distributed LLM training platform that can launch multi-GPU training jobs',
    'evaluate whether learning distributed ML training is worth it for my target roles.',
    'compare learning Kubernetes versus distributed ML training for my target roles.'
  ];

  assert.equal(prompts.length, 16);
  required.forEach((fragment) => assert.ok(combined.includes(fragment), `missing follow-along prompt: ${fragment}`));
  assert.doesNotMatch(combined, /career-ops (contacto|patterns)/i);
});

test('follow-along prompts identify where to paste them without requiring OpenCode', () => {
  const html = readDeck();
  const runtime = loadRuntime(html);
  assert.equal(runtime.prompts.length, 16);
  runtime.prompts.forEach((prompt) => assert.equal(prompt['aria-label'], 'Prompt to paste into Codex, OpenCode, or Claude Code'));
  assert.match(html, /This workshop uses Codex/);
});

test('embedded runtime navigates within boundaries and updates progress', () => {
  const runtime = loadRuntime(readDeck());
  assert.equal(runtime.api.current(), 0);
  runtime.api.previous();
  assert.equal(runtime.api.current(), 0);
  runtime.api.next();
  assert.equal(runtime.api.current(), 1);
  runtime.api.goTo(32);
  runtime.api.next();
  assert.equal(runtime.api.current(), 32);
  assert.equal(runtime.counter.textContent, '33 / 33');
  assert.equal(runtime.progress.style.width, '100%');
});

test('embedded runtime toggles notes, overview, and screenshot fallback states', () => {
  const runtime = loadRuntime(readDeck());
  assert.equal(runtime.notes.hidden, true);
  runtime.api.toggleNotes();
  assert.equal(runtime.notes.hidden, false);
  assert.equal(runtime.notes.classList.contains('is-open'), true);
  runtime.api.toggleOverview();
  assert.equal(runtime.body.classList.contains('overview-open'), true);

  const figure = { classList: new FakeClassList() };
  const missing = { complete: true, naturalWidth: 0, closest: () => figure };
  runtime.api.hydrateScreenshot(missing);
  assert.equal(figure.classList.contains('is-missing'), true);
  const loaded = { complete: true, naturalWidth: 1200, closest: () => figure };
  runtime.api.hydrateScreenshot(loaded);
  assert.equal(figure.classList.contains('is-ready'), true);
  assert.equal(figure.classList.contains('is-missing'), false);
});

test('screenshot viewer switches the large active image and selected tab together', () => {
  const runtime = loadRuntime(readDeck());
  const panels = Array.from({ length: 3 }, (_, index) => ({
    hidden: index !== 0,
    classList: new FakeClassList(index === 0 ? ['is-active'] : [])
  }));
  const tabs = Array.from({ length: 3 }, (_, index) => ({
    classList: new FakeClassList(index === 0 ? ['is-active'] : []),
    setAttribute(name, value) { this[name] = value; }
  }));
  const viewer = {
    querySelectorAll(selector) {
      if (selector === '[data-shot-panel]') return panels;
      if (selector === '[data-shot-tab]') return tabs;
      return [];
    }
  };

  runtime.api.showShot(viewer, 2);

  assert.deepEqual(panels.map((panel) => panel.hidden), [true, true, false]);
  assert.deepEqual(panels.map((panel) => panel.classList.contains('is-active')), [false, false, true]);
  assert.deepEqual(tabs.map((tab) => tab.classList.contains('is-active')), [false, false, true]);
  assert.equal(tabs[2]['aria-selected'], 'true');
  assert.equal(tabs[0]['aria-selected'], 'false');
});

test('reported presentation slides use large screenshot viewers instead of thumbnail galleries', () => {
  const html = readDeck();
  const affected = [12, 17, 20, 21, 22, 23, 24, 25, 26, 27];
  for (const slide of affected) {
    const section = html.match(new RegExp(`<section\\b[^>]*data-slide="${slide}"[\\s\\S]*?<\\/section>`));
    assert.ok(section, `slide ${slide} must exist`);
    assert.match(section[0], /data-shot-viewer/, `slide ${slide} needs a large screenshot viewer`);
  }
});

test('deck is offline-safe and exposes visible control help', () => {
  const html = readDeck();
  assert.doesNotMatch(html, /<(script|link)\b[^>]*(src|href)="https?:\/\//i);
  assert.match(html, /data-controls-help/);
  assert.match(html, /←\/→/);
  assert.match(html, /aria-live="polite"/);
});

test('final slide opens the complete command demo video in a new tab', () => {
  const html = readDeck();
  const finalSlide = html.match(/<section\b[^>]*data-slide="33"[\s\S]*?<\/section>/);
  assert.ok(finalSlide, 'final slide must exist');
  assert.match(
    finalSlide[0],
    /<a\b[^>]*href="https:\/\/youtu\.be\/vQASKFsXKU0\?si=d-p91u8i8uJrTeWt"[^>]*target="_blank"[^>]*rel="noopener"[^>]*>/
  );
});

test('all user-facing deck and handout files are English-only', () => {
  const files = [
    'index.html',
    'README.md',
    'assets/screenshots/README.md',
    'handouts/andrew-pham-demo-profile.md'
  ];
  const vietnameseDiacritics = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/iu;
  const vietnamesePhrases = /\b(mở slide|thêm screenshot|bộ slide|chụp|đọc|tạo|không|bạn|hãy|dùng khi|kết quả)\b/iu;

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, vietnameseDiacritics, `${relativePath} contains Vietnamese diacritics`);
    assert.doesNotMatch(source, vietnamesePhrases, `${relativePath} contains Vietnamese copy`);
  }
  assert.match(readDeck(), /<html lang="en">/);
});

test('Andrew Pham demo profile ships in Markdown and PDF with a misuse warning', () => {
  const markdownPath = path.join(root, 'handouts/andrew-pham-demo-profile.md');
  const pdfPath = path.join(root, 'handouts/Andrew-Pham-demo.pdf');
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const pdf = fs.readFileSync(pdfPath);

  assert.match(markdown, /# Andrew Pham/);
  assert.match(markdown, /fictional demo profile/i);
  assert.match(markdown, /must not be submitted/i);
  assert.match(markdown, /Distributed LLM Training System/);
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 10_000, 'demo PDF should contain a real rendered resume');
  assert.equal(fs.existsSync(path.join(root, 'handouts/starter-profile.md')), false);
});
