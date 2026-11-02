import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../data/countries/countries', () => {
  const mk = (code: string) => ({ code, name: code, latitude: 0, longitude: 0 })
  return { countries: ['AA', 'BB', 'CC', 'DD', 'EE'].map(mk) }
})

vi.mock('../data/stats/stats', () => ({
  stats: {
    AA: { a: 1, b: 2 }, // exactly the minimum of two clues
    BB: { a: 1, b: null }, // one clue: too few
    CC: { a: 1, b: undefined, c: null }, // one clue
    DD: { a: 1, b: 2, c: 3 },
    // EE has no stats at all
  },
}))

import { getRandomCountry } from './getRandomCountry'
import { UserStatsService } from '../services/userStats'

const played = (code: string) =>
  UserStatsService.upsert(
    UserStatsService.buildRecord({ countryCode: code, countryName: code, result: 'won', guesses: ['x'], date: '2024-01-01' })
  )

const pick = (r: number) => {
  vi.spyOn(Math, 'random').mockReturnValue(r)
  return getRandomCountry().code
}

describe('getRandomCountry pool', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('only picks countries with at least two clues', () => {
    expect(pick(0)).toBe('AA')
    expect(pick(0.999)).toBe('DD')
    for (const r of [0, 0.3, 0.6, 0.999]) expect(['AA', 'DD']).toContain(pick(r))
  })

  it('maps the random number across the whole pool', () => {
    expect(pick(0.49)).toBe('AA')
    expect(pick(0.5)).toBe('DD')
  })

  it('skips the country currently being played', () => {
    localStorage.setItem('country', 'AA')
    expect(pick(0)).toBe('DD')
    localStorage.setItem('country', 'DD')
    expect(pick(0.999)).toBe('AA')
  })

  it('skips countries already in the history', () => {
    played('AA')
    expect(pick(0)).toBe('DD')
  })

  it('remembers the choice for next time', () => {
    const code = pick(0)
    expect(localStorage.getItem('country')).toBe(code)
  })

  it('once everything is played, repeats any country that has stats, but not the current one', () => {
    ;['AA', 'BB', 'CC', 'DD', 'EE'].forEach(played)
    localStorage.setItem('country', 'AA')
    expect(pick(0)).toBe('BB')
    localStorage.setItem('country', 'AA')
    expect(pick(0.999)).toBe('DD')
    for (const r of [0, 0.4, 0.8, 0.999]) {
      localStorage.setItem('country', 'AA')
      expect(['BB', 'CC', 'DD']).toContain(pick(r))
    }
  })

  it('never leaves the player without a puzzle if the pool would be empty', () => {
    ;['AA', 'DD'].forEach(played)
    localStorage.setItem('country', 'BB')
    const code = pick(0)
    expect(['AA', 'CC', 'DD', 'BB']).toContain(code)
  })
})
