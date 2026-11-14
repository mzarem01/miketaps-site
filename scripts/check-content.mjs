// Content guard. Runs in CI on every pull request and before every release.
// Fails the build if the site or repo contains:
//   1. em dashes (house style: use commas, colons, parentheses or new sentences)
//   2. private network addresses (LAN, Docker, Tailscale ranges)
//   3. any private term listed outside the repo (employer, places, names)
//
// Private terms are never committed. CI reads them from the PRIVACY_TERMS secret
// (one term per line). Locally, put them in .privacy-terms (gitignored).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const root = process.cwd();
const scanDirs = ['src', 'public', 'ops', 'scripts', 'dist', '.github'];
const scanFiles = ['README.md', 'AGENTS.md'];
const textExt = new Set([
  '.astro', '.md', '.mdx', '.html', '.css', '.js', '.mjs', '.ts', '.json',
  '.yaml', '.yml', '.txt', '.svg', '.xml', '.conf', '.service', '.timer', '',
]);
const self = 'scripts/check-content.mjs';

const EM_DASH = String.fromCharCode(0x2014);

const ipRules = [
  { name: 'private LAN address (192.168.x.x)', re: /\b192\.168\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'private address (10.x.x.x)', re: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'private address (172.16-31.x.x)', re: /\b172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'Tailscale/CGNAT address (100.64-127.x.x)', re: /\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'Tailscale MagicDNS name', re: /\.ts\.net\b/i },
];

function loadTerms() {
  const raw = process.env.PRIVACY_TERMS ?? (existsSync('.privacy-terms') ? readFileSync('.privacy-terms', 'utf8') : '');
  return raw
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith('#'));
}

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (textExt.has(extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

const files = [];
for (const d of scanDirs) walk(join(root, d), files);
for (const f of scanFiles) if (existsSync(join(root, f))) files.push(join(root, f));

const terms = loadTerms();
const problems = [];

for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (rel === self) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const where = `${rel}:${i + 1}`;
    // Scripture is quoted verbatim, so the em dash rule skips the generated Bible files.
    if (line.includes(EM_DASH) && !rel.includes('/bible/') && !rel.endsWith('verses.generated.json')) problems.push(`${where}  em dash`);
    for (const rule of ipRules) {
      // ops/ may name the site's own Docker network (172.16-31 range). It's container-internal,
      // not a home network address, and the firewall docs need it.
      if (rel.startsWith('ops/') && rule.name.startsWith('private address (172')) continue;
      if (rule.re.test(line)) problems.push(`${where}  ${rule.name}`);
    }
    const lower = line.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) problems.push(`${where}  private term (#${terms.indexOf(term) + 1})`);
    }
  });
}

if (!terms.length) {
  console.warn('Note: no private terms loaded (PRIVACY_TERMS secret or .privacy-terms file). Only dashes and addresses were checked.');
}

if (problems.length) {
  console.error(`Content check failed (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Content check passed: ${files.length} files, ${terms.length} private terms checked.`);
