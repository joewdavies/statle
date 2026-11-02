import { describe, expect, it, vi } from 'vitest'
import { getDailyCountry, getRandomCountry } from './getRandomCountry'
import { hardResetGame, resetGame } from './resetGame'
import { countries } from '../data/countries/countries'
import { GameStatus, MAX_GUESSES } from '../constants'
import { UserStatsService } from '../services/userStats'

describe('getDailyCountry', () => {
  it('returns the same country for the same day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 1, 1))
    const a = getDailyCountry()
    vi.setSystemTime(new Date(2025, 5, 1, 23))
    expect(getDailyCountry().code).toBe(a.code)
  })

  it('always returns a playable country across a year', () => {
    vi.useFakeTimers()
    const codes = new Set(countries.map((c) => c.code))
    const seen = new Set<string>()
    for (let day = 0; day < 365; day++) {
      vi.setSystemTime(new Date(2025, 0, 1 + day, 12))
      const c = getDailyCountry()
      expect(codes.has(c.code)).toBe(true)
      seen.add(c.code)
    }
    expect(seen.size).toBeGreaterThan(100)
  })
})

describe('getRandomCountry', () => {
  it('returns a playable country and stores it', () => {
    const c = getRandomCountry()
    expect(countries.some((x) => x.code === c.code)).toBe(true)
    expect(localStorage.getItem('country')).toBe(c.code)
  })

  it('never repeats the current country immediately', () => {
    localStorage.setItem('country', 'FR')
    for (let i = 0; i < 50; i++) {
      const c = getRandomCountry()
      expect(c.code).not.toBe('FR')
      localStorage.setItem('country', 'FR')
    }
  })

  it('avoids already played countries while unplayed ones remain', () => {
    const played = countries.slice(0, countries.length - 3).map((c) => c.code)
    played.forEach((code, i) =>
      UserStatsService.upsert(
        UserStatsService.buildRecord({
          countryCode: code,
          countryName: code,
          result: 'won',
          guesses: ['x'],
          date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
          finishedAt: i,
        })
      )
    )
    const remaining = new Set(countries.slice(-3).map((c) => c.code))
    for (let i = 0; i < 30; i++) {
      localStorage.removeItem('country')
      expect(remaining.has(getRandomCountry().code)).toBe(true)
    }
  })

  it('falls back to repeats once every country has been played', () => {
    countries.forEach((c, i) =>
      UserStatsService.upsert(
        UserStatsService.buildRecord({
          countryCode: c.code,
          countryName: c.name,
          result: 'won',
          guesses: ['x'],
          date: '2024-01-01',
          finishedAt: i,
        })
      )
    )
    expect(() => getRandomCountry()).not.toThrow()
  })
})

describe('resetGame', () => {
  it('resets state and storage using the supplied rng', () => {
    const next = countries.find((c) => c.code === 'JP')!
    const args = {
      setCountry: vi.fn(),
      setGuesses: vi.fn(),
      setGuessCount: vi.fn(),
      setGameStatus: vi.fn(),
      setInputValue: vi.fn(),
      rng: () => next,
    }
    const listener = vi.fn()
    addEventListener('statle:reset', listener)

    resetGame(args)

    expect(args.setCountry).toHaveBeenCalledWith(next)
    expect(args.setGuesses).toHaveBeenCalledWith(Array(MAX_GUESSES).fill(''))
    expect(args.setGuessCount).toHaveBeenCalledWith(0)
    expect(args.setGameStatus).toHaveBeenCalledWith(GameStatus.Playing)
    expect(args.setInputValue).toHaveBeenCalledWith('')
    expect(localStorage.getItem('country')).toBe('JP')
    expect(JSON.parse(localStorage.getItem('guesses')!)).toEqual(Array(MAX_GUESSES).fill(''))
    expect(JSON.parse(localStorage.getItem('guessCount')!)).toBe(0)
    expect(JSON.parse(localStorage.getItem('gameStatus')!)).toBe('playing')
    expect(listener).toHaveBeenCalledTimes(1)
    removeEventListener('statle:reset', listener)
  })

  it('works without an input setter', () => {
    expect(() =>
      resetGame({
        setCountry: vi.fn(),
        setGuesses: vi.fn(),
        setGuessCount: vi.fn(),
        setGameStatus: vi.fn(),
        rng: () => countries[0],
      })
    ).not.toThrow()
  })
})

describe('hardResetGame', () => {
  it('clears the game keys', () => {
    localStorage.setItem('country', 'FR')
    localStorage.setItem('guesses', '[]')
    localStorage.setItem('guessCount', '0')
    localStorage.setItem('gameStatus', '"playing"')
    localStorage.setItem('statle-lang', 'fr')
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    hardResetGame()
    vi.unstubAllGlobals()
    expect(localStorage.getItem('country')).toBeNull()
    expect(localStorage.getItem('guesses')).toBeNull()
    expect(localStorage.getItem('statle-lang')).toBe('fr')
  })
})
