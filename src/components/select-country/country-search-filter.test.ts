import { describe, expect, it } from 'vitest'
import { fuzzyCountryFilter, normalize } from './country-search-filter'

const options = [
  { value: 'France', keywords: 'Frankreich' },
  { value: 'Germany', keywords: 'Deutschland Allemagne' },
  { value: 'Saint Lucia', keywords: '' },
  { value: 'Côte d’Ivoire', keywords: '' },
  { value: 'United States', keywords: 'USA' },
]
const search = (q: string, limit = 10) => fuzzyCountryFilter({ options, search: q, limit }).map((o: any) => o.value)

describe('normalize', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalize('  Côte d’Ivoire! ')).toBe('cote divoire')
    expect(normalize('SÃO')).toBe('sao')
  })
})

describe('fuzzyCountryFilter', () => {
  it('returns everything up to the limit for an empty query', () => {
    expect(search('', 3)).toHaveLength(3)
    expect(search('   ')).toHaveLength(options.length)
  })

  it('matches prefixes and substrings', () => {
    expect(search('fran')).toEqual(['France'])
    expect(search('many')).toEqual(['Germany'])
  })

  it('ignores accents', () => {
    expect(search('cote')).toEqual(['Côte d’Ivoire'])
  })

  it('matches localized keywords', () => {
    expect(search('deutsch')).toEqual(['Germany'])
    expect(search('allemagne')).toEqual(['Germany'])
  })

  it('expands abbreviations like st -> saint', () => {
    expect(search('st lucia')).toContain('Saint Lucia')
    expect(search('st. lucia')).toContain('Saint Lucia')
    expect(search('st')).toContain('Saint Lucia')
    expect(search('st france')).toEqual([])
  })

  it('respects the result limit when filtering', () => {
    expect(search('a', 2)).toHaveLength(2)
    expect(search('a', 1)).toHaveLength(1)
    expect(search('a', 0)).toHaveLength(0)
  })

  it('matches each word independently and in any order', () => {
    expect(search('states united')).toEqual(['United States'])
    expect(search('lucia saint')).toEqual(['Saint Lucia'])
  })

  it('ignores extra whitespace between words', () => {
    expect(search('  united    states  ')).toEqual(['United States'])
  })

  it('requires every token to match', () => {
    expect(search('united states')).toEqual(['United States'])
    expect(search('united france')).toEqual([])
  })

  it('tolerates a one-letter typo on short tokens', () => {
    expect(search('usa')).toContain('United States')
    expect(search('fra')).toContain('France')
    expect(search('frq')).toEqual(['France'])
    expect(search('gxrmany')).toEqual([])
  })

  it('returns nothing for gibberish', () => {
    expect(search('zzzzzzzz')).toEqual([])
  })

  it('treats regex metacharacters literally', () => {
    expect(() => search('(.*)+[')).not.toThrow()
    expect(search('.*')).toEqual([])
  })
})
