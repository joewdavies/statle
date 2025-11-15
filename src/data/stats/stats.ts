
import { dataset } from "./dataset";
import { useEffect, useState } from "react";
import { countries } from "../countries/countries";
import { getAllStats } from "../../services/eurostat";

export type CountryStats = {
  area?: number | null | undefined;
  population?: number | null | undefined;
  lifeExpectancy?: number | null | undefined;
  unemployment?: number | null | undefined;
  gdp?: number | null | undefined;
  gdpPerCapita?: number | null | undefined;
  goats?: number | null | undefined;
  carSide?: string | undefined;
  currencies?: Record<string, { name: string; symbol: string }> | undefined;
  forestArea?: number | null | undefined;
  precipitation?: number | null | undefined;
  co2?: number | null | undefined;
  wheat?: number | null | undefined;
  tax?: number | null | undefined;
  corruption?: number | null | undefined;
  landlocked?: boolean | null | undefined;
  airPassengers?: number | null | undefined;
};

// Optional convenience
export type CountryCode = keyof typeof stats;

// React hook that retrieves and returns stats by code
export function useCountryStats(force = false) {
  const [statsByCode, setStatsByCode] =
    useState<Record<string, CountryStats> | null>(null);

  useEffect(() => {
    (async () => {
      const all = await getAllStats(countries, { force });
      setStatsByCode(all);
    })();
  }, [force]);

  return statsByCode;
}
// static export (no fetching)
export const stats = {
  ...dataset,
} as const satisfies Record<string, CountryStats>;