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
    { circuit: 'Bahrain',              gp: 'Bahrain Grand Prix',         alt: 'Sakhir Grand Prix',               noun: 'Bahrain',          country: 'Bahrain',            flag: 'bh', trackId: 2,  img: 'Bahrain' },
    { circuit: 'Jeddah',               gp: 'Saudi Arabian Grand Prix',   alt: 'Jeddah Grand Prix',               noun: 'Saudi Arabia',     country: 'SaudiArabia',        flag: 'sa', trackId: 11, img: 'Jeddah' },
    { circuit: 'AlbertPark',           gp: 'Australian Grand Prix',      alt: 'Melbourne Grand Prix',            noun: 'Australia',        country: 'Australia',          flag: 'au', trackId: 1,  img: 'Australia' },
    { circuit: 'Suzuka',               gp: 'Japanese Grand Prix',        alt: 'Suzuka Grand Prix',               noun: 'Japan',            country: 'Japan',              flag: 'jp', trackId: 17, img: 'Japan' },
    { circuit: 'Shanghai',             gp: 'Chinese Grand Prix',         alt: 'Shanghai Grand Prix',             noun: 'China',            country: 'China',              flag: 'cn', trackId: 3,  img: 'China' },
    { circuit: 'Miami',                gp: 'Miami Grand Prix',           alt: 'United States Grand Prix',        noun: 'United States',    country: 'UnitedStates',       flag: 'us', trackId: 22, img: 'Miami' },
    { circuit: 'Imola',                gp: 'Emilia-Romagna Grand Prix',  alt: 'Italian Grand Prix',              noun: 'Italy',            country: 'Italy',              flag: 'it', trackId: 24, img: 'Imola' },
    { circuit: 'Monaco',               gp: 'Monaco Grand Prix',          alt: 'Monte Carlo Grand Prix',          noun: 'Monaco',           country: 'Monaco',             flag: 'mc', trackId: 6,  img: 'Monaco' },
    { circuit: 'Montreal',             gp: 'Canadian Grand Prix',        alt: 'Montreal Grand Prix',             noun: 'Canada',           country: 'Canada',             flag: 'ca', trackId: 7,  img: 'Canada' },
    { circuit: 'Barcelona',            gp: 'Spanish Grand Prix',         alt: 'Barcelona Grand Prix',            noun: 'Spain',            country: 'Spain',              flag: 'es', trackId: 5,  img: 'Spain' },
    { circuit: 'RedBullRing',          gp: 'Austrian Grand Prix',        alt: 'Styrian Grand Prix',              noun: 'Austria',          country: 'Austria',            flag: 'at', trackId: 9,  img: 'Austria' },
    { circuit: 'Silverstone',          gp: 'British Grand Prix',         alt: 'Silverstone Grand Prix',          noun: 'Britain',          country: 'UnitedKingdom',      flag: 'gb', trackId: 10, img: 'Silverstone' },
    { circuit: 'Hungaroring',          gp: 'Hungarian Grand Prix',       alt: 'Budapest Grand Prix',             noun: 'Hungary',          country: 'Hungary',            flag: 'hu', trackId: 12, img: 'Hungary' },
    { circuit: 'SpaFrancorchamps',     gp: 'Belgian Grand Prix',         alt: 'Spa Grand Prix',                  noun: 'Belgium',          country: 'Belgium',            flag: 'be', trackId: 13, img: 'Belgium' },
    { circuit: 'Zandvoort',            gp: 'Dutch Grand Prix',           alt: 'Zandvoort Grand Prix',            noun: 'Netherlands',      country: 'Netherlands',        flag: 'nl', trackId: 23, img: 'Netherlands' },
    { circuit: 'Monza',                gp: 'Italian Grand Prix',         alt: 'Monza Grand Prix',                noun: 'Italy',            country: 'Italy',              flag: 'it', trackId: 14, img: 'Monza' },
    { circuit: 'Baku',                 gp: 'Azerbaijan Grand Prix',      alt: 'Baku Grand Prix',                 noun: 'Azerbaijan',       country: 'Azerbaijan',         flag: 'az', trackId: 4,  img: 'Azerbaijan' },
    { circuit: 'MarinaBay',            gp: 'Singapore Grand Prix',       alt: 'Marina Bay Grand Prix',           noun: 'Singapore',        country: 'Singapore',          flag: 'sg', trackId: 15, img: 'Singapore' },
    { circuit: 'CircuitOfTheAmericas', gp: 'United States Grand Prix',   alt: 'Texas Grand Prix',                noun: 'United States',    country: 'UnitedStates',       flag: 'us', trackId: 19, img: 'Texas' },
    { circuit: 'HermanosRodriguez',    gp: 'Mexico City Grand Prix',     alt: 'Mexican Grand Prix',              noun: 'Mexico',           country: 'Mexico',             flag: 'mx', trackId: 18, img: 'Mexico' },
    { circuit: 'Interlagos',           gp: 'São Paulo Grand Prix',       alt: 'Brazilian Grand Prix',            noun: 'Brazil',           country: 'Brazil',             flag: 'br', trackId: 20, img: 'Brazil' },
    { circuit: 'Vegas',                gp: 'Las Vegas Grand Prix',       alt: 'Nevada Grand Prix',               noun: 'United States',    country: 'UnitedStates',       flag: 'us', trackId: 25, img: 'Vegas' },
    { circuit: 'Qatar',                gp: 'Qatar Grand Prix',           alt: 'Losail Grand Prix',               noun: 'Qatar',            country: 'Qatar',              flag: 'qa', trackId: 26, img: 'Qatar' },
    { circuit: 'YasMarina',            gp: 'Abu Dhabi Grand Prix',       alt: 'Yas Marina Grand Prix',           noun: 'Abu Dhabi',        country: 'UnitedArabEmirates', flag: 'ae', trackId: 21, img: 'AbuDhabi' },

    // ── XGT circuits (country-GP naming, venue alts; Le Mans & Daytona special) ──
    { circuit: 'Kyalami',         gp: 'South African Grand Prix', alt: 'Kyalami Grand Prix',               noun: 'South Africa',        country: 'SouthAfrica',   flag: 'za', trackId: null, img: 'Kyalami' },
    { circuit: 'DubaiAutodrome',  gp: 'Dubai Grand Prix',         alt: 'Emirati Grand Prix',               noun: 'United Arab Emirates', country: 'UAE',           flag: 'ae', trackId: null, img: 'DubaiAutodrome' },
    { circuit: 'TermasRioHondo',  gp: 'Argentine Grand Prix',     alt: 'Termas de Río Hondo Grand Prix',   noun: 'Argentina',            country: 'Argentina',     flag: 'ar', trackId: null, img: 'RioHondo' },
    { circuit: 'Bathurst',        gp: 'Bathurst Grand Prix',      alt: 'Australian Grand Prix',            noun: 'Australia',            country: 'Australia',     flag: 'au', trackId: null, img: 'Bathurst_' },
    { circuit: 'LeMans',          gp: 'Le Mans 800',             alt: 'Le Mans',                      noun: 'Le Mans',              country: 'France',        flag: 'fr', trackId: null, img: 'Le Mans' },
    { circuit: 'Brno',            gp: 'Czech Grand Prix',         alt: 'Brno Grand Prix',                  noun: 'Czech Republic',       country: 'CzechRepublic', flag: 'cz', trackId: null, img: 'Brno' },
    { circuit: 'Nurburgring',     gp: 'German Grand Prix',        alt: 'Nürburgring Grand Prix',           noun: 'Germany',              country: 'Germany',       flag: 'de', trackId: null, img: 'Nurburg' },
    { circuit: 'BuenosAires',     gp: 'Buenos Aires Grand Prix',  alt: 'Argentine Grand Prix',             noun: 'Argentina',            country: 'Argentina',     flag: 'ar', trackId: null, img: 'BuenosAires' },
    { circuit: 'Sonoma',          gp: 'Sonoma Grand Prix',        alt: 'United States Grand Prix',         noun: 'United States',        country: 'USA',           flag: 'us', trackId: null, img: 'Sonoma' },
    { circuit: 'Daytona',         gp: 'Daytona 700',             alt: 'United States Grand Prix',      noun: 'United States',        country: 'USA',           flag: 'us', trackId: null, img: 'Daytona' }
  ];

  var bySlug = {};
  CIRCUITS.forEach(function (c) { bySlug[c.circuit] = c; });

  BTG.CIRCUITS = CIRCUITS;
  BTG.circuitBySlug = function (slug) { return bySlug[slug] || null; };
  BTG.gpNameFor = function (circuit, format) {
    var c = bySlug[circuit];
    if (c) {
      // Daytona: flagship race is "Daytona 700"; any other race uses the US GP name.
      if (c.circuit === 'Daytona') {
        return String(format || '').toLowerCase() === 'flagship' ? 'Daytona 700' : (c.alt || 'United States Grand Prix');
      }
      return c.gp;
    }
    return circuit ? (circuit + ' Grand Prix') : '';
  };
  BTG.gpNamesFor = function (circuit) {
    var c = bySlug[circuit];
    if (!c) return circuit ? [circuit + ' Grand Prix'] : [];
    var names = [c.gp];
    if (c.alt) names.push(c.alt);
    return names;
  };
  // Normalized race-name builder. The series supplies a template from the DB:
  //   suffix  "{name} Grand Prix"        -> "South African Grand Prix"
  //   prefix  "WTCR Race of {country}"   -> "WTCR Race of South Africa"
  // {name}    = the circuit's demonym (derived from its GP name)
  // {country} = the circuit's country noun (c.noun)
  BTG.raceNameFor = function (circuit, template) {
    var c = bySlug[circuit];
    var demonym = c ? c.gp.replace(/ Grand Prix$/, '') : (circuit || '');
    var noun = (c && c.noun) ? c.noun : demonym;
    var tpl = template || '{name} Grand Prix';
    // Special endurance races already include their distance in the GP name.
    if (c && /\d$/.test(c.gp) && /\{name\}\s*Grand Prix/.test(tpl)) return c.gp;
    return tpl.replace('{name}', demonym).replace('{country}', noun);
  };
})();
