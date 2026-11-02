import { afterEach, describe, expect, it, vi } from 'vitest'
import { countryCodeToEmoji, getFlagURL } from './getFlag'
import { proximityFromDistanceKm, proximityToCells5 } from './proximity-bar'
import { isChristmas } from './isChristmas'

describe('getFlagURL', () => {
  it('builds a lowercase flagcdn URL', () => {
    expect(getFlagURL('FR')).toBe('https://flagcdn.com/w160/fr.png')
  })

  it('maps the Eurostat Greek code EL to gr', () => {
    expect(getFlagURL('EL')).toBe('https://flagcdn.com/w160/gr.png')
  })
})

describe('countryCodeToEmoji', () => {
  it('converts alpha-2 codes to regional indicator flags', () => {
    expect(countryCodeToEmoji('US')).toBe('\u{1F1FA}\u{1F1F8}')
    expect(countryCodeToEmoji('fr')).toBe('\u{1F1EB}\u{1F1F7}')
  })

  it('returns an empty string for invalid input', () => {
    expect(countryCodeToEmoji('')).toBe('')
    expect(countryCodeToEmoji('USA')).toBe('')
  })
})

describe('proximity bar', () => {
  it('maps distance to a 0-100 proximity', () => {
    expect(proximityFromDistanceKm(0)).toBe(100)
    expect(proximityFromDistanceKm(10000)).toBe(50)
    expect(proximityFromDistanceKm(20000)).toBe(0)
  })

  it('clamps out-of-range distances', () => {
    expect(proximityFromDistanceKm(50000)).toBe(0)
    expect(proximityFromDistanceKm(-5)).toBe(100)
  })

  it('always splits into five cells', () => {
    for (const p of [0, 10, 50, 77, 100]) {
      const { greens, whites } = proximityToCells5(p)
      expect(greens + whites).toBe(5)
    }
    expect(proximityToCells5(100)).toEqual({ greens: 5, whites: 0 })
    expect(proximityToCells5(0)).toEqual({ greens: 0, whites: 5 })
  })
})

describe('isChristmas', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [new Date(2025, 11, 1), true],
    [new Date(2025, 11, 25), true],
    [new Date(2026, 0, 6), true],
    [new Date(2026, 0, 7), false],
    [new Date(2025, 10, 30), false],
    [new Date(2025, 6, 4), false],
  ])('%s -> %s', (date, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(date)
    expect(isChristmas()).toBe(expected)
  })
})
