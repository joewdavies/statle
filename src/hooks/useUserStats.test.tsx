import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUserStats } from './useUserStats'
import { UserStatsService } from '../services/userStats'

const record = (over = {}) =>
  UserStatsService.buildRecord({ countryCode: 'FR', countryName: 'France', result: 'won', guesses: ['DE', 'FR'], ...over })

describe('useUserStats', () => {
  it('loads existing history', () => {
    UserStatsService.upsert(record())
    const { result } = renderHook(() => useUserStats(6))
    expect(result.current.history).toHaveLength(1)
    expect(result.current.userStats.wins).toBe(1)
  })

  it('upserts and updates derived stats', () => {
    const { result } = renderHook(() => useUserStats(6))
    expect(result.current.userStats.played).toBe(0)
    act(() => result.current.upsert(record()))
    expect(result.current.userStats.played).toBe(1)
    expect(result.current.userStats.currentStreak).toBe(1)
  })

  it('clears history', () => {
    UserStatsService.upsert(record())
    const { result } = renderHook(() => useUserStats(6))
    act(() => result.current.clear())
    expect(result.current.history).toEqual([])
    expect(result.current.userStats.played).toBe(0)
  })

  it('stays in sync with another hook instance via the local event', () => {
    const a = renderHook(() => useUserStats(6))
    const b = renderHook(() => useUserStats(6))
    act(() => a.result.current.upsert(record()))
    expect(b.result.current.history).toHaveLength(1)
  })

  it('stays in sync with other tabs via storage events', () => {
    const { result } = renderHook(() => useUserStats(6))
    localStorage.setItem(
      'statleHistory.v1',
      JSON.stringify({ v: 1, items: [record(), record({ countryCode: 'ES', countryName: 'Spain' })] })
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'statleHistory.v1' }))
    })
    expect(result.current.history).toHaveLength(2)
  })

  it('ignores storage events for unrelated keys', () => {
    const { result } = renderHook(() => useUserStats(6))
    localStorage.setItem('statleHistory.v1', JSON.stringify({ v: 1, items: [record()] }))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }))
    })
    expect(result.current.history).toHaveLength(0)
  })

  it('removes its listeners on unmount', () => {
    const { unmount, result } = renderHook(() => useUserStats(6))
    unmount()
    localStorage.setItem('statleHistory.v1', JSON.stringify({ v: 1, items: [record()] }))
    window.dispatchEvent(new Event('statle:stats-updated'))
    expect(result.current.history).toHaveLength(0)
  })
})
