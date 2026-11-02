import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { notifications } from '@mantine/notifications'
import { ShareResult } from './share-result'
import { UserStatsService } from '../services/userStats'
import { directionMap } from '../services/geo'
import { renderWithProviders } from '../test/render'

const FIXED = new Date(2025, 5, 1, 12)
const ARROWS = Object.values(directionMap)

function seed(result: 'won' | 'lost', guesses: string[], countryName = 'France', countryCode = 'FR') {
  UserStatsService.upsert(
    UserStatsService.buildRecord({ countryCode, countryName, result, guesses, date: '2025-06-01' })
  )
}

function setEnv({
  mobile = false,
  share,
  clipboard,
}: {
  mobile?: boolean
  share?: () => Promise<void>
  clipboard?: { writeText: (s: string) => Promise<void> }
}) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' : 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
  })
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: !!clipboard })
}

async function openFallbackText() {
  const user = userEvent.setup()
  renderWithProviders(<ShareResult />)
  await user.click(screen.getByRole('button', { name: /Share result/ }))
  const box = await screen.findByRole('textbox')
  return (box as HTMLTextAreaElement).value
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED)
  vi.spyOn(notifications, 'show').mockImplementation(() => 'id')
  setEnv({})
})

afterEach(() => {
  setEnv({})
})

describe('<ShareResult /> text', () => {
  it('formats a win with a celebration on the last row', async () => {
    seed('won', ['Germany', 'France'])
    const lines = (await openFallbackText()).split('\n')
    expect(lines[0]).toBe('Statle (6/1/2025) 2/6 (100%)')
    expect(lines[1]).toBe('🔥 Current Win Streak: 1')
    expect(lines[2]).toMatch(/^(🟩|⬜){5}/)
    expect(ARROWS.some((a) => lines[2].endsWith(a))).toBe(true)
    expect(lines[3]).toBe('🟩🟩🟩🟩🟩🎉')
    expect(lines[4]).toBe('')
    expect(lines[5]).toBe('https://joewdavies.github.io/statle')
    expect(lines).toHaveLength(6)
  })

  it('formats a loss with one row per guess and the best proximity', async () => {
    seed('lost', ['Australia', 'New Zealand', 'Japan', 'Brazil', 'Canada', 'Chile'])
    const lines = (await openFallbackText()).split('\n')
    expect(lines[0]).toMatch(/^Statle \(6\/1\/2025\) 6\/6 \((\d+)%\)$/)
    const pct = Number(lines[0].match(/\((\d+)%\)/)![1])
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThan(100)
    expect(lines[1]).toBe('🔥 Current Win Streak: 0')
    const attempts = lines.slice(2, 8)
    expect(attempts).toHaveLength(6)
    for (const line of attempts) {
      expect(line).toMatch(/^(🟩|⬜){5}/)
      expect(line).not.toContain('🎉')
    }
  })

  it('shows far-away guesses with few green squares and near ones with many', async () => {
    seed('lost', ['Australia', 'Germany'])
    const lines = (await openFallbackText()).split('\n')
    const greens = (s: string) => (s.match(/🟩/g) ?? []).length
    expect(greens(lines[2])).toBeLessThanOrEqual(1)
    expect(greens(lines[3])).toBe(5)
  })

  it('accepts country codes as well as names in the history', async () => {
    seed('won', ['DE', 'FR'])
    const lines = (await openFallbackText()).split('\n')
    expect(lines[2]).toMatch(/^(🟩|⬜){5}/)
    expect(lines[3]).toBe('🟩🟩🟩🟩🟩🎉')
  })

  it('uses blank squares for guesses it cannot resolve', async () => {
    seed('lost', ['Atlantis'])
    const lines = (await openFallbackText()).split('\n')
    expect(lines[2]).toBe('⬜⬜⬜⬜⬜')
  })

  it('still produces a valid message when nothing has been played', async () => {
    const lines = (await openFallbackText()).split('\n')
    expect(lines[0]).toBe('Statle (6/1/2025) 6/6 (0%)')
    expect(lines[1]).toBe('🔥 Current Win Streak: 0')
    expect(lines[lines.length - 1]).toBe('https://joewdavies.github.io/statle')
  })

  it('counts the current win streak', async () => {
    seed('won', ['France'])
    UserStatsService.upsert(
      UserStatsService.buildRecord({ countryCode: 'ES', countryName: 'Spain', result: 'won', guesses: ['Spain'], date: '2025-06-02' })
    )
    const lines = (await openFallbackText()).split('\n')
    expect(lines[1]).toBe('🔥 Current Win Streak: 2')
  })
})

describe('<ShareResult /> delivery', () => {
  it('uses the native share sheet on mobile', async () => {
    seed('won', ['France'])
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    setEnv({ mobile: true, share, clipboard: { writeText } })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setEnv({ mobile: true, share, clipboard: { writeText } })
    renderWithProviders(<ShareResult />)
    await user.click(screen.getByRole('button', { name: /Share result/ }))
    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].text).toContain('Statle (6/1/2025)')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('does not use the native share sheet on desktop', async () => {
    seed('won', ['France'])
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setEnv({ share, clipboard: { writeText } })
    renderWithProviders(<ShareResult />)
    await user.click(screen.getByRole('button', { name: /Share result/ }))
    expect(share).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'Copied results to clipboard!' }))
  })

  it('falls back to the clipboard if the user dismisses the native share sheet', async () => {
    seed('won', ['France'])
    const share = vi.fn().mockRejectedValue(new Error('AbortError'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setEnv({ mobile: true, share, clipboard: { writeText } })
    renderWithProviders(<ShareResult />)
    await user.click(screen.getByRole('button', { name: /Share result/ }))
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('shows the copy dialog when the clipboard is unavailable or rejects', async () => {
    seed('won', ['France'])
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setEnv({ clipboard: { writeText } })
    renderWithProviders(<ShareResult />)
    await user.click(screen.getByRole('button', { name: /Share result/ }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Copy your result')).toBeInTheDocument()
  })

  it('does not use the clipboard on insecure contexts', async () => {
    seed('won', ['France'])
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setEnv({ clipboard: { writeText } })
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    renderWithProviders(<ShareResult />)
    await user.click(screen.getByRole('button', { name: /Share result/ }))
    expect(writeText).not.toHaveBeenCalled()
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
  })
})
