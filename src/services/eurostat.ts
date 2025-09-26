// src/services/eurostat.ts
import type { Country, CountryStats } from "../data/stats";

/**
 * Batched Eurostat service using YOUR indexStats function,
 * with weekly caching (TTL default 7 days).
 */

// ====== Cache config ======
const CACHE_VERSION = "v3";           // bump to invalidate all old caches
const TTL_DAYS = 7;                   // cache freshness window
const CACHE_KEY = `statle:stats:${CACHE_VERSION}`;

// ====== Tiny utils ======
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchJSON(url: string) {
    console.log("[Eurostat] GET", url); // <— see which chunk you’re inspecting
  const u = new URL(url);
  // Cache-buster only when we MISS the local cache
  u.searchParams.set("_", String(Date.now()));
  const res = await fetch(u.toString(), {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  return res.json();
}

// ---- replace ONLY indexStats with this time-aware version ----
const indexStats = function (response: any): Record<string, number> {
  const dims: string[] | undefined = response?.id || response?.dimension?.id;
  const size: number[] | undefined = response?.size;
  const dimObj = response?.dimension;

  // Guard rails
  if (!dimObj || !dimObj.geo || !dimObj.geo.category || !dimObj.geo.category.index) {
    return {};
  }

  const geoIndex: Record<string, number> = dimObj.geo.category.index as Record<string, number>;
  const values: Record<string, number> = response?.value || {}; // sparse object keyed by linear index as string
  const out: Record<string, number> = {};

  // If we have proper dimension arrays (time present), compute linear indices
  if (Array.isArray(dims) && Array.isArray(size)) {
    const posGeo = dims.indexOf("geo");
    const posTime = dims.indexOf("time");

    // Precompute multipliers for linear flattening
    const multipliers = Array(size.length).fill(1);
    for (let i = 0; i < size.length - 1; i++) {
      let m = 1;
      for (let j = i + 1; j < size.length; j++) m *= size[j];
      multipliers[i] = m;
    }

    const latestTimeIdx = (() => {
      if (posTime === -1) return null;
      const timeIdxMap: Record<string, number> | undefined = dimObj.time?.category?.index;
      if (!timeIdxMap) return null;
      // pick max index (latest) by sorting keys asc and taking last
      const entries = Object.entries(timeIdxMap);
      if (!entries.length) return null;
      const maxIdx = Math.max(...entries.map(([, idx]) => Number(idx)));
      return maxIdx;
    })();

    for (const [geo, gIdx] of Object.entries(geoIndex)) {
      let coords = Array(size.length).fill(0);

      // set geo coordinate
      if (posGeo !== -1) coords[posGeo] = gIdx;

      // prefer latest time if present
      if (posTime !== -1 && latestTimeIdx != null) {
        coords[posTime] = latestTimeIdx;
      }

      // compute linear index
      const lin = coords.reduce((acc, c, i) => acc + c * multipliers[i], 0);
      const key = String(lin);
      const v = values[key];

      if (Number.isFinite(v)) out[geo] = v;
      // else: leave missing; caller will default to null
    }

    return out;
  }

  // Fallback: old simple path (no time dimension returned / already filtered)
  const arr = Object.entries(geoIndex)
    .map(([key, idx]) => ({
      id: key,
      value: (response.value as any)?.[idx as number] ?? null,
      name: dimObj.geo.category.label?.[key as string],
    }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => (a.value! > b.value! ? -1 : a.value! < b.value! ? 1 : 0));

  return arr.reduce((acc: Record<string, number>, d) => {
    acc[d.id] = d.value as number;
    return acc;
  }, {});
};

// Build a URL with many &geo=XX params (Eurostat accepts multiple)
function buildDatasetUrl(base: string, geos: string[]) {
  const u = new URL(base);
  for (const g of geos) u.searchParams.append("geo", g);
  console.log("[Eurostat] building URL with geos:", geos); // <— shows CH in the batch (or not)
  return u.toString();
}

/**
 * Fetch one dataset for MANY geos (chunked), return { GEO: value }.
 * Missing geos will simply not appear in the index; we’ll default to null later.
 */
async function fetchDatasetForGeos(baseUrlNoGeo: string, geoCodes: string[], chunkSize = 28) {
  const out: Record<string, number> = {};
  for (const part of chunk(geoCodes, chunkSize)) {
    const url = buildDatasetUrl(baseUrlNoGeo, part);
    const json = await fetchJSON(url);
    const idx = indexStats(json);
    Object.assign(out, idx);
  }
  return out; // { code: value }
}

// ====== Cache helpers ======
type CacheShape = {
  ts: number; // epoch ms when saved
  data: Record<string, CountryStats>;
};

function loadCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheShape;
  } catch {
    return null;
  }
}

function isFresh(ts: number, ttlDays = TTL_DAYS): boolean {
  const ageMs = Date.now() - ts;
  return ageMs < ttlDays * 24 * 60 * 60 * 1000;
}

function saveCache(data: Record<string, CountryStats>) {
  try {
    const payload: CacheShape = { ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

// ====== Public API ======
export async function getAllStats(
  countries: Country[],
  opts: { force?: boolean } = {}
): Promise<Record<string, CountryStats>> {
  // Try cache
  if (!opts.force) {
    const cached = loadCache();
    if (cached && isFresh(cached.ts)) {
      return cached.data;
    }
  }

  const codes = countries.map(c => c.code); // Use EL, XK, etc.
  console.log(`Fetching stats for ${codes} countries…`);

  // Dataset bases WITHOUT &geo
  const bases = {
    area:           "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/reg_area3?format=JSON&unit=KM2&landuse=TOTAL&lang=EN",
    population: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?format=JSON&sex=T&age=TOTAL&lang=EN",
    lifeExpectancy: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tps00205?format=JSON&unit=YR&sex=T&age=Y_LT1&lang=EN",
    unemployment:   "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfu3rt?format=JSON&lang=EN&isced11=TOTAL&sex=T&age=Y_GE25",
    GDP:            "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp?format=JSON&lang=EN&unit=MIO_EUR",
    GDPPerCapita:   "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp?format=JSON&lang=EN&unit=EUR_HAB",
  };

  // Fetch all six datasets in parallel (each internally batched)
  const [areaMap, popMap, leMap, unempMap, gdpMap, gdpPcMap] = await Promise.all([
    fetchDatasetForGeos(bases.area,           codes),
    fetchDatasetForGeos(bases.population,     codes),
    fetchDatasetForGeos(bases.lifeExpectancy, codes),
    fetchDatasetForGeos(bases.unemployment,   codes),
    fetchDatasetForGeos(bases.GDP,            codes),
    fetchDatasetForGeos(bases.GDPPerCapita,   codes),
  ]);

  // Merge per code
  const result: Record<string, CountryStats> = {};
  for (const code of codes) {
    result[code] = {
      area:           asNumOrNull(areaMap[code]),
      population:     asNumOrNull(popMap[code]),
      lifeExpectancy: asNumOrNull(leMap[code]),
      unemployment:   asNumOrNull(unempMap[code]),
      GDP:            asNumOrNull(gdpMap[code]),
      GDPPerCapita:   asNumOrNull(gdpPcMap[code]),
    };
  }

  saveCache(result);
  return result;
}

// ====== misc ======
function asNumOrNull(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
