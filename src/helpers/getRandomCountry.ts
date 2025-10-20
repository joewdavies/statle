import { countries, Country } from "../data/countries/countries";
import { stats } from "../data/stats/stats";
import { UserStatsService } from '../services/userStats';

function hasStats(code: string): code is keyof typeof stats {
  return Object.prototype.hasOwnProperty.call(stats, code);
}

import { countries } from '../data/countries';
import type { Country } from '../data/countries';
import { stats } from '../data/stats/stats';
import { hasStats } from '../helpers/hasStats';
import { UserStatsService } from '../services/userStats';

export function getRandomCountry(): Country {
  const minClues = 3;

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

export function getDailyCountry() {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
  const index = seed % countries.length;
  return countries[index];
}
