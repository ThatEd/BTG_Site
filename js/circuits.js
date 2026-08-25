/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Circuit reference (shared)

   The list of circuits an admin can put on the calendar, and the metadata
   the public Calendar tab uses to render race cards (proper GP name, flag,
   track image). Keys match the `circuit` slug stored in the `races` table.

   Exposes:
     BTG.CIRCUITS            -> ordered array of circuit objects
     BTG.circuitBySlug(slug) -> circuit object | null
     BTG.gpNameFor(circuit)  -> display GP name (fallback: "<Circuit> Grand Prix")
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  window.BTG = window.BTG || {};

  // circuit: slug in the DB races.circuit column
  // gp:      proper Grand Prix name
  // country: slug in the DB races.country column
  // flag:    ISO-2 code -> Flags/<code>.svg
  // trackId: DB races.track_id (game TrackID)
  // img:     track image base name -> tracks/<img>.webp
  var CIRCUITS = [
    { circuit: 'Bahrain',              gp: 'Bahrain Grand Prix',         country: 'Bahrain',            flag: 'bh', trackId: 2,  img: 'Bahrain' },
    { circuit: 'Jeddah',               gp: 'Saudi Arabian Grand Prix',   country: 'SaudiArabia',        flag: 'sa', trackId: 11, img: 'Jeddah' },
    { circuit: 'AlbertPark',           gp: 'Australian Grand Prix',      country: 'Australia',          flag: 'au', trackId: 1,  img: 'Australia' },
    { circuit: 'Suzuka',               gp: 'Japanese Grand Prix',        country: 'Japan',              flag: 'jp', trackId: 17, img: 'Japan' },
    { circuit: 'Shanghai',             gp: 'Chinese Grand Prix',         country: 'China',              flag: 'cn', trackId: 3,  img: 'China' },
    { circuit: 'Miami',                gp: 'Miami Grand Prix',           country: 'UnitedStates',       flag: 'us', trackId: 22, img: 'Miami' },
    { circuit: 'Imola',                gp: 'Emilia-Romagna Grand Prix',  country: 'Italy',              flag: 'it', trackId: 24, img: 'Imola' },
    { circuit: 'Monaco',               gp: 'Monaco Grand Prix',          country: 'Monaco',             flag: 'mc', trackId: 6,  img: 'Monaco' },
    { circuit: 'Montreal',             gp: 'Canadian Grand Prix',        country: 'Canada',             flag: 'ca', trackId: 7,  img: 'Canada' },
    { circuit: 'Barcelona',            gp: 'Spanish Grand Prix',         country: 'Spain',              flag: 'es', trackId: 5,  img: 'Spain' },
    { circuit: 'RedBullRing',          gp: 'Austrian Grand Prix',        country: 'Austria',            flag: 'at', trackId: 9,  img: 'Austria' },
    { circuit: 'Silverstone',          gp: 'British Grand Prix',         country: 'UnitedKingdom',      flag: 'gb', trackId: 10, img: 'Silverstone' },
    { circuit: 'Hungaroring',          gp: 'Hungarian Grand Prix',       country: 'Hungary',            flag: 'hu', trackId: 12, img: 'Hungary' },
    { circuit: 'SpaFrancorchamps',     gp: 'Belgian Grand Prix',         country: 'Belgium',            flag: 'be', trackId: 13, img: 'Belgium' },
    { circuit: 'Zandvoort',            gp: 'Dutch Grand Prix',           country: 'Netherlands',        flag: 'nl', trackId: 23, img: 'Netherlands' },
    { circuit: 'Monza',                gp: 'Italian Grand Prix',         country: 'Italy',              flag: 'it', trackId: 14, img: 'Monza' },
    { circuit: 'Baku',                 gp: 'Azerbaijan Grand Prix',      country: 'Azerbaijan',         flag: 'az', trackId: 4,  img: 'Azerbaijan' },
    { circuit: 'MarinaBay',            gp: 'Singapore Grand Prix',       country: 'Singapore',          flag: 'sg', trackId: 15, img: 'Singapore' },
    { circuit: 'CircuitOfTheAmericas', gp: 'United States Grand Prix',   country: 'UnitedStates',       flag: 'us', trackId: 19, img: 'Texas' },
    { circuit: 'HermanosRodriguez',    gp: 'Mexico City Grand Prix',     country: 'Mexico',             flag: 'mx', trackId: 18, img: 'Mexico' },
    { circuit: 'Interlagos',           gp: 'São Paulo Grand Prix',       country: 'Brazil',             flag: 'br', trackId: 20, img: 'Brazil' },
    { circuit: 'Vegas',                gp: 'Las Vegas Grand Prix',       country: 'UnitedStates',       flag: 'us', trackId: 25, img: 'Vegas' },
    { circuit: 'Qatar',                gp: 'Qatar Grand Prix',           country: 'Qatar',              flag: 'qa', trackId: 26, img: 'Qatar' },
    { circuit: 'YasMarina',            gp: 'Abu Dhabi Grand Prix',       country: 'UnitedArabEmirates', flag: 'ae', trackId: 21, img: 'AbuDhabi' }
  ];

  var bySlug = {};
  CIRCUITS.forEach(function (c) { bySlug[c.circuit] = c; });

  BTG.CIRCUITS = CIRCUITS;
  BTG.circuitBySlug = function (slug) { return bySlug[slug] || null; };
  BTG.gpNameFor = function (circuit) {
    var c = bySlug[circuit];
    if (c) return c.gp;
    return circuit ? (circuit + ' Grand Prix') : '';
  };
})();
