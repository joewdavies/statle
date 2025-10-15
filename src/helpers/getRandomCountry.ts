import { countries, Country } from "../data/countries/countries";
import { stats } from "../data/stats/stats";

function hasStats(code: string): code is keyof typeof stats {
  return Object.prototype.hasOwnProperty.call(stats, code);
}

export function getRandomCountry(): Country {
  const minClues = 5;

  // keep only countries whose code exists in `stats` and has ≥ minClues non-null values
  const validCountries = countries.filter((c) => {
    if (!hasStats(c.code)) return false;
    const s = stats[c.code];
    const filled = Object.values(s).filter(v => v !== null && v !== undefined).length;
    return filled >= minClues;
  });

  // fallback if none (shouldn't happen, but keeps TS happy and avoids runtime errors)
  const pool = validCountries.length ? validCountries : countries.filter(c => hasStats(c.code));

  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDailyCountry() {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
  const index = seed % countries.length;
  return countries[index];
}
