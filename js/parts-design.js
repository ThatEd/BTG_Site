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
      var body = Object.assign({ action: action, username: sess.username, password: sess.password }, payload || {});
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

  var CHECK_SVG = '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Client-side setup programmes — for parts that haven't been committed yet, we
  // keep a stable object per part so the target race / CFD / WTH selections
  // persist across re-renders. Committed programmes come from the server (S.dev).
  var progCache = {};
  function resetProgCache() { progCache = {}; }
  function reachableRaces(part) {
    var now = new Date().toISOString().slice(0, 10);
    return (S.calendar || []).filter(function (c) {
      return Math.round(weeksBetween(now, c.race_date) - num(part.mfg_weeks)) >= 1;
    });
  }
  function defaultSetup(id) {
    var part = partById(id);
    var race = null;
    var now = new Date().toISOString().slice(0, 10);
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

  /* ── programme math (same as the concept) ──────────────────────────── */
  function designWeeksFor(part, race) {
    if (!race) return 8;
    var total = weeksBetween(new Date().toISOString().slice(0, 10), race.race_date);
    return Math.max(1, Math.round(total - num(part.mfg_weeks)));
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
  function resourceScore(cfd, wth) {
    return clamp((clamp(cfd / 70, 0, 1)) * 0.55 + (clamp(wth / 95, 0, 1)) * 0.45, 0, 1);
  }
  function timeEfficiency(targetWeeks) { return clamp(0.4 + 0.6 * (targetWeeks / 8), 0.4, 1.35); }
  function finalEnvelope(part, prog) {
    var tWeeks = prog.target_weeks > 0 ? prog.target_weeks : computeTargetWeeks(part);
    var rScore = resourceScore(prog.cfd_alloc, prog.wth_alloc);
    var tEff = timeEfficiency(tWeeks);
    var resBestBonus = rScore * 12, resWorstBonus = rScore * 4;
    var timeMul = 0.7 + 0.3 * tEff;
    var extendBoost = Math.min(num(prog.extend_count) * 0.4, 2.5);
    var worst = -5 + resWorstBonus * timeMul * 0.8 + extendBoost * 0.3;
    var best = 8 + resBestBonus * timeMul * 1.2 + extendBoost * 1.2;
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
    usedCfd = cfd; usedWth = wth;
  }

  /* ── stat model ────────────────────────────────────────────────────── */
  function statBaseline(part, statId) {
    var b = baselineFor(part.part_id);
    var v = b[statId];
    if (v == null) v = (part.config.baselines || {})[statId];
    return isFinite(num(v)) ? num(v) : 0;
  }
  function statModifier(part, statId) {
    var m = 0;
    Object.keys(part.config.matrix || {}).forEach(function (srcId) {
      var row = part.config.matrix[srcId];
      if (row && row[statId] !== undefined && focusState[srcId] !== undefined) m += num(row[statId]) * (2 * num(focusState[srcId]) - 1);
    });
    if (!isFinite(m)) m = 0;
    return clamp(m, -1, 1);
  }
  function statCurrentValue(part, statId) { return statBaseline(part, statId) * (1 + 0.14 * statModifier(part, statId)); }
  function statFocusValue(part, statId) {
    var baseline = statBaseline(part, statId);
    var mod = 0;
    Object.keys(part.config.matrix || {}).forEach(function (srcId) {
      var row = part.config.matrix[srcId];
      if (row && row[statId] !== undefined && focusState[srcId] !== undefined) mod += num(row[statId]) * (2 * num(focusState[srcId]) - 1);
    });
    if (!isFinite(mod)) mod = 0;
    return baseline * (1 + 0.14 * clamp(mod, -1, 1));
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
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div id="pd-development-view" style="display:none;"><div id="pd-dev-list"></div></div>';
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
    el('tab-design').className = 'pd-maintab' + (activeMainTab === 'design' ? ' active' : '');
    el('tab-development').className = 'pd-maintab' + (activeMainTab === 'development' ? ' active' : '');
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
        rowRace.querySelector('#pdp-targetrace-val').textContent = targetWeeks + ' wks dev';
        sel.addEventListener('change', function () { prog.target_race = parseInt(sel.value, 10); prog.target_weeks = computeTargetWeeks(part); renderProgramme(part); renderHeader(part); renderCarPerformance(); });
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
        updateResourceUsage(); renderTopbar(); renderCarPerformance(); syncStart();
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
        updateResourceUsage(); renderTopbar(); renderCarPerformance(); syncStart();
      });
      body.appendChild(rowWth);

      var scale = computeCostScale(part);
      var costNote = document.createElement('div'); costNote.className = 'pdp-caption';
      costNote.innerHTML = 'Design cost scales with development time. Current schedule: <b>' + prog.target_weeks + ' weeks</b> · Cost multiplier: <b>' + scale.toFixed(2) + 'x</b>';
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
    var val = statCurrentValue(part, statId); var delta = val - statBaseline(part, statId);
    row.innerHTML = '<div class="ps-label">' + label + '</div><div class="ps-val" id="val-' + statId + '">' + fmtVal(val, meta.unit, meta.dec) + '</div><div class="ps-delta ' + deltaClass(delta) + '" id="delta-' + statId + '">' + fmtDelta(delta, meta.unit, meta.dec) + '</div><div class="ps-slider-wrap"><input type="range" min="0" max="100" value="' + Math.round((focusState[statId] || 0.5) * 100) + '" class="ps-focus-input" id="slider-' + statId + '" style="--fill:' + Math.round((focusState[statId] || 0.5) * 100) + '%"><span class="ps-focus-pct" id="pct-' + statId + '">' + Math.round((focusState[statId] || 0.5) * 100) + '%</span></div>';
    var slider = row.querySelector('#slider-' + statId);
    slider.addEventListener('input', function (e) {
      var f = parseInt(e.target.value, 10) / 100; focusState[statId] = f;
      e.target.style.setProperty('--fill', Math.round(f * 100) + '%');
      row.querySelector('#pct-' + statId).textContent = Math.round(f * 100) + '%';
      refreshStatDisplays(part); renderCarPerformance();
    });
    return row;
  }

  function refreshStatDisplays(part) {
    Object.keys(baselineFor(part.part_id)).forEach(function (statId) {
      var meta = statMeta(statId); var val = statCurrentValue(part, statId); var delta = val - statBaseline(part, statId);
      var valEl = el('val-' + statId), deltaEl = el('delta-' + statId);
      if (valEl) valEl.textContent = fmtVal(val, meta.unit, meta.dec);
      if (deltaEl) { deltaEl.textContent = fmtDelta(delta, meta.unit, meta.dec); deltaEl.className = 'ps-delta ' + deltaClass(delta); }
    });
  }

  function computeCarPerformanceRange(part, worstEnv, bestEnv) {
    var rowMin = {}, rowMax = {};
    (S.cpRows || []).forEach(function (r) { rowMin[r.row_key] = 0; rowMax[r.row_key] = 0; });
    if (part.locked) return { rowMin: rowMin, rowMax: rowMax };
    var w = worstEnv / 100, b = bestEnv / 100;
    Object.keys(baselineFor(part.part_id)).forEach(function (statId) {
      var baseline = baselineFor(part.part_id)[statId];
      var focusValue = statFocusValue(part, statId);
      var nativeDelta = focusValue - baseline;
      var isWeight = Number(statId) === 15;
      var worstStatDelta, bestStatDelta;
      if (isWeight) { worstStatDelta = nativeDelta; bestStatDelta = nativeDelta; }
      else { worstStatDelta = baseline * ((focusValue / baseline - 1) * (1 + w) + w); bestStatDelta = baseline * ((focusValue / baseline - 1) * (1 + b) + b); }
      var impacts = (part.config.carImpact || {})[statId] || [];
      impacts.forEach(function (imp) { rowMin[imp[0]] += worstStatDelta * imp[1]; rowMax[imp[0]] += bestStatDelta * imp[1]; });
    });
    return { rowMin: rowMin, rowMax: rowMax };
  }

  function renderCarPerformance() {
    var part = partById(activePartId); var wrap = el('cp-body'); if (!part || !wrap) return;
    wrap.innerHTML = '';
    var worstEnv = -5, bestEnv = 8;
    var prog = progFor(part.part_id);
    if (prog.status === 'setup' || prog.status === 'revealed') { var env = finalEnvelope(part, prog); worstEnv = env.worst; bestEnv = env.best; }
    var ranges = computeCarPerformanceRange(part, worstEnv, bestEnv);
    var currentGroup = null;
    (S.cpRows || []).forEach(function (r) {
      if (r.grp !== currentGroup) { currentGroup = r.grp; var gl = document.createElement('div'); gl.className = 'cp-section-label'; gl.textContent = currentGroup; wrap.appendChild(gl); }
      var minD = ranges.rowMin[r.row_key] || 0, maxD = ranges.rowMax[r.row_key] || 0;
      var minVal = num(r.base) + minD, maxVal = num(r.base) + maxD;
      var n = normRange(minVal, maxVal, minD, maxD);
      var rowEl = document.createElement('div'); rowEl.className = 'cp-row';
      rowEl.innerHTML = '<div class="cp-top"><span class="cp-label">' + str(r.label) + '</span></div>'
        + '<div class="cp-bottom"><span class="cp-val">' + fmtVal(n.minV, r.unit, r.dec) + ' – ' + fmtVal(n.maxV, r.unit, r.dec) + '</span>'
        + '<span class="cp-new ' + deltaRangeClass(n.minD, n.maxD) + '">' + fmtDeltaRange(n.minD, n.maxD, r.unit, r.dec) + '</span></div>';
      wrap.appendChild(rowEl);
    });
  }

  function selectPart(id) {
    activePartId = id; var part = partById(id); if (part && !part.locked) initPartState(part);
    renderPartTabs(); renderHeader(part); renderProgramme(part); renderCategories(part); renderCarPerformance();
    syncEditButtons(part);
  }

  function initPartState(part) {
    var b = baselineFor(part.part_id);
    focusState = {}; baselineState = {};
    Object.keys(b).forEach(function (k) { focusState[k] = 0.5; baselineState[k] = b[k]; });
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

    var cpRanges = computeCarPerformanceRange(part, env.worst, env.best);
    html += '<div class="pdo-cp-estimate"><div class="pdo-cp-label">Estimated car performance impact</div>';
    var currentGroup = null;
    (S.cpRows || []).forEach(function (r) {
      if (r.grp !== currentGroup) { currentGroup = r.grp; html += '<div style="font-family:var(--data-face);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--copy-faint);margin:8px 0 4px;">' + currentGroup + '</div>'; }
      var minD = cpRanges.rowMin[r.row_key] || 0, maxD = cpRanges.rowMax[r.row_key] || 0;
      var minVal = num(r.base) + minD, maxVal = num(r.base) + maxD;
      var n = normRange(minVal, maxVal, minD, maxD);
      html += '<div class="pdo-cp-row"><div class="pdo-cp-name">' + str(r.label) + '</div><div class="pdo-cp-bottom"><span>' + fmtVal(n.minV, r.unit, r.dec) + ' – ' + fmtVal(n.maxV, r.unit, r.dec) + '</span><span class="cp-range-delta ' + deltaRangeClass(n.minD, n.maxD) + '">' + fmtDeltaRange(n.minD, n.maxD, r.unit, r.dec) + '</span></div></div>';
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
    if (activeMainTab === 'design') {
      el('pd-design-view').style.display = '';
      el('pd-development-view').style.display = 'none';
      var part = partById(activePartId);
      if (part) { renderHeader(part); renderProgramme(part); renderCategories(part); renderCarPerformance(); }
      syncEditButtons(part);
    } else {
      el('pd-design-view').style.display = 'none';
      el('pd-development-view').style.display = '';
      renderDevelopmentView();
    }
  }

  function syncEditButtons(part) {
    var commit = el('btn-commit'), reset = el('btn-reset');
    if (!commit || !reset) return;
    var canEdit = part && !part.locked && ['setup', 'revealed'].indexOf(str(progFor(part.part_id).status)) !== -1;
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
    el('btn-reset').addEventListener('click', function () {
      var part = partById(activePartId); if (part && !part.locked) { initPartState(part); renderCategories(part); renderCarPerformance(); }
    });
    el('btn-commit').addEventListener('click', function () {
      var part = partById(activePartId); if (part && !part.locked) doCommit(part.part_id);
    });

    var data = await reload();
    if (!data.ok) {
      var msg = data.error === 'not_an_f1_team'
        ? 'Parts design is only available to F1 teams.'
        : (data.error === 'unauthorized' || data.error === 'no_team' || data.error === 'no_session')
          ? 'Parts design requires a team principal or admin login.'
          : 'Parts design is temporarily unavailable. If you just ran the database update, refresh the page.';
      container.innerHTML = '<div class="pd-locked-notice"><strong>Parts Design</strong><br>' + msg + '</div>';
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
