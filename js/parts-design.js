/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Parts Design Console (F1 Part Orders)

   Standalone module. Renders into any element given to PartsDesign.mount().
   If the script isn't included, the host page just sees no PartsDesign object
   and can fall back gracefully. All data comes from the server (edge
   function); the logged-in session is read from localStorage `btg_session`
   (set by the dashboard login). Skips silently if there is no session or the
   server says this isn't an F1 team.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var EDGE_URL = 'https://jocmjietuviegelluiev.supabase.co/functions/v1/api';

  function getSession() {
    try { return JSON.parse(localStorage.getItem('btg_session') || 'null'); } catch (e) { return null; }
  }

  async function api(action, payload) {
    var sess = getSession();
    if (!sess) return { ok: false, error: 'no_session' };
    try {
      var body = Object.assign({ action: action, username: sess.username, password: sess.password }, opts.team ? { team: opts.team } : {}, payload || {});
      var res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json().catch(function () { return { ok: false, error: 'bad_response' }; });
    } catch (e) { return { ok: false, error: 'network' }; }
  }

  /* ── state ─────────────────────────────────────────────────────────── */
  var S = null;            // catalog payload from the server
  var activePartId = null;
  var focusState = {};
  var baselineState = {};
  var activeMainTab = 'design';
  var usedCfd = 0, usedWth = 0;
  var container = null;
  var opts = {};
  var mfgPartId = null, mfgDesignId = null, mfgQty = 1, mfgApproach = 0; // 0 Normal (fast), 1 Outsource (standard)

  var CHECK_SVG = '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Race name → { flag (ISO2), short label } for the development timeline.
  var RACE_META = {
    Bahrain: { flag: 'bh', short: 'BHR' },
    Jeddah: { flag: 'sa', short: 'JED' },
    AlbertPark: { flag: 'au', short: 'AUS' },
    Suzuka: { flag: 'jp', short: 'JPN' },
    Shanghai: { flag: 'cn', short: 'CHN' },
    Miami: { flag: 'us', short: 'MIA' },
    Imola: { flag: 'it', short: 'IMO' },
    Monaco: { flag: 'mc', short: 'MCO' },
    Montreal: { flag: 'ca', short: 'CAN' },
    Barcelona: { flag: 'es', short: 'ESP' },
    RedBullRing: { flag: 'at', short: 'AUT' },
    Silverstone: { flag: 'gb', short: 'GBR' },
    Hungaroring: { flag: 'hu', short: 'HUN' },
    SpaFrancorchamps: { flag: 'be', short: 'BEL' },
    Zandvoort: { flag: 'nl', short: 'NED' },
    Monza: { flag: 'it', short: 'MNZ' },
    Baku: { flag: 'az', short: 'AZE' },
    MarinaBay: { flag: 'sg', short: 'SGP' },
    CircuitOfTheAmericas: { flag: 'us', short: 'USA' },
    HermanosRodriguez: { flag: 'mx', short: 'MEX' },
    Interlagos: { flag: 'br', short: 'BRA' },
    Vegas: { flag: 'us', short: 'LVG' },
    Qatar: { flag: 'qa', short: 'QAT' },
    YasMarina: { flag: 'ae', short: 'UAE' }
  };
  function raceMeta(name) { return RACE_META[name] || { flag: '', short: str(name).slice(0, 3).toUpperCase() }; }

  // Client-side setup programmes — for parts that haven't been committed yet, we
  // keep a stable object per part so the target race / CFD / WTH selections
  // persist across re-renders. Committed programmes come from the server (S.dev).
  var progCache = {};
  function resetProgCache() { progCache = {}; }
  /** In-universe "today". Prefers the server-provided date (app_state season
   *  state); falls back to the calendar's season year so the console never
   *  relies on the browser clock, which can be years off the game's timeline. */
  function todayStr() {
    return (S && S.today) || null;
  }
  function addDays(dateStr, days) {
    var p = String(dateStr || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return dateStr;
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  }
  function fmtDateLong(dateStr) {
    var p = String(dateStr || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return dateStr;
    var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return p[2] + ' ' + names[p[1] - 1] + ', ' + p[0];
  }
  function daysBetween(a, b) {
    var pa = String(a || '').split('-').map(Number), pb = String(b || '').split('-').map(Number);
    if (pa.length !== 3 || !pa[0] || pb.length !== 3 || !pb[0]) return 0;
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function reachableRaces(part) {
    var now = todayStr();
    var mfg = manufacturingDays(part);
    return (S.calendar || []).filter(function (c) {
      return daysBetween(now, c.race_date) - mfg >= MIN_DESIGN_DAYS;
    });
  }
  function defaultSetup(id) {
    var part = partById(id);
    var race = null;
    var now = todayStr();
    var reach = reachableRaces(part);
    reach.some(function (c) { if (weeksBetween(now, c.race_date) >= 6) { race = c; return true; } return false; });
    if (!race) race = reach[0] || null;
    return { status: 'setup', focus: {}, cfd_alloc: 0, wth_alloc: 0, target_race: race ? num(race.round) : null, target_weeks: race ? designWeeksFor(part, race) : 1, weeks_elapsed: 0, extend_count: 0, aero_test: null, correlation_mod: null, actual: null, started_at: null };
  };

  /* ── helpers ───────────────────────────────────────────────────────── */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? '' : String(v); }
  function pctFmt(v) { return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; }
  function fmtVal(v, unit, dec) {
    var n = Number(v).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return unit === '%' ? n + '%' : n + ' ' + unit;
  }
  function fmtDelta(d, unit, dec) {
    if (Math.abs(d) < 0.0000001) return '±0';
    var sign = d > 0 ? '+' : '';
    var n = d.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return sign + n + (unit === '%' ? '%' : ' ' + unit);
  }
  function fmtDeltaRange(min, max, unit, dec) { return fmtDelta(min, unit, dec) + ' to ' + fmtDelta(max, unit, dec); }
  function normRange(minV, maxV, minD, maxD) {
    if (minV > maxV) { var t = minV; minV = maxV; maxV = t; t = minD; minD = maxD; maxD = t; }
    return { minV: minV, maxV: maxV, minD: minD, maxD: maxD };
  }
  function deltaClass(d) { if (d > 0.0000001) return 'pos'; if (d < -0.0000001) return 'neg'; return 'zero'; }
  function deltaRangeClass(min, max) { if (min > 0.0000001 && max > 0.0000001) return 'pos'; if (min < -0.0000001 && max < -0.0000001) return 'neg'; return 'mixed'; }
  function weeksBetween(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    var a = new Date(dateA), b = new Date(dateB);
    return Math.max(0, Math.round((b - a) / (7 * 24 * 60 * 60 * 1000)));
  }
  function getResources() { return S ? S.resources : { cfd: 0, wth: 0 }; }
  function getAvailable() { return { cfd: Math.max(0, getResources().cfd - usedCfd), wth: Math.max(0, getResources().wth - usedWth) }; }

  /* ── data access ───────────────────────────────────────────────────── */
  function partById(id) {
    var out = null;
    (S.catalog || []).forEach(function (p) { if (num(p.part_id) === num(id)) out = p; });
    return out;
  }
  var PART_ICONS = { 3: 'chassis', 4: 'frontWing', 5: 'rearWing', 6: 'sidepods', 7: 'underfloor', 8: 'suspension' };
  function partIcon(partId) {
    var name = PART_ICONS[num(partId)];
    return name ? 'parts/' + name + '.svg' : '';
  }
  function progFor(id) {
    var p = S && S.dev && S.dev[id];
    if (p) return p;
    if (!progCache[id]) progCache[id] = defaultSetup(id);
    return progCache[id];
  }
  function baselineFor(id) {
    var st = S && S.teamState && S.teamState[id];
    if (st && st.baselines && Object.keys(st.baselines).length) return st.baselines;
    var p = partById(id);
    return (p && p.config && p.config.baselines) || {};
  }
  function statMeta(statId) {
    var out = { unit: '%', dec: 2 };
    (S.meta || []).forEach(function (m) { if (num(m.stat_id) === num(statId)) { out.unit = str(m.unit); out.dec = num(m.dec) || 2; } });
    return out;
  }

  /* ── programme math ──────────────────────────────────────────────────
     Manufacturing time is per-part and spans Factory level 1 (slow) → level 5
     (fast). Design time is whatever the target race leaves AFTER manufacturing,
     with a hard floor of MIN_DESIGN_DAYS (3 weeks). */
  var MFG_DAYS_RANGE = { 3: [28, 14], 4: [5, 3], 5: [14, 7], 6: [7, 5], 7: [21, 14], 8: [21, 14] };
  var MIN_DESIGN_DAYS = 21; // 3 weeks minimum design time
  // Real F1M24 per-part build times (days) for manufacture orders. Building
  // does not take engineers — only the Factory level speeds it up.
  var PART_BUILD_DAYS = { 3: 30, 4: 45, 5: 43, 6: 35, 7: 43, 8: 40 };
  function buildDaysFor(partId) {
    var base = num(PART_BUILD_DAYS[num(partId)]);
    if (!base) return 0;
    var speed = 1 + 0.1 * (factoryLevel() - 1);
    return Math.max(1, Math.round(base / speed));
  }
  function daysBetween(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    var a = new Date(dateA), b = new Date(dateB);
    return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
  }
  function factoryLevel() {
    var f = S && S.facilities && S.facilities.Factory;
    return f != null ? clamp(num(f), 1, 5) : 1;
  }
  function manufacturingDays(part) {
    var r = part && MFG_DAYS_RANGE[num(part.part_id)];
    if (!r) return 0;
    var lvl = factoryLevel();
    return Math.round(r[0] - (r[0] - r[1]) * (lvl - 1) / 4);
  }
  function designDaysFor(part, race) {
    if (!race) return MIN_DESIGN_DAYS;
    var total = daysBetween(todayStr(), race.race_date);
    return Math.max(MIN_DESIGN_DAYS, total - manufacturingDays(part));
  }
  function designWeeksFor(part, race) {
    return Math.round(designDaysFor(part, race) / 7);
  }
  function computeTargetWeeks(part) {
    var prog = progFor(part.part_id);
    var race = null;
    (S.calendar || []).forEach(function (c) { if (num(c.round) === num(prog.target_race)) race = c; });
    return designWeeksFor(part, race);
  }
  function computeCostScale(part) {
    var prog = progFor(part.part_id);
    var target = prog.target_weeks > 0 ? prog.target_weeks : computeTargetWeeks(part);
    return clamp(num(part.default_weeks) / Math.max(1, target), 0.3, 3.0);
  }
  /** Laps run with this part fitted (from the DB part state). Drives the
   *  "knowledge" of the part, which narrows the projected range. */
  function lapsCompleted(part) {
    var st = S && S.teamState && S.teamState[part.part_id];
    if (st && st.laps_completed != null) return num(st.laps_completed);
    var prog = progFor(part.part_id);
    if (prog && prog.laps_completed != null) return num(prog.laps_completed);
    return 0;
  }
  /** Knowledge gained from laps on this part (0..1). Full knowledge at
   *  S.lapsFullKnowledge laps (default 100). */
  function lapsKnowledge(part) {
    var full = num(S && S.lapsFullKnowledge) || 500;
    return clamp(lapsCompleted(part) / Math.max(1, full), 0, 1);
  }
  function resourceScore(cfd, wth) {
    return clamp((clamp(cfd / 70, 0, 1)) * 0.55 + (clamp(wth / 95, 0, 1)) * 0.45, 0, 1);
  }
  function timeEfficiency(targetWeeks) {
    // Design-time curve: rushing below 6 weeks reduces quality; stretching
    // past 9 weeks gives diminishing returns (a later part, not a better one).
    var t = Math.max(0, num(targetWeeks));
    if (t < 6) return clamp(0.6 + (t - 3) * 0.25, 0.6, 1.35);
    if (t <= 9) return 1.35;
    return clamp(1.35 - (t - 9) * 0.12, 0.75, 1.35);
  }
  /** Per-part range seed, from the part's real design spec: longer manufacturing
   *  time = a wider uncertainty band. Per-team narrowing comes from lap knowledge
   *  (lapsKnowledge). No random/arbitrary values. */
  function rangeSeed(part) {
    var mfg = num(part && part.mfg_weeks);
    return mfg > 0 ? (0.6 + mfg * 0.1) : 1;
  }
  function finalEnvelope(part, prog) {
    var tWeeks = prog.target_weeks > 0 ? prog.target_weeks : computeTargetWeeks(part);
    var rScore = resourceScore(prog.cfd_alloc, prog.wth_alloc);
    var tEff = timeEfficiency(tWeeks);
    var resBestBonus = rScore * 12, resWorstBonus = rScore * 4;
    var timeMul = 0.7 + 0.3 * tEff;
    var extendBoost = Math.min(num(prog.extend_count) * 0.4, 2.5);
    var worst = -5 + resWorstBonus * timeMul * 0.8 + extendBoost * 0.3;
    var best = 8 + resBestBonus * timeMul * 1.2 + extendBoost * 1.2;
    // Per-team+part seed: rescale the band width around its midpoint so each
    // team and each part gets a distinct uncertainty.
    var mid = (worst + best) / 2;
    var width = (best - worst) * rangeSeed(part);
    worst = mid - width / 2;
    best = mid + width / 2;
    // Lap knowledge narrows the band toward the expected value: the more laps
    // run with this part, the better we know its true performance.
    var k = lapsKnowledge(part);
    if (k > 0) { worst += (mid - worst) * k * 0.7; best -= (best - mid) * k * 0.7; }
    return { worst: clamp(worst, -10, 8), best: clamp(best, 0, 28) };
  }
  function currentEnvelope(part, prog) {
    var p = prog.target_weeks > 0 ? clamp(num(prog.weeks_elapsed) / num(prog.target_weeks), 0, 1) : 0;
    var fin = finalEnvelope(part, prog);
    var worst = fin.worst + (fin.worst - (-5)) * p * 0.6;
    var best = fin.best + (fin.best - 8) * p * 0.5;
    return { worst: clamp(worst, fin.worst, 0), best: clamp(best, 2, fin.best + 2), progress: p };
  }
  function expectedSkewedFraction() { return (0.5 + 0.5 + 2 / 3) / 3; }
  function confidenceLabel(prog) {
    var total = num(prog.cfd_alloc) + num(prog.wth_alloc);
    if (total === 0) return 'Low';
    var share = num(prog.wth_alloc) / total;
    if (share > 0.55) return 'High';
    if (share > 0.30) return 'Moderate';
    return 'Low';
  }
  function gradientCss(worst, best, markerFrac) {
    var m = clamp(markerFrac, 0, 1) * 100;
    var stops = [
      [0, 'var(--ember-hot)'], [Math.max(0, m - 34), 'var(--brass)'], [Math.max(0, m - 12), 'var(--moss)'],
      [Math.min(100, m + 12), 'var(--moss)'], [Math.min(100, m + 34), 'var(--brass)'], [100, 'var(--ember-hot)']
    ];
    return 'linear-gradient(90deg, ' + stops.map(function (s) { return s[1] + ' ' + s[0] + '%'; }).join(', ') + ')';
  }

  function updateResourceUsage() {
    var cfd = 0, wth = 0;
    Object.keys(S && S.dev || {}).forEach(function (pid) {
      var p = S.dev[pid];
      if (['developing', 'delayed', 'tested', 'introduced'].indexOf(str(p.status)) !== -1) { cfd += num(p.cfd_alloc); wth += num(p.wth_alloc); }
    });
    // Include pending (not yet committed) setup allocations so the topbar
    // reflects what is effectively reserved across all parts.
    Object.keys(progCache).forEach(function (pid) {
      var p = progCache[pid];
      cfd += num(p.cfd_alloc); wth += num(p.wth_alloc);
    });
    usedCfd = cfd; usedWth = wth;
  }

  /* ── Car performance VIEW (server-computed uncertain ranges) ──────────────
     The client never receives the true car stats or raw part values — only the
     current uncertain range per row (S.carView) and a LOCAL design model per
     part (S.designs[part].car + .model): the reference impact range at neutral
     focus/0 hours plus per-row shift coefficients for each focus stat and for
     CFD/WTH. Slider changes are evaluated LOCALLY (instant, no round-trip). */
  function devEffortFor(prog, m) {
    var effort = num(prog.cfd_alloc) + num(prog.wth_alloc) / (m.wthPerCfd || 10) + num(prog.target_weeks) / (m.weeksPerCfd || 4);
    return Math.pow(Math.max(0, effort), m.devDiminish != null ? m.devDiminish : 0.5);
  }
  function designImpactFor(part) {
    if (!part) return null;
    var d = S && S.designs && S.designs[part.part_id];
    if (!d) return null;
    var m = d.model;
    if (!m) return d.car || null;
    var prog = progFor(part.part_id);
    var dev = devEffortFor(prog, m);
    var out = {};
    Object.keys(d.car || {}).forEach(function (rowKey) {
      var base = d.car[rowKey];
      if (!base || base.lo == null || base.hi == null) { out[rowKey] = null; return; }
      var shift = 0;
      Object.keys(m.focus || {}).forEach(function (sid) {
        var f = focusState && focusState[sid] != null ? clamp(num(focusState[sid]), 0, 1) : 0.5;
        var coeff = (m.focus[sid] || {})[rowKey];
        if (coeff) shift += coeff * (f - 0.5);
      });
      shift += ((m.dev || {})[rowKey] || 0) * dev;
      out[rowKey] = { lo: base.lo + shift, hi: base.hi + shift };
    });
    return out;
  }

  /* ── stat model (REAL: fitted part stat in display units + focus/dev) ──── */
  function statRealView(part, statId) {
    var d = S && S.designs && S.designs[part.part_id];
    var m = d && d.model, sv = m && m.stats && m.stats[statId];
    if (!sv) return null;
    var prog = progFor(part.part_id);
    var dev = devEffortFor(prog, m);
    var focusShift = 0;
    Object.keys(sv.focusShift || {}).forEach(function (sid) {
      var f = focusState && focusState[sid] != null ? clamp(num(focusState[sid]), 0, 1) : 0.5;
      focusShift += (sv.focusShift[sid] || 0) * (f - 0.5);
    });
    var devCont = (sv.devShift || 0) * dev;
    return { fitted: sv.fitted, focusShift: focusShift, devCont: devCont, delta: focusShift + devCont };
  }

  /* ── modal (no browser alerts) ─────────────────────────────────────── */
  function modalRoot() {
    var m = document.getElementById('pd-modal-root');
    if (!m) { m = document.createElement('div'); m.id = 'pd-modal-root'; document.body.appendChild(m); }
    return m;
  }
  function showModal(title, message, buttons) {
    return new Promise(function (resolve) {
      var root = modalRoot();
      root.innerHTML = '<div class="pd-overlay"><div class="pd-modal"><div class="pd-modal-head"><span>' + title + '</span><button class="pd-modal-x" type="button">&times;</button></div><div class="pd-modal-body"><p class="pd-modal-text">' + message + '</p></div><div class="pd-modal-actions"></div></div></div>';
      var close = function (val) { root.innerHTML = ''; resolve(val); };
      root.querySelector('.pd-modal-x').addEventListener('click', function () { close(null); });
      root.addEventListener('click', function (e) { if (e.target === root.firstChild) close(null); });
      var actions = root.querySelector('.pd-modal-actions');
      (buttons || [{ label: 'OK', value: true, primary: true }]).forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-compact ' + (b.primary ? 'btn-primary' : 'btn-ghost') + (b.danger ? ' btn-danger' : '');
        btn.innerHTML = '<span>' + b.label + '</span>';
        btn.addEventListener('click', function () { close(b.value); });
        actions.appendChild(btn);
      });
    });
  }
  function alertModal(message, title) { return showModal(title || 'Parts Design', message, [{ label: 'OK', value: true, primary: true }]); }
  function confirmModal(message, title) { return showModal(title || 'Parts Design', message, [{ label: 'Cancel', value: false }, { label: 'Confirm', value: true, primary: true, danger: true }]); }

  /* ── shell ─────────────────────────────────────────────────────────── */
  function shellHtml() {
    return '<div class="pd-topbar">'
      + '<div class="tb-group"><span class="tb-label">Championship</span><span class="tb-resource">Position <b id="pd-position">—</b></span></div>'
      + '<div class="tb-divider"></div>'
      + '<div class="tb-group">'
      + '<span class="tb-resource">CFD <b id="cfd-total">0</b> MAu · used <b class="used" id="cfd-used">0</b></span>'
      + '<span class="tb-resource">WTH <b id="wth-total">0</b> h · used <b class="used" id="wth-used">0</b></span>'
      + '</div>'
      + '</div>'
      + '<div class="pd-maintabs" id="pd-maintabs">'
      + '<div class="pd-maintab active" data-tab="design" id="tab-design">Design Focus</div>'
      + '<div class="pd-maintab" data-tab="development" id="tab-development">In Development <span id="dev-badge" class="pdo-badge" style="display:none">0</span></div>'
      + '<div class="pd-maintab" data-tab="manufacture" id="tab-manufacture">Manufacture <span id="mfg-badge" class="pdo-badge" style="display:none">0</span></div>'
      + '</div>'
      + '<div id="pd-design-view">'
      + '<div class="pd-parttabs" id="pd-parttabs"></div>'
      + '<div class="pd-top" id="pd-top">'
      + '<div class="pd-title-block"><div class="eyebrow-mini">Technical Directorate — Parts Design</div>'
      + '<h1 id="pd-part-name">—</h1><div class="pd-sub" id="pd-part-desc"></div></div>'
      + '<div class="pd-meta-pills">'
      + '<div class="pd-pill">Design work <b id="pd-designwork">—</b></div>'
      + '<div class="pd-pill">Design cost <b id="pd-designcost">—</b></div>'
      + '<div class="pd-pill">Build cost <b id="pd-buildcost">—</b></div>'
      + '</div></div>'
      + '<div class="pd-grid" id="pd-grid">'
      + '<div id="pd-left-col">'
      + '<div class="pd-programme" id="pd-programme"></div>'
      + '<div id="pd-categories"></div>'
      + '<div class="pd-actions">'
      + '<button class="btn btn-ghost" id="btn-reset"><span>Reset to balanced</span></button>'
      + '<button class="btn btn-primary" id="btn-commit"><span>Commit design focus</span></button>'
      + '</div>'
      + '<div class="pd-footnote">Sliders set design focus per attribute (0–100%). Design focus, CFD/WTH allocation and planned time are committed together to start development. Ranges reflect development uncertainty.</div>'
      + '</div>'
      + '<div class="cp-card">'
      + '<div class="cp-head"><h2>Car Performance</h2><div class="cp-overall">vs. currently fitted spec · estimated range</div></div>'
      + '<div id="cp-body"></div>'
      + '<div id="pd-timeline"></div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div id="pd-development-view" style="display:none;"><div id="pd-dev-list"></div></div>'
      + '<div id="pd-manufacture-view" style="display:none;"></div>';
  }

  /* ── renderers ─────────────────────────────────────────────────────── */
  function renderTopbar() {
    var r = getResources();
    el('cfd-total').textContent = r.cfd; el('wth-total').textContent = r.wth;
    el('cfd-used').textContent = usedCfd; el('wth-used').textContent = usedWth;
    el('pd-position').textContent = S && S.position ? 'P' + S.position : '—';
  }
  function el(id) { return document.getElementById(id); }

  function renderMainTabs() {
    var devCount = 0;
    Object.keys(S && S.dev || {}).forEach(function (pid) {
      if (['developing', 'delayed', 'tested', 'introduced'].indexOf(str(S.dev[pid].status)) !== -1) devCount++;
    });
    var badge = el('dev-badge');
    if (devCount > 0) { badge.textContent = devCount; badge.style.display = ''; } else { badge.style.display = 'none'; }
    var mfgCount = (S && S.orders || []).filter(function (o) { return str(o.status) === 'building'; }).length;
    var mBadge = el('mfg-badge');
    if (mBadge) {
      if (mfgCount > 0) { mBadge.textContent = mfgCount; mBadge.style.display = ''; } else { mBadge.style.display = 'none'; }
    }
    el('tab-design').className = 'pd-maintab' + (activeMainTab === 'design' ? ' active' : '');
    el('tab-development').className = 'pd-maintab' + (activeMainTab === 'development' ? ' active' : '');
    el('tab-manufacture').className = 'pd-maintab' + (activeMainTab === 'manufacture' ? ' active' : '');
  }

  function renderPartTabs() {
    var wrap = el('pd-parttabs'); wrap.innerHTML = '';
    (S.catalog || []).forEach(function (p) {
      var prog = progFor(p.part_id);
      var tab = document.createElement('div');
      tab.className = 'pd-parttab' + (num(p.part_id) === num(activePartId) ? ' active' : '') + (p.locked ? ' locked' : '');
      var statusText = '', statusCls = '';
      if (prog.status === 'setup') statusText = 'Not started';
      else if (prog.status === 'developing') { statusText = 'In dev'; statusCls = 'live'; }
      else if (prog.status === 'delayed') statusText = 'Delayed';
      else if (prog.status === 'tested') { statusText = 'Tested'; statusCls = 'testing'; }
      else if (prog.status === 'introduced') { statusText = 'Introduced'; statusCls = 'live'; }
      else if (prog.status === 'revealed') { statusText = 'Revealed'; statusCls = 'done'; }
      tab.innerHTML = '<span class="pt-name">' + str(p.name) + '</span><span class="pt-tag">' + str(p.tag) + '</span>'
        + (statusText ? '<span class="pt-status ' + statusCls + '">' + statusText + '</span>' : '');
      tab.addEventListener('click', function () { selectPart(p.part_id); });
      wrap.appendChild(tab);
    });
  }

  function renderHeader(part) {
    var scale = computeCostScale(part);
    var designWork = Math.round(num(part.design_work) * scale);
    var designCost = Math.round(num(part.design_cost) * scale);
    var buildCost = Math.round(num(part.build_cost) * scale);
    el('pd-part-name').textContent = str(part.name);
    el('pd-part-desc').textContent = part.locked ? 'Fixed specification — no in-house design focus available' : 'Design · targeting introduction at the next available race weekend';
    el('pd-designwork').textContent = designWork.toLocaleString();
    el('pd-designcost').textContent = '$' + designCost.toLocaleString();
    el('pd-buildcost').textContent = '$' + buildCost.toLocaleString();
  }

  function renderProgramme(part) {
    var wrap = el('pd-programme'); wrap.innerHTML = '';
    if (part.locked) {
      wrap.innerHTML = '<div class="pd-locked-notice"><strong>' + str(part.name) + ' — no design focus to allocate.</strong><br>This part has a fixed specification.</div>';
      return;
    }
    var prog = progFor(part.part_id);
    var stageMap = { setup: ['Setup', ''], developing: ['In development', 'live'], delayed: ['Delayed', 'paused'], tested: ['Testing complete', 'testing'], introduced: ['Introduced — awaiting track run', 'live'], revealed: ['Result revealed', 'done'] };
    var stage = stageMap[prog.status] || ['Unknown', ''];
    var card = document.createElement('div'); card.className = 'pd-programme';
    var head = document.createElement('div'); head.className = 'pdp-head';
    head.innerHTML = '<h3>Development Programme</h3><span class="pdp-stage ' + stage[1] + '">' + stage[0] + '</span>';
    card.appendChild(head);
    var body = document.createElement('div'); body.className = 'pdp-body';

    if (prog.status === 'setup') {
      // target race
      var rowRace = document.createElement('div'); rowRace.className = 'pdp-row';
      rowRace.innerHTML = '<div class="pdp-row-label">Target race</div><select id="pdp-targetrace"></select><div class="pdp-row-val" id="pdp-targetrace-val"></div>';
      var sel = rowRace.querySelector('select');
      var reach = reachableRaces(part);
      if (!reach.length) {
        prog.target_race = null; prog.target_weeks = 1;
        rowRace.innerHTML = '<div class="pdp-row-label">Target race</div><div class="pdp-row-val">No reachable races this season</div>';
      } else {
        reach.forEach(function (r) {
          var opt = document.createElement('option'); opt.value = r.round; opt.textContent = str(r.name) + ' (' + String(r.race_date).slice(0, 10).slice(5) + ')';
          if (num(r.round) === num(prog.target_race)) opt.selected = true;
          sel.appendChild(opt);
        });
        var targetWeeks = computeTargetWeeks(part); prog.target_weeks = targetWeeks;
        var mfgDays = manufacturingDays(part);
        rowRace.querySelector('#pdp-targetrace-val').textContent = targetWeeks + 'w design · ' + mfgDays + 'd mfg';
        sel.addEventListener('change', function () { prog.target_race = parseInt(sel.value, 10); prog.target_weeks = computeTargetWeeks(part); renderProgramme(part); renderHeader(part); renderCarPerformance(); refreshStatDisplays(part); });
      }
      body.appendChild(rowRace);

      // Start button state — kept in sync as allocations change
      var btnStart = null;
      var syncStart = function () {
        if (!btnStart) return;
        btnStart.disabled = !(num(prog.cfd_alloc) > 0 || num(prog.wth_alloc) > 0) || !num(prog.target_race);
      };

      // CFD slider
      var avail = getAvailable();
      var cfdMax = Math.max(1, Math.min(avail.cfd + num(prog.cfd_alloc), getResources().cfd));
      var rowCfd = document.createElement('div'); rowCfd.className = 'pdp-row';
      rowCfd.innerHTML = '<div class="pdp-row-label">CFD allocation</div><div class="ps-slider-wrap"><input type="range" id="pdp-cfd" min="0" max="' + cfdMax + '" step="1" value="' + (num(prog.cfd_alloc)) + '" class="ps-focus-input" style="--fill:' + Math.round(num(prog.cfd_alloc) / cfdMax * 100) + '%"><span class="ps-focus-pct" id="pdp-cfd-pct">' + Math.round(num(prog.cfd_alloc) / cfdMax * 100) + '%</span></div><div class="pdp-row-val" id="pdp-cfd-val">' + (num(prog.cfd_alloc)) + ' MAu</div>';
      var cfdSlider = rowCfd.querySelector('#pdp-cfd');
      cfdSlider.addEventListener('input', function () {
        var v = parseInt(cfdSlider.value, 10); prog.cfd_alloc = v;
        var pct = Math.round(v / cfdMax * 100); cfdSlider.style.setProperty('--fill', pct + '%');
        rowCfd.querySelector('#pdp-cfd-pct').textContent = pct + '%'; rowCfd.querySelector('#pdp-cfd-val').textContent = v + ' MAu';
        updateResourceUsage(); renderTopbar(); renderCarPerformance(); syncStart(); refreshStatDisplays(part);
      });
      body.appendChild(rowCfd);

      // WTH slider
      var wthMax = Math.max(1, Math.min(avail.wth + num(prog.wth_alloc), getResources().wth));
      var rowWth = document.createElement('div'); rowWth.className = 'pdp-row';
      rowWth.innerHTML = '<div class="pdp-row-label">WTH allocation</div><div class="ps-slider-wrap"><input type="range" id="pdp-wth" min="0" max="' + wthMax + '" step="1" value="' + (num(prog.wth_alloc)) + '" class="ps-focus-input" style="--fill:' + Math.round(num(prog.wth_alloc) / wthMax * 100) + '%"><span class="ps-focus-pct" id="pdp-wth-pct">' + Math.round(num(prog.wth_alloc) / wthMax * 100) + '%</span></div><div class="pdp-row-val" id="pdp-wth-val">' + (num(prog.wth_alloc)) + ' h</div>';
      var wthSlider = rowWth.querySelector('#pdp-wth');
      wthSlider.addEventListener('input', function () {
        var v = parseInt(wthSlider.value, 10); prog.wth_alloc = v;
        var pct = Math.round(v / wthMax * 100); wthSlider.style.setProperty('--fill', pct + '%');
        rowWth.querySelector('#pdp-wth-pct').textContent = pct + '%'; rowWth.querySelector('#pdp-wth-val').textContent = v + ' h';
        updateResourceUsage(); renderTopbar(); renderCarPerformance(); syncStart(); refreshStatDisplays(part);
      });
      body.appendChild(rowWth);

      var costNote = document.createElement('div'); costNote.className = 'pdp-caption';
      costNote.innerHTML = 'Design <b>' + prog.target_weeks + ' weeks</b> (min 3) · Manufacturing <b>' + manufacturingDays(part) + ' days</b> at Factory L' + factoryLevel();
      body.appendChild(costNote);

      var actions = document.createElement('div'); actions.className = 'pdp-actions';
      btnStart = document.createElement('button'); btnStart.className = 'btn btn-primary btn-compact'; btnStart.innerHTML = '<span>Commit & start development</span>';
      syncStart();
      btnStart.addEventListener('click', function () { doCommit(part.part_id); });
      var btnScrap = document.createElement('button'); btnScrap.className = 'btn btn-ghost btn-compact'; btnScrap.innerHTML = '<span>Scrap</span>';
      btnScrap.addEventListener('click', function () { doScrap(part.part_id); });
      actions.appendChild(btnStart); actions.appendChild(btnScrap);
      body.appendChild(actions);
    } else if (prog.status === 'revealed') {
      var notice = document.createElement('div'); notice.className = 'pd-locked-notice';
      notice.innerHTML = '<strong>' + str(part.name) + ' — design complete.</strong><br>The track correlation result has been baked into this part. You may start a new development programme.';
      body.appendChild(notice);
      var actions2 = document.createElement('div'); actions2.className = 'pdp-actions';
      var btnNew = document.createElement('button'); btnNew.className = 'btn btn-primary btn-compact'; btnNew.innerHTML = '<span>Start new development</span>';
      btnNew.addEventListener('click', function () { doStartNew(part.part_id); });
      actions2.appendChild(btnNew); body.appendChild(actions2);
    } else {
      var notice2 = document.createElement('div'); notice2.className = 'pd-locked-notice';
      notice2.innerHTML = '<strong>' + str(part.name) + ' is currently in development.</strong><br>Switch to the <b>In Development</b> tab to manage this programme, view projections, and continue work.';
      body.appendChild(notice2);
    }
    card.appendChild(body);
    wrap.appendChild(card);
  }

  function renderCategories(part) {
    var wrap = el('pd-categories'); wrap.innerHTML = '';
    if (part.locked) { wrap.innerHTML = '<div class="pd-locked-notice"><strong>' + str(part.name) + ' — no design focus to allocate.</strong><br>Fixed specification.</div>'; return; }
    (part.config.categories || []).forEach(function (cat) {
      var card = document.createElement('div'); card.className = 'pd-cat-card';
      var head = document.createElement('div'); head.className = 'pd-cat-head'; head.innerHTML = '<h3>' + str(cat.title) + '</h3>';
      card.appendChild(head);
      (cat.stats || []).forEach(function (sid) { card.appendChild(buildStatRow(part, sid)); });
      wrap.appendChild(card);
    });
  }

  function buildStatRow(part, statId) {
    var meta = statMeta(statId);
    var label = (part.config.labels || {})[statId] || ('Stat ' + statId);
    var row = document.createElement('div'); row.className = 'pd-stat-row'; row.dataset.stat = statId;
    var v = statRealView(part, statId);
    var val = v ? v.fitted + v.delta : null;
    var delta = v ? v.delta : null;
    var allocText = v ? (num(statId) === 15 ? 'Weight focus only' : 'Dev ' + fmtDelta(v.devCont, meta.unit, meta.dec)) : '';
    row.innerHTML = '<div class="ps-label">' + label + '</div><div class="ps-val" id="val-' + statId + '">' + (val != null ? fmtVal(val, meta.unit, meta.dec) : '—') + '</div><div class="ps-delta ' + deltaClass(delta != null ? delta : 0) + '" id="delta-' + statId + '">' + (delta != null ? fmtDelta(delta, meta.unit, meta.dec) : '') + '</div><div class="ps-slider-wrap"><input type="range" min="0" max="100" value="' + Math.round((focusState[statId] || 0.5) * 100) + '" class="ps-focus-input" id="slider-' + statId + '" style="--fill:' + Math.round((focusState[statId] || 0.5) * 100) + '%"><span class="ps-focus-pct" id="pct-' + statId + '">' + Math.round((focusState[statId] || 0.5) * 100) + '%</span></div><div class="ps-alloc" id="alloc-' + statId + '">' + allocText + '</div>';
    var slider = row.querySelector('#slider-' + statId);
    slider.addEventListener('input', function (e) {
      var f = parseInt(e.target.value, 10) / 100; focusState[statId] = f;
      e.target.style.setProperty('--fill', Math.round(f * 100) + '%');
      row.querySelector('#pct-' + statId).textContent = Math.round(f * 100) + '%';
      // Keep the setup programme's focus in sync so it survives part switches.
      if (!(S && S.dev && S.dev[part.part_id])) {
        var sp = progFor(part.part_id);
        if (sp) sp.focus = Object.assign({}, focusState);
      }
      refreshStatDisplays(part); renderCarPerformance();
    });
    return row;
  }

  function refreshStatDisplays(part) {
    var sv = (S && S.designs && S.designs[part.part_id] && S.designs[part.part_id].model && S.designs[part.part_id].model.stats) || {};
    Object.keys(sv).forEach(function (statId) {
      var meta = statMeta(statId);
      var v = statRealView(part, statId);
      var valEl = el('val-' + statId), deltaEl = el('delta-' + statId), allocEl = el('alloc-' + statId);
      if (v && valEl) valEl.textContent = fmtVal(v.fitted + v.delta, meta.unit, meta.dec);
      if (v && deltaEl) { deltaEl.textContent = fmtDelta(v.delta, meta.unit, meta.dec); deltaEl.className = 'ps-delta ' + deltaClass(v.delta); }
      if (allocEl) allocEl.textContent = v ? (num(statId) === 15 ? 'Weight focus only' : 'Dev ' + fmtDelta(v.devCont, meta.unit, meta.dec)) : '';
    });
  }

  /** Knowledge of the currently fitted parts, from laps completed with them
   *  (both cars carry identical parts, so 500 team-laps = 2 x 250 laps = full
   *  knowledge). 0 laps = no knowledge → the seeded (widest) range. */
  var KNOWLEDGE_LAPS = 500;
  function knowledgeFactor() {
    var total = 0, count = 0;
    Object.keys(S && S.teamState || {}).forEach(function (pid) {
      var st = S.teamState[pid];
      var laps = st ? (st.laps_completed != null ? num(st.laps_completed) : num(st.laps)) : 0;
      if (laps > 0) { total += laps; count++; }
    });
    var laps = count ? total / count : 0;
    return clamp(laps / KNOWLEDGE_LAPS, 0, 1);
  }

  /* ── Development timeline: today → design (colour 1) → manufacture
     (colour 2) → target race, with the season calendar plotted as flags +
     shortened names (same visual language as the save viewer's team history). */
  function renderTimeline(part) {
    var wrap = el('pd-timeline'); if (!wrap || !part) return;
    var cal = S.calendar || [];
    if (!cal.length) { wrap.innerHTML = ''; return; }
    var now = todayStr();
    var mfg = manufacturingDays(part);
    var prog = progFor(part.part_id);
    var race = null;
    cal.forEach(function (c) { if (num(c.round) === num(prog.target_race)) race = c; });
    var designDays = designDaysFor(part, race);
    var spanDays = race ? Math.max(1, daysBetween(now, race.race_date)) : 1;
    var pct = function (d) { return clamp(d / spanDays * 100, 0, 100); };
    var designEnd = Math.min(spanDays, designDays);
    var mfgEnd = spanDays;
    var c1 = (S.teamColors && S.teamColors.primary) || 'var(--team-accent)';
    var c2 = (S.teamColors && S.teamColors.secondary) || 'var(--team-accent-hot)';

    var html = '<div class="pd-tl-head">'
      + '<span class="pd-tl-title">Development timeline</span>'
      + '<span class="pd-tl-legend"><i style="background:' + c1 + '"></i>Design ' + designDays + 'd</span>'
      + '<span class="pd-tl-legend"><i style="background:' + c2 + '"></i>Manufacture ' + mfg + 'd</span>'
      + (race ? '<span class="pd-tl-legend pd-tl-target">➜ ' + str(raceMeta(str(race.name)).short) + ' ' + str(race.race_date).slice(0, 10) + '</span>' : '')
      + '</div>'
      + '<div class="pd-tl-track">'
      + '<div class="pd-tl-bar" style="left:0%; width:' + pct(designEnd) + '%; background:' + c1 + '"></div>'
      + '<div class="pd-tl-bar pd-tl-mfg" style="left:' + pct(designEnd) + '%; width:' + Math.max(0, pct(mfgEnd) - pct(designEnd)) + '%; background:' + c2 + '"></div>'
      + '<div class="pd-tl-now" style="left:0%"></div>';
    cal.forEach(function (c) {
      if (race && str(c.race_date) > str(race.race_date)) return;
      var x = pct(daysBetween(now, c.race_date));
      var meta = raceMeta(str(c.name));
      var isTarget = race && num(c.round) === num(race.round);
      html += '<div class="pd-tl-marker' + (isTarget ? ' target' : '') + '" style="left:' + x + '%">'
        + '<span class="pd-tl-flag">' + (meta.flag ? '<img src="Flags/' + meta.flag + '.svg" alt="" onerror="this.style.display=\'none\'">' : '') + '</span>'
        + '<span class="pd-tl-name">' + str(meta.short) + '</span>'
        + '</div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
  }

  function renderCarPerformance() {
    var part = partById(activePartId); var wrap = el('cp-body'); if (!part || !wrap) return;
    wrap.innerHTML = '';
    var rows = S.carView || [];
    var impact = designImpactFor(part) || {};
    var currentGroup = null;
    rows.forEach(function (r) {
      if (r.grp !== currentGroup) { currentGroup = r.grp; var gl = document.createElement('div'); gl.className = 'cp-section-label'; gl.textContent = currentGroup; wrap.appendChild(gl); }
      var rowEl = document.createElement('div'); rowEl.className = 'cp-row';
      if (!r.has || r.lo == null || r.hi == null) {
        rowEl.innerHTML = '<div class="cp-top"><span class="cp-label">' + str(r.label) + '</span></div>'
          + '<div class="cp-bottom"><span class="cp-val">—</span></div>';
        wrap.appendChild(rowEl);
        return;
      }
      var imp = impact[r.row_key] || null;
      var html = '<div class="cp-top"><span class="cp-label">' + str(r.label) + '</span></div>';
      html += '<div class="cp-bottom"><span class="cp-val">' + fmtVal(r.lo, r.unit, r.dec) + ' – ' + fmtVal(r.hi, r.unit, r.dec) + '</span>';
      if (imp && (num(imp.lo) !== 0 || num(imp.hi) !== 0)) {
        html += '<span class="cp-new ' + deltaRangeClass(imp.lo, imp.hi) + '">' + fmtDeltaRange(num(imp.lo), num(imp.hi), r.unit, r.dec) + '</span>';
      }
      html += '</div>';
      rowEl.innerHTML = html;
      wrap.appendChild(rowEl);
    });
    renderTimeline(part);
  }

  function selectPart(id) {
    // Persist the current part's focus before switching so it survives tab changes.
    if (activePartId != null && num(activePartId) !== num(id)) {
      var cur = partById(activePartId);
      if (cur && !cur.locked && !(S && S.dev && S.dev[cur.part_id])) {
        var cp = progFor(cur.part_id);
        if (cp) cp.focus = Object.assign({}, focusState);
      }
    }
    activePartId = id; var part = partById(id); if (part && !part.locked) initPartState(part);
    renderPartTabs(); renderHeader(part); renderProgramme(part); renderCategories(part); renderCarPerformance();
    syncEditButtons(part);
  }

  function initPartState(part) {
    var b = baselineFor(part.part_id);
    var saved = null;
    var dev = S && S.dev && S.dev[part.part_id];
    var prog = progFor(part.part_id);
    if (dev && dev.focus && Object.keys(dev.focus).length) saved = dev.focus;
    else if (prog && prog.focus && Object.keys(prog.focus).length) saved = prog.focus;
    focusState = {}; baselineState = {};
    Object.keys(b).forEach(function (k) {
      focusState[k] = (saved && saved[k] != null) ? clamp(num(saved[k]), 0, 1) : 0.5;
      baselineState[k] = b[k];
    });
  }

  /* ── development view ──────────────────────────────────────────────── */
  function renderDevelopmentView() {
    var wrap = el('pd-dev-list'); wrap.innerHTML = '';
    var activeIds = [];
    Object.keys(S && S.dev || {}).forEach(function (pid) {
      if (['developing', 'delayed', 'tested', 'introduced'].indexOf(str(S.dev[pid].status)) !== -1) activeIds.push(pid);
    });
    if (!activeIds.length) { wrap.innerHTML = '<div class="pdo-empty">No parts are currently in development. Switch to <b>Design Focus</b> and select a part to start a new programme.</div>'; return; }
    var list = document.createElement('div'); list.className = 'pdo-list';
    activeIds.forEach(function (pid) { list.appendChild(buildDevelopmentCard(num(pid))); });
    wrap.appendChild(list);
  }

  function renderManufactureView() {
    var wrap = el('pd-manufacture-view'); wrap.innerHTML = '';
    var orders = (S && S.orders) || [];
    var designs = (S && S.designsList) || [];
    var catalog = (S && S.catalog) || [];

    // Pick the selected part (default to the first that has designs).
    var partIds = catalog.map(function (p) { return num(p.part_id); });
    if (mfgPartId == null || partIds.indexOf(num(mfgPartId)) < 0) {
      mfgPartId = partIds.length ? partIds[0] : null;
    }
    var partDesigns = designs.filter(function (d) { return num(d.part_id) === num(mfgPartId); });
    if (!partDesigns.some(function (d) { return num(d.design_id) === num(mfgDesignId); })) {
      mfgDesignId = partDesigns.length ? num(partDesigns[0].design_id) : null;
    }
    var design = partDesigns.filter(function (d) { return num(d.design_id) === num(mfgDesignId); })[0] || null;
    var part = partById(mfgPartId);

    // Two-column layout: part list on the left, detail on the right.
    var lay = document.createElement('div'); lay.className = 'pd-mfg-layout';

    var nav = document.createElement('div'); nav.className = 'pd-mfg-nav';
    var navHead = document.createElement('div'); navHead.className = 'pd-mfg-nav-head';
    navHead.textContent = 'Parts';
    nav.appendChild(navHead);
    catalog.forEach(function (p) {
      var pid = num(p.part_id);
      var dCount = designs.filter(function (d) { return num(d.part_id) === pid; }).length;
      var ico = partIcon(pid);
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'pd-mfg-nav-item' + (pid === num(mfgPartId) ? ' active' : '');
      item.innerHTML = (ico ? '<span class="pd-mfg-ico"><img src="' + ico + '" alt=""></span>' : '')
        + '<span class="pd-mfg-nav-name">' + str(p.name) + '</span>'
        + (dCount > 0 ? '<span class="pd-mfg-nav-count">' + dCount + '</span>' : '');
      item.addEventListener('click', function () { mfgPartId = pid; mfgDesignId = null; renderManufactureView(); });
      nav.appendChild(item);
    });
    lay.appendChild(nav);

    var right = document.createElement('div'); right.className = 'pd-mfg-detail';

    // Choose design — clickable cards for the selected part.
    var choose = document.createElement('div'); choose.className = 'pd-programme';
    var cHtml = '<div class="pdp-head"><h3>Choose design</h3></div><div class="pdp-body">'
      + '<div class="pdp-caption">Choose which <b>' + (part ? str(part.name) : 'part') + '</b> design to manufacture more copies of.</div>';
    if (!partDesigns.length) {
      cHtml += '<div class="muted">No designs for this part yet.</div>';
    } else {
      cHtml += '<div class="pd-design-list">';
      partDesigns.forEach(function (d) {
        var ico = partIcon(d.part_id);
        var mName = str(d.name) || str(d.part_name) || ('Part ' + d.part_id);
        var active = num(d.design_id) === num(mfgDesignId);
        cHtml += '<button type="button" class="pd-design-card' + (active ? ' active' : '') + '" data-design="' + d.design_id + '">'
          + (ico ? '<span class="pd-mfg-ico"><img src="' + ico + '" alt=""></span>' : '')
          + '<span class="pd-design-info"><span class="pd-mfg-name">' + mName + '</span>'
          + '<span class="pd-mfg-sub">Installed on both cars</span></span>'
          + '<span class="pd-design-meta"><span class="pd-design-stock">' + (num(d.quantity) || 0) + '</span><span class="pd-design-cond">0%</span></span>'
          + '</button>';
      });
      cHtml += '</div>';
    }
    cHtml += '</div>';
    choose.innerHTML = cHtml;
    right.appendChild(choose);

    // Manufacture panel — quantity stepper + approach toggle + summary.
    if (part && design) {
      var APPROACHES = ['Normal', 'Outsource'];
      var baseDays = buildDaysFor(mfgPartId);
      var days = mfgApproach === 1 ? baseDays : Math.max(1, Math.round(baseDays * 0.5)); // Normal = fast, Outsource = standard
      var totalDays = days * mfgQty;
      var baseCost = num(part.build_cost);
      var costMul = mfgApproach === 1 ? 1 : 1.5; // Normal = fast (1.5x), Outsource = base
      var buildCost = Math.round(baseCost * mfgQty);
      var approachCost = Math.max(0, Math.round(baseCost * costMul * mfgQty) - buildCost);
      var doneDate = todayStr() ? addDays(todayStr(), totalDays) : '—';
      var doneLong = todayStr() ? fmtDateLong(doneDate) : '—';
      var firstDate = todayStr() ? addDays(todayStr(), days) : '—';
      var firstLong = todayStr() ? fmtDateLong(firstDate) : '—';

      var man = document.createElement('div'); man.className = 'pd-programme pd-manufacture';
      var mHtml = '<div class="pdp-head"><h3>Manufacture ' + str(part.name) + '</h3></div><div class="pdp-body">'
        + '<div class="pd-mfg-row"><span class="pd-mfg-label">Quantity</span>'
        + '<span class="pd-stepper"><button type="button" data-qty="-1">−</button><span class="val" id="mfg-qty">' + mfgQty + '</span><button type="button" data-qty="1">+</button></span></div>'
        + '<div class="pd-mfg-row"><span class="pd-mfg-label">Approach</span>'
        + '<span class="pd-approach">' + APPROACHES.map(function (a, i) { return '<button type="button" data-approach="' + i + '"' + (i === mfgApproach ? ' class="active"' : '') + '>' + a + '</button>'; }).join('') + '</span></div>'
        + '<div class="pd-summary">'
        + '<div class="pd-sum-row"><span>Completion date</span><b>' + totalDays + ' days (' + doneLong + ')</b></div>'
        + '<div class="pd-sum-row"><span>1st car part</span><b>' + days + ' days (' + firstLong + ')</b></div>'
        + '<div class="pd-sum-row"><span>Manufacture cost</span><b>$' + Number(buildCost).toLocaleString() + '</b></div>'
        + '<div class="pd-sum-row"><span>Approach cost</span><b>$' + Number(approachCost).toLocaleString() + '</b></div>'
        + '</div>'
        + '<button class="btn btn-primary" id="mfg-build-btn"><span>Manufacture</span></button>'
        + '</div>';
      man.innerHTML = mHtml;
      right.appendChild(man);
    }
    lay.appendChild(right);
    wrap.appendChild(lay);

    // Build orders (in progress / ready).
    var ordersCard = document.createElement('div'); ordersCard.className = 'pd-programme';
    var oHtml = '<div class="pdp-head"><h3>Build orders</h3><span class="pdp-stage live">' + orders.length + ' orders</span></div><div class="pdp-body">';
    if (!orders.length) oHtml += '<div class="muted">No build orders in progress.</div>';
    else {
      oHtml += '<div class="pd-mfg-grid">';
      orders.forEach(function (o) {
        var part2 = partById(o.part_id);
        var pname = part2 ? str(part2.name) : ('Part ' + o.part_id);
        var title = str(o.name) || pname;
        var ico = partIcon(o.part_id);
        var head = '<div class="pd-mfg-card-head">' + (ico ? '<div class="pd-mfg-ico"><img src="' + ico + '" alt=""></div>' : '')
          + '<div><div class="pd-mfg-name">' + title + '</div><div class="pd-mfg-sub">' + pname + (num(o.quantity) > 1 ? ' · ×' + num(o.quantity) : '') + '</div></div></div>';
        if (o.status === 'building') {
          var total = Math.max(1, num(o.build_total_days) || 1);
          var elapsed = o.start_date ? clamp(daysBetween(o.start_date, todayStr()), 0, total) : clamp(num(o.build_days) || 0, 0, total);
          var pct = clamp(Math.round(elapsed / total * 100), 0, 100);
          var when = o.completion_date ? 'Builds until <b>' + fmtDateLong(o.completion_date) + '</b>' : ('Build <b>' + elapsed + ' / ' + total + ' days</b>');
          oHtml += '<div class="pd-mfg-card">' + head
            + '<div class="pd-mfg-meta">' + when + '</div>'
            + '<div class="pdo-progress-track" style="margin-top:0;"><div class="pdo-progress-fill" style="width:' + pct + '%"></div></div>'
            + '<div class="pd-mfg-meta" style="color:var(--copy-faint)">Finishes automatically when the season clock passes this date.</div>'
            + '</div>';
        } else {
          oHtml += '<div class="pd-mfg-card">' + head
            + '<div class="pd-mfg-meta" style="color:var(--moss)">Built — added to part stock</div>'
            + '</div>';
        }
      });
      oHtml += '</div>';
    }
    oHtml += '</div>';
    ordersCard.innerHTML = oHtml;
    wrap.appendChild(ordersCard);

    // Wire up events.
    wrap.querySelectorAll('.pd-design-card').forEach(function (b) {
      b.addEventListener('click', function () { mfgDesignId = num(b.dataset.design); renderManufactureView(); });
    });
    wrap.querySelectorAll('[data-qty]').forEach(function (b) {
      b.addEventListener('click', function () { mfgQty = clamp(mfgQty + num(b.dataset.qty), 1, 10); renderManufactureView(); });
    });
    wrap.querySelectorAll('[data-approach]').forEach(function (b) {
      b.addEventListener('click', function () { mfgApproach = num(b.dataset.approach); renderManufactureView(); });
    });
    var buildBtn = el('mfg-build-btn');
    if (buildBtn) buildBtn.addEventListener('click', function () {
      if (design) doManufacture(num(design.design_id), num(design.part_id));
    });
  }

  function buildDevelopmentCard(partId) {
    var part = partById(partId); var prog = progFor(partId);
    var stageMap = { developing: ['In development', 'live'], delayed: ['Delayed', 'paused'], tested: ['Testing complete', 'testing'], introduced: ['Introduced — awaiting track run', 'live'] };
    var stage = stageMap[prog.status] || ['Unknown', ''];
    var env = (prog.status === 'developing' || prog.status === 'delayed') ? currentEnvelope(part, prog) : finalEnvelope(part, prog);
    var progressPct = prog.target_weeks > 0 ? clamp(Math.round(num(prog.weeks_elapsed) / num(prog.target_weeks) * 100), 0, 100) : 0;
    var race = null; (S.calendar || []).forEach(function (c) { if (num(c.round) === num(prog.target_race)) race = c; });
    var markerFrac = expectedSkewedFraction();
    var expectedVal = env.worst + (env.best - env.worst) * markerFrac;

    var card = document.createElement('div'); card.className = 'pdo-card';
    var html = '<div class="pdo-card-head"><div class="pdo-card-title"><h3>' + str(part.name) + '</h3><span>' + str(part.tag) + '</span></div><span class="pdp-stage ' + stage[1] + '">' + stage[0] + '</span></div>';
    html += '<div class="pdo-card-body">';
    html += '<div class="pdo-stats"><span>Target <b>' + (race ? str(race.name) : '—') + '</b></span><span>Week <b>' + num(prog.weeks_elapsed) + ' / ' + num(prog.target_weeks) + '</b></span><span>CFD <b>' + num(prog.cfd_alloc) + ' MAu</b></span><span>WTH <b>' + num(prog.wth_alloc) + ' h</b></span><span>Potential <b>' + pctFmt(env.worst) + ' to ' + pctFmt(env.best) + '</b></span></div>';
    html += '<div class="pdo-progress-track"><div class="pdo-progress-fill" style="width:' + progressPct + '%"></div></div>';

    if (prog.status !== 'introduced') {
      html += '<div class="pdp-slider-wrap" style="margin-top:12px;"><div class="pdp-slider-labels"><span>' + pctFmt(env.worst) + '</span><span>Projected development outcome</span><span>' + pctFmt(env.best) + '</span></div><div class="pdp-gradient-track"><div class="pdp-gradient-fill" style="background:' + gradientCss(env.worst, env.best, markerFrac) + '"></div><div class="pdp-marker" style="left:' + (markerFrac * 100) + '%;" data-label="' + pctFmt(expectedVal) + '"></div></div><div class="pdp-caption">' + (prog.status === 'delayed' ? 'Paused — progress is retained.' : prog.status === 'tested' ? 'Aero testing complete. Results are not yet correlated with track performance.' : 'Week ' + num(prog.weeks_elapsed) + ' of ' + num(prog.target_weeks) + '. The probability distribution refines as development progresses.') + '</div></div>';
    }

    if (prog.aero_test && (prog.status === 'tested' || prog.status === 'introduced')) {
      html += '<div class="pdp-result-card"><h4>Aero Testing Result</h4><div class="pdp-result-row"><span>Likely result</span><b class="' + (prog.aero_test.likely >= 0 ? 'pos' : 'neg') + '">' + pctFmt(prog.aero_test.likely) + '</b></div><div class="pdp-result-row"><span>Possible range</span><b>' + pctFmt(prog.aero_test.lo) + ' to ' + pctFmt(prog.aero_test.hi) + '</b></div><div class="pdp-result-row"><span>Confidence</span><b>' + str(prog.aero_test.confidence) + '</b></div></div>';
    }

    var impact = designImpactFor(part) || {};
    html += '<div class="pdo-cp-estimate"><div class="pdo-cp-label">Estimated car performance impact</div>';
    var currentGroup = null;
    (S.carView || []).forEach(function (r) {
      if (r.grp !== currentGroup) { currentGroup = r.grp; html += '<div style="font-family:var(--data-face);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--copy-faint);margin:8px 0 4px;">' + currentGroup + '</div>'; }
      var imp = impact[r.row_key] || null;
      if (!r.has || r.lo == null || r.hi == null || !imp) {
        html += '<div class="pdo-cp-row"><div class="pdo-cp-name">' + str(r.label) + '</div><div class="pdo-cp-bottom"><span>' + (r.has ? fmtVal(r.lo, r.unit, r.dec) + ' – ' + fmtVal(r.hi, r.unit, r.dec) : '—') + '</span></div></div>';
        return;
      }
      html += '<div class="pdo-cp-row"><div class="pdo-cp-name">' + str(r.label) + '</div><div class="pdo-cp-bottom"><span>' + fmtVal(r.lo, r.unit, r.dec) + ' – ' + fmtVal(r.hi, r.unit, r.dec) + '</span><span class="cp-range-delta ' + deltaRangeClass(imp.lo, imp.hi) + '">' + fmtDeltaRange(num(imp.lo), num(imp.hi), r.unit, r.dec) + '</span></div></div>';
    });
    html += '</div>';

    html += '<div class="pdo-actions" id="pdo-actions-' + partId + '"></div>';
    html += '</div>';
    card.innerHTML = html;

    var actions = card.querySelector('#pdo-actions-' + partId);
    function btn(label, cls, onClick) {
      var b = document.createElement('button'); b.className = 'btn btn-compact ' + cls; b.innerHTML = '<span>' + label + '</span>';
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
      return b;
    }
    actions.appendChild(btn('View in Design', 'btn-ghost', function () { selectPart(partId); selectMainTab('design'); }));
    if (prog.status === 'developing') {
      actions.appendChild(btn('Continue', 'btn-primary', function () { doContinue(partId); }));
      if (num(prog.extend_count) < 5) actions.appendChild(btn('Extend', 'btn-ghost', function () { doUpdate(partId, 'extend'); }));
      actions.appendChild(btn('Delay', 'btn-ghost', function () { doUpdate(partId, 'delay'); }));
      actions.appendChild(btn('Scrap', 'btn-danger', function () { doScrap(partId); }));
    } else if (prog.status === 'delayed') {
      actions.appendChild(btn('Resume', 'btn-primary', function () { doUpdate(partId, 'resume'); }));
      actions.appendChild(btn('Scrap', 'btn-danger', function () { doScrap(partId); }));
    } else if (prog.status === 'tested') {
      actions.appendChild(btn('Manufacture & introduce', 'btn-primary', function () { doIntroduce(partId); }));
      actions.appendChild(btn('Scrap', 'btn-danger', function () { doScrap(partId); }));
    } else if (prog.status === 'introduced') {
      actions.appendChild(btn('Run on track', 'btn-primary', function () { doRunTrack(partId); }));
    }
    return card;
  }

  function selectMainTab(tab) {
    activeMainTab = tab;
    renderAll();
  }

  /* ── actions (server calls) ────────────────────────────────────────── */
  async function reload() {
    var data = await api('partsCatalog', { team: opts.team || '' });
    if (data.ok) {
      S = data;
      resetProgCache();
      updateResourceUsage();
      if (activePartId == null && S.catalog && S.catalog.length) activePartId = num(S.catalog[0].part_id);
      return { ok: true };
    }
    return data;
  }

  function renderAll() {
    updateResourceUsage();
    renderTopbar(); renderMainTabs(); renderPartTabs();
    el('pd-manufacture-view').style.display = activeMainTab === 'manufacture' ? '' : 'none';
    if (activeMainTab === 'design') {
      el('pd-design-view').style.display = '';
      el('pd-development-view').style.display = 'none';
      var part = partById(activePartId);
      if (part) { renderHeader(part); renderProgramme(part); renderCategories(part); renderCarPerformance(); }
      syncEditButtons(part);
    } else if (activeMainTab === 'manufacture') {
      el('pd-design-view').style.display = 'none';
      el('pd-development-view').style.display = 'none';
      renderManufactureView();
    } else {
      el('pd-design-view').style.display = 'none';
      el('pd-development-view').style.display = '';
      renderDevelopmentView();
    }
  }

  function syncEditButtons(part) {
    var commit = el('btn-commit'), reset = el('btn-reset');
    if (!commit || !reset) return;
    var canEdit = part && !part.locked && ['setup'].indexOf(str(progFor(part.part_id).status)) !== -1;
    commit.disabled = !canEdit; reset.disabled = !canEdit;
  }

  async function doCommit(partId) {
    var part = partById(partId);
    if (!reachableRaces(part).length) { await alertModal('There are no races left this season that you can reach in time.', 'Cannot start development'); return; }
    var prog = progFor(partId);
    var cfdEl = el('pdp-cfd'), wthEl = el('pdp-wth'), raceEl = el('pdp-targetrace');
    var cfd = cfdEl ? parseInt(cfdEl.value, 10) : num(prog.cfd_alloc);
    var wth = wthEl ? parseInt(wthEl.value, 10) : num(prog.wth_alloc);
    var targetRace = raceEl ? parseInt(raceEl.value, 10) : num(prog.target_race);
    var data = await api('partsCommit', { partId: partId, focus: focusState, cfd: cfd, wth: wth, targetRace: targetRace });
    if (data.ok) {
      await reload(); renderAll();
      await alertModal('Development started. Design cost: <b>$' + Number(data.designCost).toLocaleString() + '</b>.', 'Development started');
    } else {
      await alertModal('Could not start development — ' + data.error + (data.designCost ? ' (design cost $' + Number(data.designCost).toLocaleString() + ')' : ''), 'Development not started');
    }
  }
  async function doUpdate(partId, action, extra) {
    var data = await api('partsUpdate', Object.assign({ partId: partId, action: action }, extra || {}));
    if (data.ok) { await reload(); renderAll(); } else { await alertModal(data.error, 'Update failed'); }
  }
  async function doContinue(partId) {
    var data = await api('partsContinue', { partId: partId });
    if (data.ok) { await reload(); renderAll(); } else { await alertModal(data.error, 'Continue failed'); }
  }
  async function doIntroduce(partId) {
    var data = await api('partsIntroduce', { partId: partId });
    if (data.ok) { await reload(); renderAll(); await alertModal('Part introduced. Build cost charged to the team budget.', 'Introduced'); }
    else { await alertModal(data.error, 'Introduce failed'); }
  }
  async function doManufacture(designId, partId) {
    var data = await api('partsManufacture', { designId: designId, partId: partId, quantity: mfgQty, approach: mfgApproach === 1 ? 'outsource' : 'normal' });
    if (data.ok) {
      await reload(); renderAll();
      await alertModal('Manufacture order placed for <b>' + data.name + '</b>. Build time: <b>' + data.build_total_days + ' days</b> · cost <b>$' + Number(data.cost).toLocaleString() + '</b>.', 'Order placed');
    } else {
      await alertModal(data.error + (data.cost ? ' (cost $' + Number(data.cost).toLocaleString() + ')' : ''), 'Manufacture failed');
    }
  }
  async function doBuildContinue(orderId) {
    var data = await api('partsBuildContinue', { orderId: orderId });
    if (data.ok) { await reload(); renderAll(); }
    else { await alertModal(data.error, 'Build continue failed'); }
  }
  async function doRunTrack(partId) {
    var data = await api('partsRunTrack', { partId: partId });
    if (data.ok) { await reload(); renderAll(); await alertModal('Track correlation result revealed (<b>' + Number(data.actual).toFixed(1) + '%</b>).', 'Track run complete'); }
    else { await alertModal(data.error, 'Track run failed'); }
  }
  async function doScrap(partId) {
    var ok = await confirmModal('Scrap this development programme? This cannot be undone.', 'Scrap programme');
    if (!ok) return;
    var data = await api('partsUpdate', { partId: partId, action: 'scrap' });
    if (data.ok) { await reload(); renderAll(); } else { await alertModal(data.error, 'Scrap failed'); }
  }
  async function doStartNew(partId) {
    var data = await api('partsUpdate', { partId: partId, action: 'scrap' });
    if (data.ok) { await reload(); renderAll(); } else { await alertModal(data.error, 'Failed to reset'); }
  }

  /* ── mount ─────────────────────────────────────────────────────────── */
  function resetModuleState() {
    S = null; activePartId = null; activeMainTab = 'design';
    focusState = {}; baselineState = {};
    usedCfd = 0; usedWth = 0;
    resetProgCache();
  }

  async function mount(elTarget, options) {
    if (!elTarget) return;
    container = elTarget; opts = options || {};
    resetModuleState();
    container.innerHTML = shellHtml();

    el('tab-design').addEventListener('click', function () { selectMainTab('design'); });
    el('tab-development').addEventListener('click', function () { selectMainTab('development'); });
    el('tab-manufacture').addEventListener('click', function () { selectMainTab('manufacture'); });
    el('btn-reset').addEventListener('click', function () {
      var part = partById(activePartId); if (part && !part.locked) { initPartState(part); renderCategories(part); renderCarPerformance(); }
    });
    el('btn-commit').addEventListener('click', function () {
      var part = partById(activePartId); if (part && !part.locked) doCommit(part.part_id);
    });

    var data = await reload();
    if (!data.ok) {
      // No guessing: surface the real reason. The server's error code is what
      // actually happened; anything else is logged to the console, never shown
      // as a vague "temporarily unavailable" stand-in.
      if (data.error === 'not_an_f1_team') {
        container.innerHTML = '<div class="pd-locked-notice"><strong>Parts Design</strong><br>Parts design is only available to F1 teams.</div>';
        return;
      }
      if (data.error === 'unauthorized' || data.error === 'no_team' || data.error === 'no_session') {
        container.innerHTML = '<div class="pd-locked-notice"><strong>Parts Design</strong><br>Parts design requires a team principal or admin login.</div>';
        return;
      }
      console.error('[PartsDesign] partsCatalog failed:', data);
      container.innerHTML = '<div class="pd-locked-notice"><strong>Parts Design</strong><br>Parts data could not be loaded. Please try again.</div>';
      return;
    }
    var part = partById(activePartId);
    if (part) initPartState(part);
    renderAll();
  }

  window.PartsDesign = {
    mount: mount,
    isAvailable: function () { return !!getSession(); }
  };
})();
