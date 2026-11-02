import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserStatsService, GameResult } from './userStats'
import { dedupeStatleHistoryV1 } from './migrations'

const KEY = 'statleHistory.v1'

const game = (over: Partial<GameResult> = {}): GameResult => ({
  date: '2025-03-05',
  countryCode: 'FR',
  countryName: 'France',
  result: 'won',
  guesses: ['Spain', 'France'],
  guessCount: 2,
  finishedAt: 1000,
  ...over,
})

const store = (items: unknown) => localStorage.setItem(KEY, JSON.stringify({ v: 1, items }))
const stored = () => JSON.parse(localStorage.getItem(KEY)!).items as GameResult[]

describe('UserStatsService.upsert identity', () => {
  it.each([
    ['date', { date: '2025-03-06' }],
    ['countryCode', { countryCode: 'DE' }],
    ['countryName', { countryName: 'Germany' }],
    ['result', { result: 'lost' as const }],
    ['guessCount', { guessCount: 3 }],
    ['guess list length', { guesses: ['Spain', 'Italy', 'France'] }],
    ['guess content', { guesses: ['Spain', 'Italy'] }],
  ])('treats a game that differs in %s as a different game', (_name, over) => {
    UserStatsService.upsert(game())
    UserStatsService.upsert(game({ ...over, finishedAt: 2000 }))
    expect(UserStatsService.getAll()).toHaveLength(2)
  })

  it('does not confuse a game with a longer game that starts with the same guesses', () => {
    UserStatsService.upsert(game({ guesses: ['Spain', 'France'], guessCount: 2 }))
    UserStatsService.upsert(game({ guesses: ['Spain', 'France', 'Italy'], guessCount: 2, finishedAt: 2000 }))
    expect(UserStatsService.getAll()).toHaveLength(2)
  })

  it('collapses an identical game into one record', () => {
    UserStatsService.upsert(game())
    UserStatsService.upsert(game())
    expect(UserStatsService.getAll()).toHaveLength(1)
  })

  it('keeps the newest finishedAt when an identical game is re-saved, wherever it sits in history', () => {
    UserStatsService.upsert(game({ finishedAt: 1000 }))
    UserStatsService.upsert(game({ date: '2025-03-06', finishedAt: 1500 }))
    UserStatsService.upsert(game({ finishedAt: 3000 }))
    const first = UserStatsService.getAll().find((g) => g.date === '2025-03-05')!
    expect(first.finishedAt).toBe(3000)
    expect(UserStatsService.getAll()).toHaveLength(2)
  })

  it('does not let an older copy overwrite a newer one', () => {
    UserStatsService.upsert(game({ finishedAt: 3000 }))
    UserStatsService.upsert(game({ finishedAt: 1000 }))
    expect(UserStatsService.getAll()[0].finishedAt).toBe(3000)
  })
})

describe('UserStatsService storage', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
  afterEach(() => vi.useRealTimers())

  it('stamps new records with the local date, zero-padded', () => {
    vi.setSystemTime(new Date(2025, 2, 5, 12))
    expect(UserStatsService.buildRecord({ countryCode: 'FR', countryName: 'France', result: 'won', guesses: ['a'] }).date).toBe(
      '2025-03-05'
    )
    vi.setSystemTime(new Date(2025, 10, 25, 12))
    expect(UserStatsService.buildRecord({ countryCode: 'FR', countryName: 'France', result: 'won', guesses: ['a'] }).date).toBe(
      '2025-11-25'
    )
  })

  it('removeByDate removes only that date', () => {
    UserStatsService.upsert(game({ date: '2025-03-05' }))
    UserStatsService.upsert(game({ date: '2025-03-06', guesses: ['x'], guessCount: 1 }))
    UserStatsService.removeByDate('2025-03-05')
    expect(UserStatsService.getAll().map((g) => g.date)).toEqual(['2025-03-06'])
  })

  it('clear leaves a valid, empty history file', () => {
    UserStatsService.upsert(game())
    UserStatsService.clear()
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, items: [] })
  })

  it('reading an empty store does not create any storage entry', () => {
    expect(UserStatsService.getAll()).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('migrates a legacy array and removes the legacy key', () => {
    localStorage.setItem('statleHistory', JSON.stringify([game()]))
    expect(UserStatsService.getAll()).toHaveLength(1)
    expect(localStorage.getItem('statleHistory')).toBeNull()
    expect(stored()).toHaveLength(1)
  })

  it('prefers the v1 file over a stale legacy key', () => {
    store([game({ countryCode: 'DE', countryName: 'Germany' })])
    localStorage.setItem('statleHistory', JSON.stringify([game(), game({ date: '2025-01-01' })]))
    const all = UserStatsService.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].countryCode).toBe('DE')
    expect(localStorage.getItem('statleHistory')).not.toBeNull()
  })

  it('migrates an invalid legacy value to an empty history', () => {
    localStorage.setItem('statleHistory', JSON.stringify({ not: 'an array' }))
    expect(UserStatsService.getAll()).toEqual([])
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, items: [] })
  })

  it.each([
    ['unknown version', JSON.stringify({ v: 2, items: [game()] })],
    ['items not an array', JSON.stringify({ v: 1, items: 'nope' })],
    ['invalid json', '{oops'],
    ['null', 'null'],
  ])('treats %s as an empty history', (_n, raw) => {
    localStorage.setItem(KEY, raw)
    expect(UserStatsService.getAll()).toEqual([])
  })
})

describe('UserStatsService.getUserStats', () => {
  const seq = (...results: Array<'won' | 'lost'>) =>
    results.forEach((result, i) =>
      UserStatsService.upsert(
        game({ result, date: `2025-01-${String(i + 1).padStart(2, '0')}`, guesses: ['g'], guessCount: 1, finishedAt: i })
      )
    )

  it('keeps the best streak after a loss breaks the run', () => {
    seq('won', 'won', 'won', 'lost', 'won')
    const s = UserStatsService.getUserStats(6)
    expect(s.maxStreak).toBe(3)
    expect(s.currentStreak).toBe(1)
  })

  it('reports a zero current streak after a loss', () => {
    seq('won', 'won', 'lost')
    const s = UserStatsService.getUserStats(6)
    expect(s.currentStreak).toBe(0)
    expect(s.maxStreak).toBe(2)
  })

  it('computes win rate, played and wins', () => {
    seq('won', 'lost', 'won', 'lost')
    const s = UserStatsService.getUserStats(6)
    expect(s).toMatchObject({ played: 4, wins: 2, winRate: 0.5 })
    expect(s.lastGame?.date).toBe('2025-01-04')
  })

  it('has a zero win rate and no last game for an empty history', () => {
    expect(UserStatsService.getUserStats(6)).toMatchObject({ played: 0, winRate: 0, lastGame: null, maxStreak: 0 })
  })

  it('counts only wins in the guess distribution and ignores impossible guess counts', () => {
    store([
      game({ date: '2025-01-01', guessCount: 1 }),
      game({ date: '2025-01-02', guessCount: 3 }),
      game({ date: '2025-01-03', guessCount: 3 }),
      game({ date: '2025-01-04', guessCount: 6 }),
      game({ date: '2025-01-05', result: 'lost', guessCount: 6 }),
      game({ date: '2025-01-06', guessCount: 0 }),
      game({ date: '2025-01-07', guessCount: 7 }),
    ])
    const { guessDistribution } = UserStatsService.getUserStats(6)
    expect(Object.keys(guessDistribution)).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(guessDistribution).toEqual([1, 0, 2, 0, 0, 1])
  })

  it('always has at least one distribution bucket', () => {
    expect(UserStatsService.getUserStats(0).guessDistribution).toEqual([0])
  })
})

describe('dedupeStatleHistoryV1', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  it('does nothing when there is no history', () => {
    dedupeStatleHistoryV1()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it.each([
    ['unknown version', { v: 2, items: [game(), game()] }],
    ['missing version', { items: [game(), game()] }],
    ['items not an array', { v: 1, items: 'x' }],
  ])('leaves a %s file untouched', (_n, file) => {
    const raw = JSON.stringify(file)
    localStorage.setItem(KEY, raw)
    dedupeStatleHistoryV1()
    expect(localStorage.getItem(KEY)).toBe(raw)
  })

  it('leaves corrupted JSON untouched', () => {
    localStorage.setItem(KEY, '{bad')
    expect(() => dedupeStatleHistoryV1()).not.toThrow()
    expect(localStorage.getItem(KEY)).toBe('{bad')
  })

  it('does not rewrite a history that has no duplicates', () => {
    const raw = JSON.stringify({ v: 1, items: [game({ date: '2025-03-09' }), game({ date: '2025-03-01' })] })
    localStorage.setItem(KEY, raw)
    dedupeStatleHistoryV1()
    expect(localStorage.getItem(KEY)).toBe(raw)
    expect(console.info).not.toHaveBeenCalled()
  })

  it('removes exact duplicates, keeping the latest finish, and sorts by date then finish time', () => {
    store([
      game({ date: '2025-03-09', finishedAt: 5 }),
      game({ date: '2025-03-01', finishedAt: 9, countryCode: 'DE', countryName: 'Germany' }),
      game({ date: '2025-03-01', finishedAt: 2, countryCode: 'IT', countryName: 'Italy' }),
      game({ date: '2025-03-09', finishedAt: 7 }),
      game({ date: '2025-03-09', finishedAt: 6 }),
    ])
    dedupeStatleHistoryV1()
    const items = stored()
    expect(items.map((g) => [g.date, g.countryCode, g.finishedAt])).toEqual([
      ['2025-03-01', 'IT', 2],
      ['2025-03-01', 'DE', 9],
      ['2025-03-09', 'FR', 7],
    ])
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('5'))
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('3'))
  })

  it('keeps games whose guesses only differ by where the words split', () => {
    store([game({ guesses: ['ab', 'c'], guessCount: 2 }), game({ guesses: ['a', 'bc'], guessCount: 2 }), game()])
    dedupeStatleHistoryV1()
    expect(stored()).toHaveLength(3)
  })

  it('keeps games that differ only by result or guess count', () => {
    store([game(), game({ result: 'lost' }), game({ guessCount: 5 })])
    dedupeStatleHistoryV1()
    expect(stored()).toHaveLength(3)
  })
})
