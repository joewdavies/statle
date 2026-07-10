// the countries included in statle. Each country has a code, lat, long and a name

import { eurostatCountries } from "./eurostat";
import { restOfWorldCountries } from "./restOfWorld";
import { countryNamesES } from "../../i18n/countryNamesES";

export type Country = {
  code: string;
  latitude: number;
  longitude: number;
  name: string;
  nameES?: string;
};

export const countries = [...eurostatCountries, ...restOfWorldCountries]
  .map(c => ({
    ...c,
    nameES: countryNamesES[c.code] || c.name
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })) as Country[];
  
export const countriesMap: Map<string, Country> = new Map(
  countries.map((c) => [c.code, c])
);