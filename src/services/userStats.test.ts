import { describe, expect, it, vi } from 'vitest'
import { UserStatsService, GameResult } from './userStats'
import { dedupeStatleHistoryV1 } from './migrations'

const game = (over: Partial<GameResult> = {}): GameResult => ({
  date: '2025-01-01',
  countryCode: 'FR',
  countryName: 'France',
  result: 'won',
  guesses: ['DE', 'FR'],
  guessCount: 2,
  finishedAt: 1000,
  ...over,
})

describe('UserStatsService', () => {
  it('starts empty', () => {
    expect(UserStatsService.getAll()).toEqual([])
    expect(UserStatsService.getUserStats(6).played).toBe(0)
  })

  it('persists and sorts games by date then finish time', () => {
    UserStatsService.upsert(game({ date: '2025-01-03', countryCode: 'ES', finishedAt: 5 }))
    UserStatsService.upsert(game({ date: '2025-01-01', countryCode: 'DE', finishedAt: 9 }))
    UserStatsService.upsert(game({ date: '2025-01-01', countryCode: 'IT', finishedAt: 2 }))
    expect(UserStatsService.getAll().map((g) => g.countryCode)).toEqual(['IT', 'DE', 'ES'])
  })

  it('keeps only the newest copy of an identical game', () => {
    UserStatsService.upsert(game({ finishedAt: 1 }))
    UserStatsService.upsert(game({ finishedAt: 50 }))
    UserStatsService.upsert(game({ finishedAt: 10 }))
    const all = UserStatsService.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].finishedAt).toBe(50)
  })

  it('removes by date and clears', () => {
    UserStatsService.upsert(game({ date: '2025-01-01' }))
    UserStatsService.upsert(game({ date: '2025-01-02', countryCode: 'ES' }))
    UserStatsService.removeByDate('2025-01-01')
    expect(UserStatsService.getAll()).toHaveLength(1)
    UserStatsService.clear()
    expect(UserStatsService.getAll()).toEqual([])
  })

  it('builds records with defaults', () => {
    const record = UserStatsService.buildRecord({
      countryCode: 'FR',
      countryName: 'France',
      result: 'lost',
      guesses: ['a', 'b', 'c'],
    })
    expect(record.guessCount).toBe(3)
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(record.finishedAt).toBeGreaterThan(0)
  })

  it('computes win rate, streaks and the guess distribution', () => {
    const results: Array<['won' | 'lost', number]> = [
      ['won', 2], ['won', 3], ['lost', 6], ['won', 1], ['won', 1], ['won', 6],
    ]
    results.forEach(([result, n], i) =>
      UserStatsService.upsert(
        game({
          date: `2025-01-${String(i + 1).padStart(2, '0')}`,
          result,
          guessCount: n,
          guesses: Array.from({ length: n }, (_, k) => `g${i}-${k}`),
          finishedAt: i,
        })
      )
    )
    const s = UserStatsService.getUserStats(6)
    expect(s.played).toBe(6)
    expect(s.wins).toBe(5)
    expect(s.winRate).toBeCloseTo(5 / 6)
    expect(s.maxStreak).toBe(3)
    expect(s.currentStreak).toBe(3)
    expect(s.guessDistribution).toEqual([2, 1, 1, 0, 0, 1])
    expect(s.lastGame?.date).toBe('2025-01-06')
  })

  it('ignores wins whose guess count is outside the distribution', () => {
    UserStatsService.upsert(game({ guessCount: 99, guesses: ['x'] }))
    expect(UserStatsService.getUserStats(6).guessDistribution).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('migrates the legacy array key to v1', () => {
    localStorage.setItem('statleHistory', JSON.stringify([game()]))
    expect(UserStatsService.getAll()).toHaveLength(1)
    expect(localStorage.getItem('statleHistory')).toBeNull()
    expect(localStorage.getItem('statleHistory.v1')).not.toBeNull()
  })

  it.each(['not json', '{"v":2,"items":[]}', '{"v":1,"items":"nope"}', 'null'])(
    'resets safely from corrupted storage: %s',
    (raw) => {
      localStorage.setItem('statleHistory.v1', raw)
      expect(UserStatsService.getAll()).toEqual([])
      expect(() => UserStatsService.upsert(game())).not.toThrow()
      expect(UserStatsService.getAll()).toHaveLength(1)
    }
  )
})

describe('dedupeStatleHistoryV1', () => {
  it('removes exact duplicates, keeping the latest finishedAt', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    localStorage.setItem(
      'statleHistory.v1',
      JSON.stringify({ v: 1, items: [game({ finishedAt: 1 }), game({ finishedAt: 9 }), game({ countryCode: 'ES' })] })
    )
    dedupeStatleHistoryV1()
    const items = JSON.parse(localStorage.getItem('statleHistory.v1')!).items as GameResult[]
    expect(items).toHaveLength(2)
    expect(items.find((g) => g.countryCode === 'FR')?.finishedAt).toBe(9)
  })

  it('does nothing without history or with unexpected data', () => {
    expect(() => dedupeStatleHistoryV1()).not.toThrow()
    localStorage.setItem('statleHistory.v1', '{bad')
    expect(() => dedupeStatleHistoryV1()).not.toThrow()
    localStorage.setItem('statleHistory.v1', JSON.stringify({ v: 2, items: [] }))
    dedupeStatleHistoryV1()
    expect(localStorage.getItem('statleHistory.v1')).toBe(JSON.stringify({ v: 2, items: [] }))
  })
})
