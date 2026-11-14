// Builds scripture data from the public-domain World English Bible (npm: world-english-bible,
// a parse of the eBible.org WEB text). Text is copied, never retyped.
//
// Outputs (generated, not committed):
//   src/data/verses.generated.json   mood verses with exact text
//   public/bible/<book>.json         one file per book, for direct verse lookup
//   public/bible/books.json          book names, aliases and chapter counts

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('world-english-bible/package.json'));
const jsonDir = join(pkgDir, 'json');

const BOOKS = [
  ['genesis', 'Genesis', ['gen', 'ge']], ['exodus', 'Exodus', ['exo', 'ex']], ['leviticus', 'Leviticus', ['lev']],
  ['numbers', 'Numbers', ['num']], ['deuteronomy', 'Deuteronomy', ['deut', 'dt']], ['joshua', 'Joshua', ['josh']],
  ['judges', 'Judges', ['judg']], ['ruth', 'Ruth', []], ['1samuel', '1 Samuel', ['1 sam']], ['2samuel', '2 Samuel', ['2 sam']],
  ['1kings', '1 Kings', ['1 kgs']], ['2kings', '2 Kings', ['2 kgs']], ['1chronicles', '1 Chronicles', ['1 chr']],
  ['2chronicles', '2 Chronicles', ['2 chr']], ['ezra', 'Ezra', []], ['nehemiah', 'Nehemiah', ['neh']], ['esther', 'Esther', ['est']],
  ['job', 'Job', []], ['psalms', 'Psalms', ['psalm', 'ps', 'psa']], ['proverbs', 'Proverbs', ['prov', 'pr']],
  ['ecclesiastes', 'Ecclesiastes', ['eccl', 'ecc']], ['songofsolomon', 'Song of Solomon', ['song', 'song of songs', 'sos']],
  ['isaiah', 'Isaiah', ['isa']], ['jeremiah', 'Jeremiah', ['jer']], ['lamentations', 'Lamentations', ['lam']],
  ['ezekiel', 'Ezekiel', ['ezek']], ['daniel', 'Daniel', ['dan']], ['hosea', 'Hosea', ['hos']], ['joel', 'Joel', []],
  ['amos', 'Amos', []], ['obadiah', 'Obadiah', ['obad']], ['jonah', 'Jonah', []], ['micah', 'Micah', ['mic']],
  ['nahum', 'Nahum', ['nah']], ['habakkuk', 'Habakkuk', ['hab']], ['zephaniah', 'Zephaniah', ['zeph']],
  ['haggai', 'Haggai', ['hag']], ['zechariah', 'Zechariah', ['zech']], ['malachi', 'Malachi', ['mal']],
  ['matthew', 'Matthew', ['matt', 'mt']], ['mark', 'Mark', ['mk']], ['luke', 'Luke', ['lk']], ['john', 'John', ['jn']],
  ['acts', 'Acts', []], ['romans', 'Romans', ['rom']], ['1corinthians', '1 Corinthians', ['1 cor']],
  ['2corinthians', '2 Corinthians', ['2 cor']], ['galatians', 'Galatians', ['gal']], ['ephesians', 'Ephesians', ['eph']],
  ['philippians', 'Philippians', ['phil', 'php']], ['colossians', 'Colossians', ['col']],
  ['1thessalonians', '1 Thessalonians', ['1 thess']], ['2thessalonians', '2 Thessalonians', ['2 thess']],
  ['1timothy', '1 Timothy', ['1 tim']], ['2timothy', '2 Timothy', ['2 tim']], ['titus', 'Titus', []],
  ['philemon', 'Philemon', ['phlm']], ['hebrews', 'Hebrews', ['heb']], ['james', 'James', ['jas']],
  ['1peter', '1 Peter', ['1 pet']], ['2peter', '2 Peter', ['2 pet']], ['1john', '1 John', []], ['2john', '2 John', []],
  ['3john', '3 John', []], ['jude', 'Jude', []], ['revelation', 'Revelation', ['rev', 'revelations']],
];

const clean = (s) => s.replace(/\s+/g, ' ').trim();

// book slug -> { chapter -> { verse -> text } }
const bible = {};
for (const [slug] of BOOKS) {
  const items = JSON.parse(readFileSync(join(jsonDir, `${slug}.json`), 'utf8'));
  const book = {};
  for (const it of items) {
    if (typeof it.value !== 'string' || !it.chapterNumber || !it.verseNumber) continue;
    if (it.type !== 'paragraph text' && it.type !== 'line text') continue;
    const ch = (book[it.chapterNumber] ??= {});
    ch[it.verseNumber] = ch[it.verseNumber] ? `${ch[it.verseNumber]} ${it.value}` : it.value;
  }
  for (const ch of Object.values(book)) for (const v of Object.keys(ch)) ch[v] = clean(ch[v]);
  bible[slug] = book;
}

const lookup = new Map();
for (const [slug, name, aliases] of BOOKS) {
  for (const k of [slug, name, ...aliases]) lookup.set(k.toLowerCase().replace(/\s+/g, ' '), slug);
}

function parseRef(ref) {
  const m = ref.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Bad reference: ${ref}`);
  const slug = lookup.get(m[1].toLowerCase());
  if (!slug) throw new Error(`Unknown book in: ${ref}`);
  return { slug, chapter: +m[2], from: +m[3], to: +(m[4] ?? m[3]) };
}

function textFor(ref) {
  const { slug, chapter, from, to } = parseRef(ref);
  const verses = [];
  for (let v = from; v <= to; v++) {
    const t = bible[slug]?.[chapter]?.[v];
    if (!t) throw new Error(`Missing verse ${ref} (${v})`);
    verses.push({ n: v, text: t });
  }
  return verses;
}

const src = JSON.parse(readFileSync('src/data/verses.json', 'utf8'));
const out = src.moods.map((m) => ({
  ...m,
  verses: m.refs.map((ref) => ({ ref, verses: textFor(ref) })),
}));
writeFileSync('src/data/verses.generated.json', JSON.stringify({ translation: 'World English Bible (WEB)', moods: out }, null, 2));

mkdirSync('public/bible', { recursive: true });
const index = [];
for (const [slug, name, aliases] of BOOKS) {
  writeFileSync(`public/bible/${slug}.json`, JSON.stringify(bible[slug]));
  index.push({ slug, name, aliases, chapters: Object.keys(bible[slug]).length });
}
writeFileSync('public/bible/books.json', JSON.stringify(index));

console.log(`Bible data built: ${out.length} moods, ${index.length} books.`);
