// Gameday: the long season chart, the stat machine and "your era".
// Every fact the stat machine shows is worked out here from the season data
// (src/data/seasons.json, from Pro Football Reference). Nothing is written by hand
// and nothing is sent anywhere.
(function () {
  // ---- the math (no page needed, so it can be tested on its own) ----
  function games(s) { return s.wins + s.losses + s.ties; }
  function pct(s) { return (s.wins + s.ties / 2) / games(s); }
  function rec(s) { return s.wins + '-' + s.losses + (s.ties ? '-' + s.ties : ''); }
  function pctText(p) { return (p * 100).toFixed(1).replace(/\.0$/, '') + '%'; }
  function perGame(n, s) { return (n / games(s)).toFixed(1); }
  function range(a, b) { var r = []; for (var y = a; y <= b; y++) r.push(y); return r; }
  function andList(xs) {
    if (xs.length < 2) return xs.join('');
    return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  }
  function pooled(list) {
    var w = 0, l = 0, t = 0;
    list.forEach(function (s) { w += s.wins; l += s.losses; t += s.ties; });
    return { w: w, l: l, t: t, pct: (w + t / 2) / (w + l + t), rec: w + '-' + l + (t ? '-' + t : '') };
  }
  // All the longest back-to-back runs of seasons passing a test.
  function longestRuns(S, test) {
    var runs = [], best = 0, start = null;
    S.forEach(function (s, i) {
      if (test(s)) {
        if (start === null) start = s.year;
        var n = s.year - start + 1;
        var ends = i === S.length - 1 || !test(S[i + 1]);
        if (ends) {
          if (n > best) { best = n; runs = []; }
          if (n === best) runs.push([start, s.year]);
          start = null;
        }
      }
    });
    return { n: best, runs: runs };
  }
  function topBy(S, fn, low) {
    var v = low ? Infinity : -Infinity, hits = [];
    S.forEach(function (s) {
      var x = Math.round(fn(s) * 1000) / 1000;
      if (low ? x < v : x > v) { v = x; hits = [s]; }
      else if (x === v) hits.push(s);
    });
    return { value: v, seasons: hits };
  }
  function yearsOf(list) { return list.map(function (s) { return s.year; }); }

  // Each recipe returns { title, text, math, years }. They only use finished seasons.
  function buildFacts(all, eras) {
    var S = all.filter(function (s) { return !s.in_progress; });
    var first = S[0].year, last = S[S.length - 1].year;
    var facts = [];

    var win = longestRuns(S, function (s) { return s.wins > s.losses; });
    facts.push({
      title: 'Longest run of winning seasons',
      text: win.n + ' winning seasons in a row: ' + andList(win.runs.map(function (r) { return r[0] + ' to ' + r[1]; })) + '.',
      math: 'mark every season with more wins than losses, then find the longest unbroken streak',
      years: [].concat.apply([], win.runs.map(function (r) { return range(r[0], r[1]); }))
    });

    var dry = longestRuns(S, function (s) { return s.outcome === 'missed'; });
    facts.push({
      title: 'Longest playoff drought',
      text: dry.n + ' straight seasons without a playoff game: ' + andList(dry.runs.map(function (r) { return r[0] + ' to ' + r[1]; })) + '.',
      math: 'mark every season that ended without a playoff game, then find the longest unbroken streak',
      years: [].concat.apply([], dry.runs.map(function (r) { return range(r[0], r[1]); }))
    });

    var most = topBy(S, function (s) { return s.wins; });
    facts.push({
      title: 'Most wins in a season',
      text: most.value + ' wins, in ' + andList(most.seasons.map(function (s) { return s.year + ' (' + rec(s) + ')'; })) + '. No Washington team has won more.',
      math: 'sort every season by wins and take the top',
      years: yearsOf(most.seasons)
    });

    var marg = topBy(S, function (s) { return (s.points_for - s.points_against) / games(s); });
    var m0 = marg.seasons[0];
    facts.push({
      title: 'Most dominant season',
      text: 'The ' + m0.year + ' ' + m0.team + ' outscored opponents by ' + perGame(m0.points_for - m0.points_against, m0) + ' points a game (' + m0.points_for + ' to ' + m0.points_against + '). ' + m0.playoff_result + '.',
      math: '(points for minus points against) divided by games played, per season, so short and long seasons compare fairly; take the highest',
      years: yearsOf(marg.seasons)
    });

    var worst = topBy(S, function (s) { return (s.points_for - s.points_against) / games(s); }, true);
    var w0 = worst.seasons[0];
    facts.push({
      title: 'Roughest season on the scoreboard',
      text: 'In ' + w0.year + ' opponents won the scoreboard by ' + perGame(w0.points_against - w0.points_for, w0) + ' points a game. The record was ' + rec(w0) + '.',
      math: '(points for minus points against) divided by games played, per season; take the lowest',
      years: yearsOf(worst.seasons)
    });

    var off = topBy(S, function (s) { return s.points_for / games(s); });
    var o0 = off.seasons[0];
    facts.push({
      title: 'Highest-scoring offense',
      text: o0.year + ' put up ' + perGame(o0.points_for, o0) + ' points a game, ' + o0.points_for + ' in all. That is the best scoring rate of any season.',
      math: 'points scored divided by games played, per season; take the highest',
      years: yearsOf(off.seasons)
    });

    var def = topBy(S, function (s) { return s.points_against / games(s); }, true);
    var d0 = def.seasons[0];
    facts.push({
      title: 'Stingiest defense',
      text: 'In ' + d0.year + ' the defense gave up ' + perGame(d0.points_against, d0) + ' points a game, the fewest of any season. Record: ' + rec(d0) + '.',
      math: 'points allowed divided by games played, per season (games were lower scoring in the early years); take the lowest',
      years: yearsOf(def.seasons)
    });

    var decades = [];
    for (var d = Math.ceil(first / 10) * 10; d + 9 <= last; d += 10) {
      var ds = S.filter(function (s) { return s.year >= d && s.year <= d + 9; });
      if (ds.length === 10) decades.push({ d: d, p: pooled(ds), trips: ds.filter(function (s) { return s.outcome !== 'missed'; }).length });
    }
    decades.sort(function (a, b) { return b.p.pct - a.p.pct; });
    var bd = decades[0];
    facts.push({
      title: 'Best decade',
      text: 'The ' + bd.d + 's went ' + bd.p.rec + ', winning ' + pctText(bd.p.pct) + ' of their games, with ' + bd.trips + ' playoff trips in 10 seasons.',
      math: 'total wins (ties as half) divided by total games for each complete decade, ' + decades.map(function (x) { return x.d + 's'; }).sort().join(', ') + '; take the highest',
      years: range(bd.d, bd.d + 9)
    });

    var eraStats = eras.map(function (e) {
      var es = S.filter(function (s) { return s.year >= e.from && s.year <= e.to; });
      return { e: e, p: pooled(es), n: es.length, trips: es.filter(function (s) { return s.outcome !== 'missed'; }).length, titles: es.filter(function (s) { return s.outcome === 'title'; }).length };
    });
    eraStats.sort(function (a, b) { return b.p.pct - a.p.pct; });
    var be = eraStats[0];
    facts.push({
      title: 'Winningest era',
      text: be.e.name + ' (' + be.e.from + ' to ' + Math.min(be.e.to, last) + ') won ' + pctText(be.p.pct) + ' of games, made the playoffs in ' + be.trips + ' of ' + be.n + ' seasons and won ' + be.titles + ' title' + (be.titles === 1 ? '' : 's') + '.',
      math: 'total wins (ties as half) divided by total games inside each era on this page; take the highest. The others: ' + eraStats.slice(1).map(function (x) { return x.e.name + ' ' + pctText(x.p.pct); }).join(', '),
      years: range(be.e.from, Math.min(be.e.to, last))
    });

    var coaches = {};
    S.forEach(function (s) {
      if (s.coaches.length !== 1) return;
      var c = s.coaches[0];
      (coaches[c] = coaches[c] || []).push(s);
    });
    var cs = Object.keys(coaches)
      .filter(function (c) { return coaches[c].length >= 3; })
      .map(function (c) { return { c: c, list: coaches[c], p: pooled(coaches[c]) }; })
      .sort(function (a, b) { return b.p.pct - a.p.pct; });
    var bc = cs[0];
    facts.push({
      title: 'Best head coach by the numbers',
      text: 'Of coaches with at least three full seasons in charge, ' + bc.c + ' won the biggest share: ' + bc.p.rec + ' (' + pctText(bc.p.pct) + ') over ' + bc.list.length + ' seasons.',
      math: 'seasons with a single head coach only, grouped by coach, minimum three seasons; total wins (ties as half) divided by total games. Playoff games not included',
      years: yearsOf(bc.list)
    });

    var jumps = [];
    for (var i = 1; i < S.length; i++) {
      if (S[i].year === S[i - 1].year + 1) jumps.push({ a: S[i - 1], b: S[i], d: pct(S[i]) - pct(S[i - 1]) });
    }
    jumps.sort(function (x, y) { return y.d - x.d; });
    var j = jumps[0];
    facts.push({
      title: 'Biggest one-year turnaround',
      text: 'From ' + rec(j.a) + ' in ' + j.a.year + ' to ' + rec(j.b) + ' in ' + j.b.year + ', a jump of ' + Math.round(j.d * 100) + ' percentage points in win %.',
      math: 'win % (ties as half) for each season minus the season before; take the biggest rise',
      years: [j.a.year, j.b.year]
    });

    var winning = S.filter(function (s) { return s.wins > s.losses; });
    var titles = S.filter(function (s) { return s.outcome === 'title'; });
    facts.push({
      title: 'The long view',
      text: winning.length + ' of ' + S.length + ' finished seasons (' + first + ' to ' + last + ') ended with a winning record. ' + titles.length + ' of them ended with a title: ' + andList(yearsOf(titles).map(String)) + '.',
      math: 'count seasons with more wins than losses; count seasons that ended with a championship or Super Bowl win',
      years: yearsOf(winning)
    });

    return facts;
  }

  function eraSince(all, from) {
    var es = all.filter(function (s) { return s.year >= from; });
    var done = es.filter(function (s) { return !s.in_progress; });
    var p = pooled(es);
    var best = done.length ? topBy(done, pct).seasons[0] : null;
    var names = {};
    es.forEach(function (s) { s.coaches.forEach(function (c) { names[c] = 1; }); });
    return {
      from: from,
      record: p.rec,
      pct: pctText(p.pct),
      trips: es.filter(function (s) { return s.outcome !== 'missed'; }).length + ' of ' + done.length,
      titles: String(es.filter(function (s) { return s.outcome === 'title'; }).length),
      best: best ? best.year + ' (' + rec(best) + ')' : 'none finished yet',
      coaches: String(Object.keys(names).length),
      years: yearsOf(es),
      live: es.some(function (s) { return s.in_progress; })
    };
  }

  var engine = { buildFacts: buildFacts, eraSince: eraSince, pct: pct, rec: rec };
  if (typeof module !== 'undefined' && module.exports) { module.exports = engine; return; }

  // ---- the page ----
  var el = document.getElementById('gameday-data');
  if (!el) return;
  var data = JSON.parse(el.textContent);
  var seasons = data.seasons;
  var byYear = {};
  seasons.forEach(function (s) { byYear[s.year] = s; });
  var facts = buildFacts(seasons, data.eras);
  var notesByYear = {};
  data.facts.forEach(function (f) {
    var y = +f.year;
    if (y) (notesByYear[y] = notesByYear[y] || []).push(f);
  });

  var barsEl = document.querySelector('[data-bars]');
  var bars = Array.prototype.slice.call(document.querySelectorAll('[data-season]'));
  var sel = 1991;
  var lit = null; // 'fact' or 'era'
  var factIdx = -1;

  function q(sel) { return document.querySelector(sel); }
  function sp(k) { return q('[data-sp="' + k + '"]'); }
  function link(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }

  // Metric switch
  var notes = {
    win: 'Bar height is the share of games won (a tie counts as half). Color shows how the season ended.',
    pf: 'Bar height is points scored per game, so 10-game and 17-game seasons compare fairly.',
    pa: 'Bar height is points allowed per game. Shorter is better here.',
    margin: 'Above the line, Washington outscored opponents. Below it, opponents won the scoreboard. Per game.'
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-metric]'), function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-metric');
      barsEl.setAttribute('data-mode', m);
      q('[data-metric-note]').textContent = notes[m];
      Array.prototype.forEach.call(document.querySelectorAll('[data-metric]'), function (o) {
        var on = o === b;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  // Season panel
  function show(year, focus) {
    var s = byYear[year];
    if (!s) return;
    sel = year;
    bars.forEach(function (b) {
      var on = +b.getAttribute('data-season') === year;
      b.classList.toggle('sel', on);
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    sp('year').textContent = String(s.year);
    sp('team').textContent = s.team;
    sp('record').textContent = rec(s) + (s.in_progress ? ' so far' : '');
    sp('points').textContent = s.points_for + ' / ' + s.points_against;
    var m = s.points_for - s.points_against;
    sp('margin').textContent = (m > 0 ? '+' : '') + m;
    sp('result').textContent = (s.in_progress ? 'Season in progress. ' : (s.playoff_result || 'Missed the playoffs') + '. ') + 'Finished ' + s.division_finish + ' in the division' + (s.in_progress ? ' so far.' : '.');
    sp('coach').textContent = (s.coaches.length > 1 ? 'Head coaches: ' : 'Head coach: ') + s.coaches.join(', ');
    var list = sp('notes');
    list.textContent = '';
    (notesByYear[year] || []).forEach(function (f) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(f.fact));
      li.appendChild(link(data.sources[f.src].url, data.sources[f.src].title));
      list.appendChild(li);
    });
    sp('source').href = s.source;
    sp('source').textContent = 'See ' + s.year + ' on Pro Football Reference';
  }
  bars.forEach(function (b) {
    b.addEventListener('click', function () { show(+b.getAttribute('data-season')); });
  });
  barsEl.addEventListener('keydown', function (e) {
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); return show(seasons[0].year, true); }
    if (e.key === 'End') { e.preventDefault(); return show(seasons[seasons.length - 1].year, true); }
    if (!step) return;
    e.preventDefault();
    show(Math.min(Math.max(sel + step, seasons[0].year), seasons[seasons.length - 1].year), true);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'), function (b) {
    b.addEventListener('click', function () {
      var y = sel + +b.getAttribute('data-step');
      if (byYear[y]) show(y);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-goto]'), function (a) {
    a.addEventListener('click', function () { show(+a.getAttribute('data-goto')); });
  });

  // Highlighting
  function light(years) {
    barsEl.classList.toggle('lit', !!years);
    bars.forEach(function (b) {
      b.classList.toggle('on', !!years && years.indexOf(+b.getAttribute('data-season')) !== -1);
    });
  }

  // Stat machine
  var factBox = q('[data-sm-fact]');
  var emptyBox = q('[data-sm-empty]');
  function sm(k) { return q('[data-sm="' + k + '"]'); }
  q('[data-run]').addEventListener('click', function () {
    var n = factIdx;
    while (n === factIdx && facts.length > 1) n = Math.floor(Math.random() * facts.length);
    factIdx = n;
    var f = facts[n];
    sm('title').textContent = f.title;
    sm('text').textContent = f.text;
    sm('math').textContent = f.math + '.';
    var check = sm('check');
    check.textContent = 'Check it: ';
    if (f.years.length <= 3) f.years.forEach(function (y) { check.appendChild(link(byYear[y].source, String(y))); });
    else check.appendChild(link(data.source.url, 'the franchise page'));
    factBox.hidden = false;
    emptyBox.hidden = true;
    lit = 'fact';
    setEraLight(false);
    light(f.years);
    if (f.years.length === 1) show(f.years[0]);
  });
  q('[data-clear]').addEventListener('click', function () {
    factIdx = -1;
    factBox.hidden = true;
    emptyBox.hidden = false;
    if (lit === 'fact') { lit = null; light(null); }
  });

  // Your era
  var eraForm = q('[data-era-form]');
  var eraOut = q('[data-era-out]');
  var eraFoot = q('[data-era-foot]');
  var eraBtn = q('[data-era-light]');
  var eraNow = null;
  function setEraLight(on) {
    eraBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    eraBtn.textContent = on ? 'Stop lighting them up' : 'Light them up on the chart';
  }
  eraForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var y = parseInt(eraForm.elements.year.value, 10);
    if (!byYear[y]) return;
    eraNow = eraSince(seasons, y);
    Object.keys(eraNow).forEach(function (k) {
      var t = q('[data-era="' + k + '"]');
      if (t) t.textContent = String(eraNow[k]);
    });
    eraOut.hidden = false;
    eraBtn.hidden = false;
    eraFoot.hidden = false;
    eraFoot.textContent = 'Regular season only' + (eraNow.live ? ', and ' + data.current + ' counts the games played so far.' : '.') + ' Playoff trips count finished seasons.';
    if (lit === 'era') light(eraNow.years);
  });
  eraBtn.addEventListener('click', function () {
    var on = eraBtn.getAttribute('aria-pressed') !== 'true';
    setEraLight(on);
    if (on && eraNow) { lit = 'era'; light(eraNow.years); }
    else if (lit === 'era') { lit = null; light(null); }
  });

  show(sel);
})();
