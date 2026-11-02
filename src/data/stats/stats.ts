
import { dataset } from "./dataset";

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
  tax?: number | null | undefined;
  corruption?: number | null | undefined;
  landlocked?: boolean | null | undefined;
  airPassengers?: number | null | undefined;
  bribes?: number | null | undefined;
  cereal?: number | null | undefined;
  electricity?: number | null | undefined;
  borders?: string[] | null | undefined;
};

// Optional convenience
export type CountryCode = keyof typeof stats;

// static export (no fetching)
export const stats = {
  ...dataset,
} as const satisfies Record<string, CountryStats>;