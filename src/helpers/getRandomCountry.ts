import { countries, Country } from "../data/countries/countries";
import { stats } from "../data/stats/stats";
import { UserStatsService } from '../services/userStats';

function hasStats(code: string): code is keyof typeof stats {
  return Object.prototype.hasOwnProperty.call(stats, code);
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number) {
  return () => {
    a >>>= 0;
    let t = (a += 0x9e3779b9);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

export function getDailyCountry() {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const seed = xmur3(key)();
  const rand = sfc32(seed)() / 2 ** 32;
  const index = Math.floor(rand * countries.length);
  return countries[index];
}

export function getRandomCountry(): Country {
  const minClues = 2;

  // already-active country (avoid repeating immediately)
  const lastCountryCode = localStorage.getItem('country');

  // build a Set of previously played country codes from history
  const playedCodes = new Set(UserStatsService.getAll().map(g => g.countryCode));

  // primary pool: valid + not played + not the current one
  const validUnplayed = countries.filter((c) => {
    if (c.code === lastCountryCode) return false;
    if (playedCodes.has(c.code)) return false;
    if (!hasStats(c.code)) return false;

    const s = stats[c.code];
    const filled = Object.values(s).filter(v => v != null).length;
    return filled >= minClues;
  });

  // graceful fallbacks so the game never breaks
  let pool = validUnplayed;
  if (!pool.length) {
    // allow repeats, but still require stats and avoid current
    const anyValid = countries.filter(c => hasStats(c.code) && c.code !== lastCountryCode);
    pool = anyValid.length ? anyValid : countries;
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem('country', chosen.code); // keep your existing localStorage flow
  return chosen;
}