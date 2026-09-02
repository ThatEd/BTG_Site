#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — DB Public Cache Builder (Node)

   Reads the PUBLIC dataset straight from Supabase PostgREST using the
   publishable (anon) key and writes it to the static site's cache folder.
   The site reads ONLY this file at runtime — no DB access, no per-format
   data-loader checks.

   Requires: run supabase-public-data.sql once (grants anon SELECT + RLS
   read policies on the public tables).

   Runs daily via .github/workflows/update-db-cache.yml (and on demand via
   workflow_dispatch). Also useful locally:
     node scripts/build-db-cache.js

   Output:
     cache/public-data.json
       { generatedAt, version,
         series, teams, team_season_names, team_identity, drivers,
         race_seasons, races, app_state,
         race_results, race_sprints, race_qualifying, race_pit_stops,
         race_practice, race_grid_penalties,
         season_driver_standings, season_team_standings,
         series_points, series_bonus_points,
         race_car_performance, team_engine_history, team_staff,
         team_part_stats, contract_history }
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

// Publishable (anon) key — safe to be public; overridable via env.
const ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvY21qaWV0dXZpZWdlbGx1aWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc5NDQsImV4cCI6MjEwMjcyMzk0NH0.LOrbnYYc6iE0AZ_90NmRSBMGS1bF0qlyoEXRyf95c_0';
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://jocmjietuviegelluiev.supabase.co').replace(/\/+$/, '');

// Table list for direct PostgREST reads. Map DB table → payload key.
const TABLES = [
  ['series', 'series'],
  ['Teams', 'teams'],
  ['team_season_names', 'team_season_names'],
  ['Team Identity', 'team_identity'],
  ['Drivers', 'drivers'],
  ['race_seasons', 'race_seasons'],
  ['races', 'races'],
  ['app_state', 'app_state'],
  ['race_results', 'race_results'],
  ['race_sprints', 'race_sprints'],
  ['race_qualifying', 'race_qualifying'],
  ['race_pit_stops', 'race_pit_stops'],
  ['race_practice', 'race_practice'],
  ['race_grid_penalties', 'race_grid_penalties'],
  ['season_driver_standings', 'season_driver_standings'],
  ['season_team_standings', 'season_team_standings'],
  ['series_points', 'series_points'],
  ['series_bonus_points', 'series_bonus_points'],
  ['race_car_performance', 'race_car_performance'],
  ['team_engine_history', 'team_engine_history'],
  ['team_staff', 'team_staff'],
  ['team_part_stats', 'team_part_stats'],
  ['contract_history', 'contract_history']
];

// Output location: the site root. Local layout is `scripts/../Site DB`; in the
// GitHub repo `scripts/` sits at the repo root and the cache lives at the root,
// so fall back to `..` (the repo root) when the local layout isn't present.
const SITE_ROOT = path.resolve(process.env.BTG_SITE_ROOT || (function () {
  var local = path.join(__dirname, '..', '..', 'Site DB');
  return fs.existsSync(local) ? local : path.join(__dirname, '..');
})());
const OUT_FILE = path.join(SITE_ROOT, 'cache', 'public-data.json');

async function readTable(name) {
  const pageSize = 1000;
  const baseUrl = SUPABASE_URL + '/rest/v1/' + encodeURIComponent(name) + '?select=*';
  const all = [];
  let from = 0;
  let total = Infinity;

  while (from <= total) {
    const to = from + pageSize - 1;
    const res = await fetch(baseUrl, {
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
        ? AbortSignal.timeout(30000)
        : undefined,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Accept': 'application/json',
        'Range-Unit': 'items',
        'Range': from + '-' + to
      }
    });
    if (!res.ok) throw new Error('table ' + name + ' -> HTTP ' + res.status + ' ' + res.statusText);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('table ' + name + ' -> non-array response');
    all.push(...rows);

    const rangeHdr = res.headers.get('Content-Range') || '';
    const m = rangeHdr.match(/^(?:items\s+)?(\d+)-(\d+)\/(\d+|\*)$/i);
    if (!m) {
      if (rows.length < pageSize) break;
      from += pageSize;
      continue;
    }
    const lastTo = Number(m[2]);
    const t = m[3];
    total = t === '*' ? Infinity : Number(t);
    if (rows.length === 0 || lastTo >= total - 1) break;
    from = lastTo + 1;
  }
  return all;
}

async function main() {
  console.log('Reading public tables from', SUPABASE_URL);
  const data = { generatedAt: new Date().toISOString(), version: 1 };
  const failedKeys = [];
  let directFailed = false;

  for (const [dbTable, key] of TABLES) {
    try {
      const rows = await readTable(dbTable);
      data[key] = Array.isArray(rows) ? rows : [];
      console.log('  ' + dbTable + ' -> ' + data[key].length + ' rows');
    } catch (e) {
      directFailed = true;
      failedKeys.push(key);
      console.log('  ' + dbTable + ' -> DENIED (' + (e && e.message) + ')');
      data[key] = [];
    }
  }

  // If the direct (anon) path failed for any tables, fall back to the
  // consolidated edge-function snapshot (service-role server-side).
  if (directFailed) {
    const edgeUrl = process.env.BTG_API_URL ||
      SUPABASE_URL + '/functions/v1/api?data=cache';
    console.log('Direct anon read incomplete — falling back to edge snapshot:', edgeUrl);
    try {
      const res = await fetch(edgeUrl, {
        headers: {
          'User-Agent': 'curl/8.0',
          'Accept': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY
        }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const snap = await res.json();
      if (snap && Array.isArray(snap.races)) {
        // Only fill tables the direct (anon) read couldn't get — never clobber
        // fresh direct reads (e.g. standings) with a stale snapshot.
        Object.keys(snap).forEach(function (k) {
          if (Array.isArray(snap[k]) && Array.isArray(data[k]) && data[k].length === 0) data[k] = snap[k];
        });
        console.log('  edge snapshot applied.');
      } else {
        throw new Error('unexpected edge payload shape');
      }
    } catch (e2) {
      console.error('  edge fallback also failed:', e2 && e2.message);
    }
  }

  if (!Array.isArray(data.races) || data.races.length === 0) {
    throw new Error('No race data could be fetched from any source.');
  }

  // Atomic write: temp file then rename so readers never see a partial cache.
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const tmpFile = OUT_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data));
  fs.renameSync(tmpFile, OUT_FILE);

  console.log('Wrote', OUT_FILE);
  if (failedKeys.length) console.log('Failed direct reads (filled from edge if possible):', failedKeys.join(', '));
  const counts = {};
  Object.keys(data).forEach(function (k) {
    if (Array.isArray(data[k])) counts[k] = data[k].length;
  });
  console.log('Tables:', JSON.stringify(counts, null, 2));
}

main().catch(function (e) {
  console.error('build-db-cache failed:', e && e.message);
  process.exit(1);
});
