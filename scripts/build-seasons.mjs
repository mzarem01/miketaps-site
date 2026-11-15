// Builds src/data/seasons.json from the Pro Football Reference franchise table
// (scripts/data/pfr-franchise.txt) and checks it. Any failed check stops the build.
import { readFileSync, writeFileSync } from 'node:fs';

const RAW = 'scripts/data/pfr-franchise.txt';
const OUT = 'src/data/seasons.json';
const FIRST = 1932;
const CURRENT = 2026; // the season still being played; marked in_progress
const RETRIEVED = '2026-11-14';

const TEAM_NAMES = {
  'B Braves': 'Boston Braves',
  'B Redskins': 'Boston Redskins',
  'W Redskins': 'Washington Redskins',
  'W Football Team': 'Washington Football Team',
  'W Commanders': 'Washington Commanders',
};
const PLAYOFFS = {
  '': null,
  'Lost WC': 'Lost in the Wild Card round',
  'Lost Div': 'Lost in the Divisional round',
  'Lost Conf': 'Lost the NFC Championship',
  'Lost SB': 'Lost the Super Bowl',
  'Won SB': 'Won the Super Bowl',
  'Lost Champ': 'Lost the NFL Championship Game',
  'Won Champ': 'Won the NFL Championship',
};

// Regular-season length. Only checked from 1947 on, when every team played the same number.
function expectedGames(y) {
  if (y < 1947) return null;
  if (y === 1982) return 9; // strike
  if (y === 1987) return 15; // strike cancelled a week
  if (y <= 1960) return 12;
  if (y <= 1977) return 14;
  if (y <= 2020) return 16;
  return 17;
}

const errors = [];
const seasons = [];
readFileSync(RAW, 'utf8')
  .split(/\r?\n/)
  .forEach((line, i) => {
    if (!line.trim()) return;
    const parts = line.split('|');
    if (parts.length !== 10) return errors.push(`line ${i + 1}: expected 10 fields, got ${parts.length}`);
    const [year, rawTeam, w, l, t, div, po, pf, pa, coaches] = parts;
    const playoffMark = rawTeam.endsWith('*');
    const team = rawTeam.replace(/\*$/, '');
    const s = {
      year: +year,
      team: TEAM_NAMES[team],
      wins: +w,
      losses: +l,
      ties: +t,
      points_for: +pf,
      points_against: +pa,
      coaches: coaches.split(',').map((c) => c.trim()).filter(Boolean),
      division_finish: div.replace('/', ' of '),
      playoff_result: PLAYOFFS[po],
      outcome: po.startsWith('Won') ? 'title' : po ? 'playoffs' : 'missed',
      in_progress: +year === CURRENT,
      source: `https://www.pro-football-reference.com/teams/was/${year}.htm`,
    };
    const y = s.year;
    if ([y, s.wins, s.losses, s.ties, s.points_for, s.points_against].some((n) => !Number.isInteger(n))) errors.push(`${year}: a number field isn't a whole number`);
    if (!s.team) errors.push(`${y}: unknown team name "${team}"`);
    if (!(po in PLAYOFFS)) errors.push(`${y}: unknown playoff result "${po}"`);
    if (playoffMark !== Boolean(po)) errors.push(`${y}: playoff marker and playoff result disagree`);
    if (!s.coaches.length) errors.push(`${y}: no coach listed`);
    if (s.points_for <= 0 || s.points_against <= 0) errors.push(`${y}: points must be above zero`);
    const games = s.wins + s.losses + s.ties;
    const exp = expectedGames(y);
    if (s.in_progress) {
      if (exp && games > exp) errors.push(`${y}: ${games} games is more than a full season`);
    } else if (exp && games !== exp) errors.push(`${y}: ${games} games, expected ${exp}`);
    else if (!exp && (games < 10 || games > 12)) errors.push(`${y}: ${games} games is outside 10 to 12 for that era`);
    seasons.push(s);
  });

seasons.sort((a, b) => a.year - b.year);
const years = seasons.map((s) => s.year);
for (let y = FIRST; y <= CURRENT; y++) {
  const n = years.filter((x) => x === y).length;
  if (n !== 1) errors.push(`${y}: appears ${n} times`);
}
if (years.some((y) => y < FIRST || y > CURRENT)) errors.push('a season is outside the expected range');

if (errors.length) {
  console.error('Season data checks failed:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

const out = {
  source: {
    name: 'Pro Football Reference',
    url: 'https://www.pro-football-reference.com/teams/was/',
    credit: 'Season data from Pro-Football-Reference.com',
    retrieved: RETRIEVED,
  },
  current_season: CURRENT,
  seasons,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const titles = seasons.filter((s) => s.outcome === 'title').map((s) => s.year);
console.log(`Season data OK: ${seasons.length} seasons, ${FIRST} to ${CURRENT}. Titles: ${titles.join(', ')}.`);
