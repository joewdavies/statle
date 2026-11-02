import { describe, expect, it } from 'vitest'
import {
  dailyIndex,
  dayIndexLocal,
  finishedKeyFor,
  msUntilLocalReset,
  stateKeyFor,
  todayKeyLocal,
} from './daily'

describe('daily helpers', () => {
  it('formats the local date key with zero padding', () => {
    expect(todayKeyLocal(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(todayKeyLocal(new Date(2025, 10, 17))).toBe('2025-11-17')
  })

  it('counts days from the 2025-01-01 epoch', () => {
    expect(dayIndexLocal(new Date(2025, 0, 1))).toBe(0)
    expect(dayIndexLocal(new Date(2025, 0, 2, 23, 59))).toBe(1)
    expect(dayIndexLocal(new Date(2026, 0, 1))).toBe(365)
  })

  it('is stable across DST transitions', () => {
    const before = dayIndexLocal(new Date(2025, 2, 29, 12))
    const after = dayIndexLocal(new Date(2025, 2, 30, 12))
    const next = dayIndexLocal(new Date(2025, 2, 31, 12))
    expect(after - before).toBe(1)
    expect(next - after).toBe(1)
  })

  it('keeps the index inside the list bounds, even before the epoch', () => {
    for (const date of [new Date(2024, 5, 1), new Date(2025, 0, 1), new Date(2030, 11, 31)]) {
      const idx = dailyIndex(197, date)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(197)
    }
  })

  it('is deterministic for the same day', () => {
    expect(dailyIndex(50, new Date(2025, 5, 1, 1))).toBe(dailyIndex(50, new Date(2025, 5, 1, 23)))
  })

  it('builds storage keys', () => {
    expect(finishedKeyFor('2025-01-01')).toBe('statle:daily:2025-01-01:finished')
    expect(stateKeyFor('2025-01-01')).toBe('statle:daily:2025-01-01:state')
  })

  it('computes milliseconds until local midnight', () => {
    const noon = new Date(2025, 5, 1, 12, 0, 0, 0)
    expect(msUntilLocalReset(noon)).toBe(12 * 60 * 60 * 1000)
    const lastSecond = new Date(2025, 5, 1, 23, 59, 59, 0)
    expect(msUntilLocalReset(lastSecond)).toBe(1000)
  })
})
