// the countries included in statle. Each country has a code, lat, long and a name

import { eurostatCountries } from "./eurostat";
import { restOfWorldCountries } from "./restOfWorld";

export type Country = {
  code: string;
  latitude: number;
  longitude: number;
  name: string;
};

export const countries = [...eurostatCountries, ...restOfWorldCountries]
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })) as Country[];
  
export const countriesMap: Map<string, Country> = new Map(
  countries.map((c) => [c.code, c])
);