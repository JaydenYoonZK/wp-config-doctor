import { audit, generateSalts } from "./config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

  const { findings, score, counts } = audit(text);

  if (score === null) {
    scoreRow.innerHTML = "";
    findingsEl.innerHTML = `<div class="finding info"><span class="dot-sev"></span><div class="body"><div class="ftitle">${esc(findings[0].title)}</div><p class="fdetail">${esc(findings[0].detail)}</p></div></div>`;
    return;
  }

  const issues = findings.filter(f => f.level !== "pass").length;
  const passes = findings.filter(f => f.level === "pass").length;
  const circ = 2 * Math.PI * 42;
  const dash = circ * (score / 100);
  scoreRow.innerHTML = `
    <div class="score-dial">
      <svg viewBox="0 0 96 96" width="96" height="96">
        <circle cx="48" cy="48" r="42" stroke="var(--line-strong)" stroke-width="8" fill="none"/>
        <circle cx="48" cy="48" r="42" stroke="${scoreColor(score)}" stroke-width="8" fill="none" stroke-linecap="round"
                stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"/>
      </svg>
      <div class="num" style="color:${scoreColor(score)}">${score}</div>
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
pasteBtn.addEventListener("click", async () => {
    // On touch devices the async clipboard read triggers a system permission
    // popup that needs a second tap. Instead focus the box, where iOS offers a
    // native one-tap Paste on an empty field. Desktop keeps one-click paste.
    if (matchMedia("(pointer: coarse)").matches) {
      input.focus();
      input.select(); // select existing text so a native paste replaces it
      const p = pasteBtn.textContent;
      pasteBtn.textContent = "Now paste into the box";
      setTimeout(() => { pasteBtn.textContent = p; }, 2600);
      return;
    }
  try {
    const text = await navigator.clipboard.readText();
    if (text) { input.value = text; runAudit(); return; }
  } catch { /* denied */ }
  input.focus();
  const prev = pasteBtn.textContent;
  pasteBtn.textContent = navigator.platform?.includes("Mac") ? "Press ⌘V, then Audit" : "Press Ctrl+V, then Audit";
  setTimeout(() => { pasteBtn.textContent = prev; }, 2400);
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
function syncThemeIcon() { themeToggle.textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀️"; }
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeIcon();
});
syncThemeIcon();

const navAnchors = [...document.querySelectorAll(".nav-links a")];
const navSections = navAnchors.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
const sectionSpy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const a of navAnchors) a.classList.toggle("active", a.hash === "#" + entry.target.id);
  }
}, { rootMargin: "-30% 0px -60% 0px" });
navSections.forEach(sec => sectionSpy.observe(sec));

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
