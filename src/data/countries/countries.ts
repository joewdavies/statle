// the countries included in statle. Each country has a code, lat, long and a name

import { eurostatCountries } from "./eurostat";
import { restOfWorldCountries } from "./restOfWorld";
import { countryNamesES } from "../../i18n/countryNamesES";
import type { Language } from "../../i18n/translations";

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

const regionNames = new Map<Language, Intl.DisplayNames>();
const nonStandardRegionNames: Partial<Record<Language, Record<string, string>>> = {
  en: { EL: "Greece", XK: "Kosovo" },
  es: { EL: "Grecia", XK: "Kosovo" },
  fr: { EL: "Grèce", XK: "Kosovo" },
  de: { EL: "Griechenland", XK: "Kosovo" },
};

export function getCountryName(country: Country, language: Language): string {
  const override = nonStandardRegionNames[language]?.[country.code];
  if (override) return override;
  if (language === "en") return country.name;
  if (language === "es" && country.nameES) return country.nameES;

  let names = regionNames.get(language);
  if (!names) {
    names = new Intl.DisplayNames([language], { type: "region" });
    regionNames.set(language, names);
  }

  const localizedName = names.of(country.code);
  return localizedName && localizedName !== country.code ? localizedName : country.name;
}