import { describe, expect, it } from 'vitest'
import { countries, countriesMap, getCountryName } from './countries/countries'
import { stats } from './stats/stats'
import { translations, Language } from '../i18n/translations'

const CORE_CLUES = ['population', 'area', 'gdpPerCapita', 'lifeExpectancy', 'goats'] as const
const languages = Object.keys(translations) as Language[]

describe('country list', () => {
  it('has 197 unique, well-formed countries', () => {
    expect(countries).toHaveLength(197)
    expect(new Set(countries.map((c) => c.code)).size).toBe(countries.length)
    for (const c of countries) {
      expect(c.code).toMatch(/^[A-Z]{2}$/)
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.latitude).toBeGreaterThanOrEqual(-90)
      expect(c.latitude).toBeLessThanOrEqual(90)
      expect(c.longitude).toBeGreaterThanOrEqual(-180)
      expect(c.longitude).toBeLessThanOrEqual(180)
    }
  })

  it('is sorted alphabetically and indexed by code', () => {
    const names = countries.map((c) => c.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
    expect(countriesMap.get('FR')?.name).toBe('France')
  })

  it('localises names with an English fallback', () => {
    const germany = countriesMap.get('DE')!
    expect(getCountryName(germany, 'en')).toBe('Germany')
    expect(getCountryName(germany, 'fr')).toBe('Allemagne')
    expect(getCountryName(germany, 'de')).toBe('Deutschland')
    expect(getCountryName(germany, 'es')).toBe('Alemania')
    for (const c of countries) {
      for (const lang of languages) {
        expect(getCountryName(c, lang).length).toBeGreaterThan(0)
      }
    }
  })
})

describe('stats dataset', () => {
  it('has a record for every playable country', () => {
    for (const c of countries) {
      expect(stats, `missing stats for ${c.code}`).toHaveProperty(c.code)
    }
  })

  it('gives every country at least two core clues', () => {
    for (const c of countries) {
      const s = (stats as Record<string, Record<string, unknown>>)[c.code]
      const filled = CORE_CLUES.filter((f) => s[f] != null).length
      expect(filled, `${c.code} has ${filled} core clues`).toBeGreaterThanOrEqual(2)
    }
  })

  it('has sane numeric values', () => {
    for (const c of countries) {
      const s = (stats as Record<string, Record<string, any>>)[c.code]
      if (s.population != null) expect(s.population).toBeGreaterThan(0)
      if (s.area != null) expect(s.area).toBeGreaterThan(0)
      if (s.lifeExpectancy != null) {
        expect(s.lifeExpectancy).toBeGreaterThan(30)
        expect(s.lifeExpectancy).toBeLessThan(100)
      }
      if (s.corruption != null) {
        expect(s.corruption).toBeGreaterThanOrEqual(0)
        expect(s.corruption).toBeLessThanOrEqual(100)
      }
    }
  })

  it('only lists borders that are playable country codes', () => {
    const codes = new Set(countries.map((c) => c.code))
    for (const c of countries) {
      const borders = (stats as Record<string, Record<string, any>>)[c.code].borders ?? []
      for (const b of borders) expect(codes.has(b), `${c.code} borders unknown ${b}`).toBe(true)
    }
  })

  it('has symmetric land borders', () => {
    for (const c of countries) {
      const borders: string[] = (stats as Record<string, Record<string, any>>)[c.code].borders ?? []
      for (const b of borders) {
        const back: string[] = (stats as Record<string, Record<string, any>>)[b]?.borders ?? []
        expect(back.includes(c.code), `${c.code} lists ${b} but not vice versa`).toBe(true)
      }
    }
  })
})

describe('translations', () => {
  const baseKeys = Object.keys(translations.en)

  it('provides the same keys in every language', () => {
    for (const lang of languages) {
      const missing = baseKeys.filter((k) => !(k in translations[lang]))
      expect(missing, `${lang} missing keys`).toEqual([])
    }
  })

  it('has no empty strings and preserves placeholders', () => {
    for (const lang of languages) {
      for (const key of baseKeys) {
        const value = translations[lang][key]
        expect(value?.trim().length, `${lang}.${key} is empty`).toBeGreaterThan(0)
        const placeholders = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort()
        expect(placeholders(value), `${lang}.${key} placeholders`).toEqual(placeholders(translations.en[key]))
      }
    }
  })
})
