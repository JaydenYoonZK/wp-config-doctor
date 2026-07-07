import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig, audit, generateSalts, SALT_KEYS } from "../docs/config.js";

const SAMPLE_INSECURE = `<?php
define( 'DB_NAME', 'wordpress' );
define( 'DB_USER', 'root' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST', 'localhost' );

define( 'AUTH_KEY',         'put your unique phrase here' );
define( 'SECURE_AUTH_KEY',  'put your unique phrase here' );
define( 'WP_DEBUG', true );

$table_prefix = 'wp_';
`;

const SAMPLE_HARDENED = `<?php
define( 'DB_NAME', 'wp_prod' );
define( 'DB_USER', 'wpuser' );
define( 'DB_PASSWORD', 'a-long-random-secret-8f3ac91b' );
define( 'DB_HOST', 'localhost' );
define('AUTH_KEY',        'x7)Kd#2p Zq|9aB^mW}oL5!rT8@vN0cE_gH1jS4uY6iP3fD-kR' );
define('SECURE_AUTH_KEY', 'Q2wE3rT4yU5iO6pA7sD8fG9hJ0kL1zX2cV3bN4mQ5wE6rT7yU8i' );
define('LOGGED_IN_KEY',   'aaAA11!!bbBB22@@ccCC33##ddDD44$$eeEE55%%ffFF66^^ggGG' );
define('NONCE_KEY',       'z9y8x7w6v5u4t3s2r1q0p!o@n#m$l%k^j&i*h(g)f-e_dcbaZZ1' );
define('AUTH_SALT',       'M1n2B3v4C5x6Z7l8K9j0H!g@F#d\\$S%aP^oI&uY*tR(eW)q, .;:' );
define('SECURE_AUTH_SALT','p0O9i8U7y6T5r4E3w2Q1!@#\\$%^&*()-_=+plmoknijbuhvygctf' );
define('LOGGED_IN_SALT',  '5t6y7u8i9o0p!q@w#e\\$r%t^y&u*i(o)p-a_sdfghjklZXCVBNM,' );
define('NONCE_SALT',      'QwErTyUiOpAsDfGhJkLzXcVbNm1234567890!@#\\$%^&*()-_=+[' );

define( 'WP_DEBUG', false );
define( 'DISALLOW_FILE_EDIT', true );
define( 'FORCE_SSL_ADMIN', true );
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'WP_POST_REVISIONS', 10 );
define( 'WP_ENVIRONMENT_TYPE', 'production' );
$table_prefix = 'x7z_';
`;

test("parses defines including strings, bools, ints", () => {
  const { defines, tablePrefix } = parseConfig(SAMPLE_HARDENED);
  assert.equal(defines.get("DB_NAME").value, "wp_prod");
  assert.equal(defines.get("WP_DEBUG").value, false);
  assert.equal(defines.get("WP_DEBUG").type, "bool");
  assert.equal(defines.get("WP_POST_REVISIONS").value, 10);
  assert.equal(tablePrefix, "x7z_");
});

test("parses salts that contain parentheses and quotes", () => {
  const { defines } = parseConfig(SAMPLE_HARDENED);
  const auth = defines.get("AUTH_KEY").value;
  assert.ok(auth.includes("(") || auth.includes(")") || auth.includes("|"), "special chars kept");
  // the salt with an escaped $ and a ) should survive intact
  const salt = defines.get("AUTH_SALT").value;
  assert.ok(salt.includes(")"), "closing paren inside salt preserved");
});

test("insecure config raises the right critical and high findings", () => {
  const { findings, score } = audit(SAMPLE_INSECURE);
  const ids = findings.map(f => f.id);
  assert.ok(ids.includes("salts-partial") || ids.includes("salts-missing"));
  assert.ok(ids.includes("salts-placeholder"));
  assert.ok(ids.includes("wp-debug"));
  assert.ok(ids.includes("db-empty"));
  assert.ok(ids.includes("table-prefix"));
  assert.ok(ids.includes("file-edit"));
  assert.ok(score < 50, `score should be low, got ${score}`);
});

test("findings are sorted most severe first", () => {
  const { findings } = audit(SAMPLE_INSECURE);
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0, pass: -1 };
  for (let i = 1; i < findings.length; i++) {
    assert.ok(order[findings[i - 1].level] >= order[findings[i].level], "sorted");
  }
});

test("hardened config passes the important checks", () => {
  const { findings, score } = audit(SAMPLE_HARDENED);
  const ids = findings.map(f => f.id);
  assert.ok(ids.includes("salts-ok"));
  assert.ok(ids.includes("wp-debug-ok"));
  assert.ok(ids.includes("file-edit-ok"));
  assert.ok(ids.includes("ssl-admin-ok"));
  assert.ok(ids.includes("table-prefix-ok"));
  assert.ok(!ids.includes("salts-placeholder"));
  assert.ok(!ids.includes("wp-debug"));
  assert.ok(score >= 90, `hardened score should be high, got ${score}`);
});

test("duplicate salts are detected", () => {
  const dup = `<?php
` + SALT_KEYS.map(k => `define('${k}', 'IDENTICAL_VALUE_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');`).join("\n");
  const { findings } = audit(dup);
  assert.ok(findings.some(f => f.id === "salts-duplicate"));
});

test("display_errors forced on is flagged", () => {
  const cfg = `<?php ini_set('display_errors', 1); define('WP_DEBUG', false);`;
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "display-errors"));
});

test("sample-file DB placeholders are recognized", () => {
  const cfg = `<?php
define( 'DB_NAME', 'database_name_here' );
define( 'DB_USER', 'username_here' );
define( 'DB_PASSWORD', 'password_here' );`;
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "db-sample"));
});

test("non-config input returns a friendly note", () => {
  const { findings, score } = audit("just some random text");
  assert.equal(score, null);
  assert.equal(findings[0].id, "empty");
});

test("generateSalts produces eight valid, unique, quote-safe lines", () => {
  const out = generateSalts();
  const lines = out.split("\n");
  assert.equal(lines.length, 8);
  const values = [];
  for (let i = 0; i < 8; i++) {
    const m = /define\('([A-Z_]+)',\s+'(.+)'\);/.exec(lines[i]);
    assert.ok(m, `line ${i} well formed: ${lines[i]}`);
    assert.equal(m[1], SALT_KEYS[i]);
    assert.equal(m[2].length, 64);
    assert.ok(!m[2].includes("'") && !m[2].includes("\\"), "safe inside single quotes");
    values.push(m[2]);
  }
  assert.equal(new Set(values).size, 8, "all salts unique");
});

test("generated salts survive a round-trip parse", () => {
  const cfg = "<?php\n" + generateSalts();
  const { defines } = parseConfig(cfg);
  for (const k of SALT_KEYS) {
    assert.equal(defines.get(k).value.length, 64, k);
  }
  // and the fresh set audits clean on salts
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "salts-ok"));
});
