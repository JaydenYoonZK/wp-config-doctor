import { audit, generateSalts } from "./config.js?v=20260711t";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const input = $("input");
const actionBtn = $("audit");
const clearBtn = $("clear");

// Enable the action and Clear buttons only when the box has content. An empty
// box means nothing to run and nothing to clear, so both are disabled (dimmed,
// dashed edge, not-allowed cursor).
function syncControls() {
  const hasContent = input.value.trim().length > 0;
  actionBtn.disabled = !hasContent;
  clearBtn.disabled = !hasContent;
}
input.addEventListener("input", syncControls);
const results = $("results");
const scoreRow = $("score-row");
const findingsEl = $("findings");

const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info", pass: "Pass" };

function scoreColor(score) {
  if (score >= 85) return "var(--green)";
  if (score >= 60) return "var(--amber)";
  return "var(--red)";
}

function runAudit() {
  syncControls();
  const text = input.value;
  if (!text.trim()) { results.hidden = true; return; }
  results.hidden = false;

  let findings, score, counts;
  try {
    ({ findings, score, counts } = audit(text));
  } catch {
    scoreRow.innerHTML = "";
    findingsEl.innerHTML = `<div class="finding high"><span class="dot-sev"></span><div class="body"><div class="ftitle">Could not read that input</div><p class="fdetail">Something in the pasted text stopped the audit from finishing. Check that you pasted the contents of wp-config.php and try again.</p></div></div>`;
    return;
  }

  if (score === null) {
    scoreRow.innerHTML = "";
    findingsEl.innerHTML = `<div class="finding info"><span class="dot-sev"></span><div class="body"><div class="ftitle">${esc(findings[0].title)}</div><p class="fdetail">${esc(findings[0].detail)}</p></div></div>`;
    return;
  }

  // "Issues" are actionable severities. Info items are tidiness notes that do not
  // lower the score, so counting them here would contradict a 100 score.
  const issues = findings.filter(f => f.level !== "pass" && f.level !== "info").length;
  const passes = findings.filter(f => f.level === "pass").length;
  const circ = 2 * Math.PI * 42;
  const dash = circ * (score / 100);
  scoreRow.innerHTML = `
    <div class="score-dial">
      <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
        <circle cx="48" cy="48" r="42" stroke="var(--line-strong)" stroke-width="8" fill="none"/>
        <circle cx="48" cy="48" r="42" stroke="${scoreColor(score)}" stroke-width="8" fill="none" stroke-linecap="round"
                stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 48 48)"/>
      </svg>
      <div class="num" style="color:${scoreColor(score)}">${score}<span class="sr-only"> out of 100 hardening score</span></div>
    </div>
    <div class="score-caption">
      <strong>${issues} issue${issues === 1 ? "" : "s"} to review</strong>, ${passes} check${passes === 1 ? "" : "s"} passed.<br>
      ${counts.critical ? `<span style="color:var(--red)">${counts.critical} critical. </span>` : ""}${counts.high ? `<span style="color:var(--red)">${counts.high} high. </span>` : ""}${counts.medium ? `<span style="color:var(--amber)">${counts.medium} medium. </span>` : ""}Score is a rough guide, not a guarantee.
    </div>`;

  findingsEl.innerHTML = findings.map(f => `
    <div class="finding ${f.level}">
      <span class="dot-sev"></span>
      <div class="body">
        <div class="ftitle">${esc(f.title)} <span class="sev-tag">${SEV_LABEL[f.level]}</span></div>
        <p class="fdetail">${esc(f.detail)}</p>
        ${f.fix ? `<div class="ffix">${esc(f.fix)}</div>` : ""}
      </div>
    </div>`).join("");
}

$("audit").addEventListener("click", runAudit);
input.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runAudit(); });

const SAMPLE = `<?php
define( 'DB_NAME', 'wordpress' );
define( 'DB_USER', 'root' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8' );

define( 'AUTH_KEY',         'put your unique phrase here' );
define( 'SECURE_AUTH_KEY',  'put your unique phrase here' );
define( 'LOGGED_IN_KEY',    'put your unique phrase here' );
define( 'NONCE_KEY',        'put your unique phrase here' );
define( 'AUTH_SALT',        'put your unique phrase here' );
define( 'SECURE_AUTH_SALT', 'put your unique phrase here' );
define( 'LOGGED_IN_SALT',   'put your unique phrase here' );
define( 'NONCE_SALT',       'put your unique phrase here' );

define( 'WP_DEBUG', true );

$table_prefix = 'wp_';

if ( ! defined( 'ABSPATH' ) ) {
  define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';`;

function loadSample() { input.value = SAMPLE; runAudit(); }
$("sample").addEventListener("click", () => { loadSample(); input.scrollIntoView({ behavior: "smooth", block: "center" }); });

const pasteBtn = $("paste");
const pasteLabel = pasteBtn.textContent;
let pasteFlashTimer = 0;
let waitingForPaste = false;
function flashPaste(msg) {
  pasteBtn.textContent = msg;
  clearTimeout(pasteFlashTimer);
  pasteFlashTimer = setTimeout(() => { pasteBtn.textContent = pasteLabel; }, 2600);
}
pasteBtn.addEventListener("click", async () => {
  // Read the clipboard on every device. On iOS the system shows its Paste
  // confirmation bubble at the tap point; confirming it fills the box and
  // runs the audit in one motion. That bubble is the minimum iOS allows
  // before a page may read the clipboard.
  try {
    const text = await navigator.clipboard.readText();
    if (text) { input.value = text; runAudit(); return; }
    flashPaste("Clipboard is empty");
    return;
  } catch { /* declined or unsupported, fall back to a manual paste */ }
  waitingForPaste = true;
  input.focus();
  input.select(); // a manual paste then replaces the old content
  flashPaste(matchMedia("(pointer: coarse)").matches
    ? "Long-press the box, then Paste"
    : (navigator.platform?.includes("Mac") ? "Press ⌘V to paste" : "Press Ctrl+V to paste"));
});
// If the clipboard read was declined, the audit still runs the moment a
// manual paste lands in the box.
input.addEventListener("paste", () => {
  if (!waitingForPaste) return;
  waitingForPaste = false;
  clearTimeout(pasteFlashTimer);
  pasteBtn.textContent = pasteLabel;
  setTimeout(runAudit, 0); // let the pasted text land first
});

clearBtn.addEventListener("click", () => { input.value = ""; results.hidden = true; syncControls(); input.focus(); });
syncControls();

// Salt generator
function newSalts() { $("salt-output").textContent = generateSalts(); }
$("regen").addEventListener("click", newSalts);
$("copy-salts").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("salt-output").textContent); } catch { /* ignore */ }
  const b = $("copy-salts"); b.textContent = "Copied ✓";
  setTimeout(() => { b.textContent = "Copy"; }, 1500);
});
newSalts();

if (new URLSearchParams(location.search).has("demo")) loadSample();

const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() {
  const label = document.documentElement.dataset.theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("data-tip", label);
}
let themeFadeTimer = 0;
themeToggle.addEventListener("click", () => {
  // Crossfade the page in one composited pass where the browser supports
  // view transitions; text then cannot re-ease its inherited color and lag
  // behind the page. Elsewhere, fall back to fading only non-inherited
  // colors so text switches in one clean step.
  if (document.startViewTransition) {
    document.documentElement.classList.add("vt-active");
    const vt = document.startViewTransition(() => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      syncThemeIcon();
    });
    vt.finished.finally(() => document.documentElement.classList.remove("vt-active"));
    return;
  }
  document.documentElement.classList.add("theme-fading");
  clearTimeout(themeFadeTimer);
  themeFadeTimer = setTimeout(() => document.documentElement.classList.remove("theme-fading"), 500);
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeIcon();
});
syncThemeIcon();

// Scroll spy: the active menu item is the last section whose heading sits
// at or above the reading line just below the sticky header. Computed from
// the scroll position rather than an IntersectionObserver band, because a
// menu jump lands the heading at the top of the viewport, outside any
// mid-viewport band, which left the highlight stuck on a section the page
// merely scrolled past.
const navAnchors = [...document.querySelectorAll(".nav-links a")];
const navSections = navAnchors.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
navSections.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
function syncActiveLink() {
  const nav = document.querySelector(".site-nav");
  const line = (nav ? nav.offsetHeight : 0) + 40;
  let current = null;
  for (const sec of navSections) {
    if (sec.getBoundingClientRect().top <= line) current = sec;
  }
  // At the very bottom the last section is current even when the page is
  // too short to lift its heading up to the line.
  if (navSections.length && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) {
    current = navSections[navSections.length - 1];
  }
  for (const a of navAnchors) {
    const on = !!current && a.hash === "#" + current.id;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
}
let spyRaf = 0;
addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(() => { spyRaf = 0; syncActiveLink(); }); }, { passive: true });
addEventListener("resize", syncActiveLink, { passive: true });
syncActiveLink();

const toTop = document.getElementById("to-top");
if (toTop) {
  addEventListener("scroll", () => { toTop.classList.toggle("show", scrollY > 600); }, { passive: true });
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

const scene = document.querySelector(".bg-scene");
if (scene && matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let rafId = 0;
  addEventListener("mousemove", (e) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      scene.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
      scene.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
    });
  }, { passive: true });
}
if (scene && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let scrollRaf = 0;
  const applyScroll = () => { scrollRaf = 0; scene.style.setProperty("--sy", String(scrollY)); };
  addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(applyScroll); }, { passive: true });
  applyScroll();
}

// The bar is a brand row plus a menu band, and the band wraps on narrow
// screens, so the anchor offset is measured rather than hardcoded.
const siteNav = document.querySelector(".site-nav");
if (siteNav) {
  const setNavHeight = () => document.documentElement.style.setProperty("--nav-h", siteNav.offsetHeight + "px");
  addEventListener("resize", setNavHeight, { passive: true });
  setNavHeight();
}
