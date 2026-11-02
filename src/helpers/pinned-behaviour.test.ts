import { afterEach, describe, expect, it, vi } from 'vitest'
import { dailyIndex, dayIndexLocal, msUntilLocalReset, todayKeyLocal } from './daily'
import { getDailyCountry } from './getRandomCountry'
import { isChristmas } from './isChristmas'
import { resetGame } from './resetGame'
import { countries } from '../data/countries/countries'
import { directionMap, getCompassDirection, getRhumbBearing, sharesLandBorder } from '../services/geo'

const at = (y: number, m: number, d: number, h = 12) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(y, m, d, h))
}

afterEach(() => vi.useRealTimers())

describe('daily puzzle is pinned', () => {
  // These fix the published puzzle sequence. If they change, every player's
  // "today" changes too, so update them only on purpose (e.g. the country list changed).
  it.each([
    [[2025, 0, 1], 'HU', 0],
    [[2025, 5, 15], 'PE', 165],
    [[2025, 11, 31], 'ME', 167],
    [[2026, 2, 9], 'TV', 38],
    [[2026, 10, 2], 'PS', 79],
    [[2027, 6, 20], 'NZ', 142],
  ] as const)('%j -> %s', ([y, m, d], code, idx) => {
    at(y, m, d)
    expect(getDailyCountry().code).toBe(code)
    expect(dailyIndex(197)).toBe(idx)
  })

  it('has a day index of zero on the epoch and increments daily', () => {
    expect(dayIndexLocal(new Date(2025, 0, 1, 23, 59))).toBe(0)
    expect(dayIndexLocal(new Date(2025, 0, 2, 0, 0))).toBe(1)
    expect(dayIndexLocal(new Date(2026, 0, 1))).toBe(365)
  })

  it('stays inside the list for dates before the epoch', () => {
    const idx = dailyIndex(10, new Date(2024, 11, 31))
    expect(idx).toBe(9)
    expect(dailyIndex(10, new Date(2024, 11, 22))).toBe(0)
  })

  it('wraps around the list length', () => {
    expect(dailyIndex(10, new Date(2025, 0, 11))).toBe(0)
    expect(dailyIndex(10, new Date(2025, 0, 14))).toBe(3)
  })

  it('formats the day key with zero padding', () => {
    expect(todayKeyLocal(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(todayKeyLocal(new Date(2025, 11, 25))).toBe('2025-12-25')
  })

  it('counts down to the next local midnight', () => {
    expect(msUntilLocalReset(new Date(2025, 5, 1, 23, 0, 0))).toBe(3_600_000)
    expect(msUntilLocalReset(new Date(2025, 5, 1, 0, 0, 0))).toBe(86_400_000)
    expect(msUntilLocalReset(new Date(2025, 11, 31, 23, 59, 59, 500))).toBe(500)
  })
})

describe('isChristmas', () => {
  it.each([
    [2025, 10, 30, false],
    [2025, 11, 1, true],
    [2025, 11, 25, true],
    [2025, 11, 31, true],
    [2026, 0, 1, true],
    [2026, 0, 6, true],
    [2026, 0, 7, false],
    [2025, 5, 15, false],
    [2025, 1, 3, false],
  ])('%i-%i-%i -> %s', (y, m, d, expected) => {
    at(y, m, d)
    expect(isChristmas()).toBe(expected)
  })
})

describe('resetGame', () => {
  it('announces which country was chosen', () => {
    const listener = vi.fn()
    addEventListener('statle:reset', listener)
    const next = countries.find((c) => c.code === 'JP')!
    resetGame({
      setCountry: vi.fn(),
      setGuesses: vi.fn(),
      setGuessCount: vi.fn(),
      setGameStatus: vi.fn(),
      rng: () => next,
    })
    removeEventListener('statle:reset', listener)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ country: 'JP' })
  })
})

describe('compass directions', () => {
  const o = { latitude: 0, longitude: 0 }

  it('keeps the arrow for every compass point', () => {
    expect(directionMap).toEqual({
      N: '⬆️',
      NE: '↗️',
      E: '➡️',
      SE: '↘️',
      S: '⬇️',
      SW: '↙️',
      W: '⬅️',
      NW: '↖️',
      NNE: '⬆️',
      ENE: '➡️',
      ESE: '↘️',
      SSE: '⬇️',
      SSW: '⬇️',
      WSW: '⬅️',
      WNW: '⬅️',
      NNW: '⬆️',
    })
  })

  it('uses 8 points by default and 16 on request', () => {
    const target = { latitude: 10, longitude: 4 }
    expect(getCompassDirection(o, target)).toBe('N')
    expect(getCompassDirection(o, target, 8)).toBe('N')
    expect(getCompassDirection(o, target, 16)).toBe('NNE')
  })

  it('reports the right point for the cardinal directions', () => {
    expect(getCompassDirection(o, { latitude: 20, longitude: 0 })).toBe('N')
    expect(getCompassDirection(o, { latitude: -20, longitude: 0 })).toBe('S')
    expect(getCompassDirection(o, { latitude: 0, longitude: 20 })).toBe('E')
    expect(getCompassDirection(o, { latitude: 0, longitude: -20 })).toBe('W')
  })

  it('treats a due-east half-turn as east, not west', () => {
    expect(getRhumbBearing(o, { latitude: 0, longitude: 180 })).toBeCloseTo(90, 5)
    expect(getRhumbBearing(o, { latitude: 0, longitude: -180 })).toBeCloseTo(270, 5)
  })

  it('takes the short way across the anti-meridian', () => {
    expect(getRhumbBearing({ latitude: 0, longitude: 170 }, { latitude: 0, longitude: -170 })).toBeCloseTo(90, 5)
    expect(getRhumbBearing({ latitude: 0, longitude: -170 }, { latitude: 0, longitude: 170 })).toBeCloseTo(270, 5)
  })
})

describe('sharesLandBorder', () => {
  const stats = { AA: { borders: ['BB'] }, BB: {}, CC: { borders: [] } }
  it('is true if either side lists the other', () => {
    expect(sharesLandBorder('AA', 'BB', stats)).toBe(true)
    expect(sharesLandBorder('BB', 'AA', stats)).toBe(true)
  })
  it('is false otherwise, including unknown countries', () => {
    expect(sharesLandBorder('AA', 'CC', stats)).toBe(false)
    expect(sharesLandBorder('ZZ', 'YY', stats)).toBe(false)
  })
})
