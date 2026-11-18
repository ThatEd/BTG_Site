/* BTG live radio pop-up.
   Polls the BTG backend for radio messages sent from the league site and shows
   each one as a 2026-style radio panel at the right edge of the race screen.
   Started and stopped by TeamComm.js (race screen mounted / unmounted).
   Settings live in BtgRadioConfig.js, which game-mod/build.py writes per pak. */
define(["require", "exports", "common/util/CSSUtil", "project/modules/raceWeekend/driverPanel/teamComms/BtgRadioConfig"], function (require, exports, CSSUtil_1, BtgRadioConfig_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stop = exports.start = void 0;
    try { (0, CSSUtil_1.loadCSS)('project/components/raceWeekend/driverPanel/teamComms/BtgRadio'); } catch (e) { }

    const CFG = BtgRadioConfig_1.BtgRadioConfig || {};

    const POLL_ON_MS      = 2000;   // while live radio is switched on
    const POLL_IDLE_MS    = 10000;  // while switched off, or after an error
    const POLL_TIMEOUT_MS = 8000;
    const MAX_AGE_MS      = 120000;  // older messages are skipped
    const MAX_QUEUE       = 10;
    const CHAR_MS         = 35;     // same typing speed as the radio panel
    const LINE_PAUSE_MS   = 1200;
    const HOLD_MS         = 5000;   // after the last line has finished typing
    const SLIDE_MS        = 350;
    const GAP_MS          = 500;

    const BAR_HEIGHTS         = [10, 22, 38, 52, 52, 38, 22, 10];
    const BAR_HEIGHTS_REFLECT = [ 6, 12, 20, 28, 28, 20, 12,  6];
    const BAR_DURATIONS       = [0.45, 0.62, 0.38, 0.71, 0.53, 0.44, 0.67, 0.39];
    const BAR_DELAYS          = [0.0,  0.18, 0.33, 0.07, 0.41, 0.25, 0.12, 0.36];
    const REF_DURATIONS       = [0.51, 0.39, 0.68, 0.44, 0.57, 0.72, 0.35, 0.49];
    const REF_DELAYS          = [0.22, 0.41, 0.09, 0.35, 0.16, 0.28, 0.44, 0.13];
    const PX = 0.0555555556;        // 1px at 1080p, in rem

    // One shared state object, so two copies of the module can never both run.
    const S = (window.__btgRadio = window.__btgRadio || {
        users: 0, running: false, cursor: null, inFlight: false,
        pollTimer: null, playTimer: null, typeTimer: null,
        queue: [], playing: false, panel: null, debugEl: null,
        stat: { poll: 'starting', logo: '-', shown: 0, skipped: 0 },
    });
    if (!S.stat.sound) S.stat.sound = '-';

    /* ── sound ───────────────────────────────────────────────────────────── */
    // Played once when a pop-up slides in. The game UI cannot play audio files;
    // it can only ask the engine for one of the game's own sounds by name. The
    // engine stays silent for the radio panel's own events ("show"/"hide" on
    // "TeamComm": the real radio ping is played by the engine itself), so this
    // uses another of the game's sounds instead, chosen by ear on 2026-11-15.
    // The only other audible candidate was ("show_Toast", "toast", "").
    const SOUND = { action: 'show', componentName: 'FanfareAnimatedArrows', outcome: 'initiate' };
    function sound() {
        if (!S.audio || typeof S.audio.sendEvent !== 'function') { S.stat.sound = 'none'; return; }
        try { S.audio.sendEvent(SOUND.action, SOUND.componentName, SOUND.outcome); S.stat.sound = 'ok'; }
        catch (e) { S.stat.sound = 'FAILED (' + (e && e.message ? e.message : e) + ')'; }
    }

    function div(className, parent) {
        const el = document.createElement('div');
        if (className) el.className = className;
        if (parent) parent.appendChild(el);
        return el;
    }

    function isHex(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }

    /* ── debug line (test paks only) ─────────────────────────────────────── */
    function debug() {
        if (!CFG.debug) return;
        try {
            if (!document.body) return;
            if (!S.debugEl || !S.debugEl.parentNode) {
                S.debugEl = div('BtgRadio_debug', document.body);
            }
            S.debugEl.textContent = 'BTG RADIO ' + (CFG.series || '?')
                + ' | poll: ' + S.stat.poll
                + ' | logo: ' + S.stat.logo
                + ' | sound: ' + S.stat.sound
                + ' | shown ' + S.stat.shown + ' skipped ' + S.stat.skipped
                + ' | queue ' + S.queue.length;
        } catch (e) { }
    }
    function removeDebug() {
        if (S.debugEl && S.debugEl.parentNode) S.debugEl.parentNode.removeChild(S.debugEl);
        S.debugEl = null;
    }

    /* ── polling ─────────────────────────────────────────────────────────── */
    function pollUrl() {
        let url = String(CFG.pollUrl || '');
        url += (url.indexOf('?') < 0 ? '?' : '&') + 'p_series=' + encodeURIComponent(CFG.series || '');
        if (S.cursor !== null) url += '&p_after=' + encodeURIComponent(S.cursor);
        if (CFG.apiKey) url += '&apikey=' + encodeURIComponent(CFG.apiKey);
        return url;
    }

    function schedulePoll(ms) {
        if (S.pollTimer) clearTimeout(S.pollTimer);
        S.pollTimer = null;
        if (S.running) S.pollTimer = setTimeout(poll, ms);
    }

    function poll() {
        S.pollTimer = null;
        if (!S.running) return;
        if (S.inFlight) { schedulePoll(POLL_ON_MS); return; }
        S.inFlight = true;
        let done = false;
        const finish = (ok, text) => {
            if (done) return;
            done = true;
            S.inFlight = false;
            let next = POLL_IDLE_MS;
            try {
                if (!ok) throw new Error(text || 'failed');
                const data = JSON.parse(text);
                if (!data || data.ok !== true) throw new Error('bad answer');
                if (typeof data.cursor === 'number') S.cursor = data.cursor;
                (data.messages || []).forEach(m => {
                    if (!m || !m.payload) return;
                    if (S.queue.length >= MAX_QUEUE) { S.stat.skipped++; return; }
                    S.queue.push({ payload: m.payload, ageMs: Number(m.age_ms) || 0, at: Date.now() });
                });
                S.stat.poll = data.enabled ? 'on' : 'off';
                if (data.enabled) next = POLL_ON_MS;
            } catch (e) {
                S.stat.poll = 'error (' + (e && e.message ? e.message : e) + ')';
            }
            debug();
            if (S.running) { playNext(); schedulePoll(next); }
        };
        try {
            const x = new XMLHttpRequest();
            x.onreadystatechange = () => {
                if (x.readyState !== 4) return;
                if (x.status >= 200 && x.status < 300) finish(true, x.responseText);
                else finish(false, 'status ' + x.status);
            };
            x.onerror = () => finish(false, 'network');
            x.open('GET', pollUrl(), true);
            if (CFG.apiKey) {
                try { x.setRequestHeader('apikey', CFG.apiKey); } catch (e) { }
            }
            x.send();
            setTimeout(() => finish(false, 'timeout'), POLL_TIMEOUT_MS);
        } catch (e) {
            finish(false, 'threw ' + e);
        }
    }

    /* ── panel ───────────────────────────────────────────────────────────── */
    function buildPanel(p) {
        const colour = isHex(p.colour) ? p.colour : '#ffffff';

        // Reuses the radio panel's own class names so it looks the same; the
        // team colour is set inline because it comes from the site, not the game.
        const root = div('TeamCommSkin_root BtgRadio_root');
        try { root.style.setProperty('--colour', colour); } catch (e) { }

        const top = div('TeamCommSkin_top', root);
        const name = div('TeamCommSkin_driverName', top);
        name.textContent = String(p.name || '');
        name.style.color = colour;
        div('TeamCommSkin_radioLabel', top).textContent = 'RADIO';

        const mid = div('TeamCommSkin_mid', root);
        const midTop = div('TeamCommSkin_midTop', mid);
        const posBlock = div('TeamCommSkin_posBlock', midTop);
        const num = div('TeamCommSkin_position', posBlock);
        num.textContent = String(p.number || '');
        num.style.color = colour;
        num.style.textShadow = '1px 0 ' + colour + ', -1px 0 ' + colour + ', 0 1px ' + colour + ', 0 -1px ' + colour;

        if (p.logo && CFG.siteBase) {
            try {
                const img = document.createElement('img');
                img.className = 'TeamCommSkin_teamLogo BtgRadio_logo';
                img.onload = () => { S.stat.logo = 'ok'; debug(); };
                img.onerror = () => {
                    S.stat.logo = 'FAILED';
                    debug();
                    if (img.parentNode) img.parentNode.removeChild(img);
                };
                S.stat.logo = 'loading';
                img.src = String(CFG.siteBase) + String(p.logo).split('/').map(encodeURIComponent).join('/');
                mid.appendChild(img);
            } catch (e) { S.stat.logo = 'FAILED (threw)'; }
        }

        const wave = div('TeamCommSkin_waveArea', mid);
        const waveTop = div('TeamCommSkin_waveTop', wave);
        BAR_HEIGHTS.forEach((h, i) => {
            const wrap = div('TeamCommSkin_waveBarWrap', waveTop);
            wrap.style.flex = '1';
            wrap.style.height = (h * PX) + 'rem';
            const bar = div('TeamCommSkin_waveBar', wrap);
            bar.style.position = 'relative';
            bar.style.backgroundColor = colour;
            bar.style.animationDuration = BAR_DURATIONS[i] + 's';
            bar.style.animationDelay = BAR_DELAYS[i] + 's';
            div('TeamCommSkin_waveBarStripe', bar);
            div('TeamCommSkin_waveBarStripeHide', bar).style.backgroundColor = colour;
        });
        const waveBottom = div('TeamCommSkin_waveBottom', wave);
        BAR_HEIGHTS_REFLECT.forEach((h, i) => {
            const wrap = div('TeamCommSkin_waveBarReflectWrap', waveBottom);
            wrap.style.flex = '1';
            wrap.style.height = (h * PX) + 'rem';
            const bar = div('TeamCommSkin_waveBarReflect', wrap);
            bar.style.backgroundColor = colour;
            bar.style.animationDuration = REF_DURATIONS[i] + 's';
            bar.style.animationDelay = REF_DELAYS[i] + 's';
        });
        div('TeamCommSkin_waveFadeTop', wave);
        div('TeamCommSkin_waveFadeBottom', wave);

        const bottom = div('TeamCommSkin_bottom', root);
        return { root, bottom, colour, rows: [] };
    }

    function removePanel() {
        if (S.typeTimer) { clearInterval(S.typeTimer); S.typeTimer = null; }
        if (S.panel && S.panel.root.parentNode) S.panel.root.parentNode.removeChild(S.panel.root);
        S.panel = null;
    }

    function later(fn, ms) {
        S.playTimer = setTimeout(() => {
            S.playTimer = null;
            if (!S.running) return;
            try { fn(); } catch (e) { removePanel(); S.playing = false; }
        }, ms);
    }

    function typeLine(panel, line, onDone) {
        // Keep only the previous line above the one being typed.
        while (panel.rows.length > 1) {
            const old = panel.rows.shift();
            if (old.parentNode) old.parentNode.removeChild(old);
        }
        if (panel.rows.length === 1) panel.rows[0].className += ' isPrev';

        const isDriver = line.from === 'driver';
        // Driver lines sit against the right edge, team lines against the left.
        const row = div('TeamCommSkin_text BtgRadio_line' + (isDriver ? ' isDriver' : ''), panel.bottom);
        if (isDriver) row.style.color = panel.colour;
        row.style.textAlign = isDriver ? 'right' : 'left';
        panel.rows.push(row);

        const text = String(line.text || '');
        let count = 0;
        const step = () => {
            count++;
            row.textContent = text.slice(0, count);
            if (count >= text.length) {
                if (S.typeTimer) { clearInterval(S.typeTimer); S.typeTimer = null; }
                onDone();
            }
        };
        step();
        if (count < text.length) S.typeTimer = setInterval(step, CHAR_MS);
    }

    function playNext() {
        if (!S.running || S.playing) return;
        let item = null;
        while (S.queue.length) {
            const cand = S.queue.shift();
            if (cand.ageMs + (Date.now() - cand.at) > MAX_AGE_MS) { S.stat.skipped++; continue; }
            item = cand;
            break;
        }
        debug();
        if (!item || !document.body) return;

        const p = item.payload || {};
        const lines = (Array.isArray(p.lines) ? p.lines : []).filter(l => l && l.text).slice(0, 4);
        if (!lines.length) { playNext(); return; }

        S.playing = true;
        S.stat.shown++;
        const panel = S.panel = buildPanel(p);
        document.body.appendChild(panel.root);
        debug();

        let idx = 0;
        const nextLine = () => {
            typeLine(panel, lines[idx], () => {
                idx++;
                if (idx < lines.length) later(nextLine, LINE_PAUSE_MS);
                else later(slideOut, HOLD_MS);
            });
        };
        const slideOut = () => {
            panel.root.className = panel.root.className.replace(' shown', '');
            later(() => {
                removePanel();
                later(() => { S.playing = false; playNext(); }, GAP_MS);
            }, SLIDE_MS);
        };
        // Slide in on the next frame so the transition runs, then start typing.
        later(() => {
            panel.root.className += ' shown';
            sound();
            debug();
            later(nextLine, SLIDE_MS);
        }, 50);
    }

    /* ── start / stop (called from TeamComm.js) ──────────────────────────── */
    function start(audio) {
        S.users++;
        if (audio) S.audio = audio;   // the game's common/core/Audio module
        if (S.running) return;
        if (!CFG.pollUrl || !CFG.series) return;
        S.running = true;
        S.cursor = null;       // first poll only fetches the newest id: nothing old is replayed
        S.queue = [];
        S.playing = false;
        S.stat.poll = 'starting';
        debug();
        schedulePoll(500);
    }
    exports.start = start;

    function stop() {
        S.users = Math.max(0, S.users - 1);
        if (S.users > 0 || !S.running) return;
        S.running = false;
        if (S.pollTimer) { clearTimeout(S.pollTimer); S.pollTimer = null; }
        if (S.playTimer) { clearTimeout(S.playTimer); S.playTimer = null; }
        removePanel();
        removeDebug();
        S.queue = [];
        S.playing = false;
    }
    exports.stop = stop;
});
