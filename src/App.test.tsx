import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { MAX_GUESSES } from './constants'

vi.mock('./components/globe/globe-journey', () => ({ default: () => <div data-testid="globe" /> }))
vi.mock('react-confetti-explosion', () => ({ default: () => <div data-testid="confetti" /> }))
vi.mock('react-snowfall', () => ({ default: () => null }))

const NOW = new Date(2025, 5, 1, 12)
const KEY = '2025-06-01'
const STATE_KEY = `statle:daily:${KEY}:state`
const FINISHED_KEY = `statle:daily:${KEY}:finished`

// App reads "today" once at import time, so each scenario loads a fresh copy.
async function loadApp() {
  vi.resetModules()
  const { LanguageProvider } = await import('./hooks/useLanguage')
  const { default: App } = await import('./App')
  const { getDailyCountry } = await import('./helpers/getRandomCountry')
  const { countries } = await import('./data/countries/countries')
  const target = getDailyCountry()
  const wrong = countries.filter((c) => c.code !== target.code).map((c) => c.name)
  const view = render(
    <MantineProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MantineProvider>
  )
  return { ...view, target, wrong }
}

const history = () => JSON.parse(localStorage.getItem('statleHistory.v1') ?? '{"items":[]}').items as any[]
const persisted = () => JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null')

async function guess(user: ReturnType<typeof userEvent.setup>, name: string) {
  const input = screen.getByRole('textbox')
  await user.clear(input)
  await user.click(input)
  await user.paste(name)
  await user.click(screen.getByRole('button', { name: 'Guess' }))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.spyOn(notifications, 'show').mockImplementation(() => 'id')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('<App /> daily game', () => {
  it('starts a fresh round with a single clue and a search box', async () => {
    await loadApp()
    expect(screen.getByText("Guess today's country!", { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
    expect(document.title).toContain("Guess today's country!")
  })

  it('serves the same country to everyone on the same day', async () => {
    const a = await loadApp()
    a.unmount()
    const b = await loadApp()
    expect(b.target.code).toBe(a.target.code)
  })

  it('reveals another clue and persists progress after a wrong guess', async () => {
    const user = userEvent.setup()
    const { wrong } = await loadApp()
    await guess(user, wrong[0])
    expect(screen.getByText('2 / 6')).toBeInTheDocument()
    expect(persisted()).toMatchObject({ guessCount: 1, gameStatus: 'playing' })
    expect(persisted().guesses[0]).toBe(wrong[0])
    expect(localStorage.getItem(FINISHED_KEY)).toBeNull()
    expect(history()).toHaveLength(0)
  })

  it('records a win, locks the day and removes the search box', async () => {
    const user = userEvent.setup()
    const { target, wrong } = await loadApp()
    await guess(user, wrong[0])
    await guess(user, target.name)

    expect(localStorage.getItem(FINISHED_KEY)).toBe('won')
    expect(persisted()).toMatchObject({ guessCount: 2, gameStatus: 'won' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const items = history()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      countryCode: target.code,
      countryName: target.name,
      result: 'won',
      guessCount: 2,
      guesses: [wrong[0], target.name],
    })
  })

  it('records a loss after six wrong guesses', async () => {
    const user = userEvent.setup()
    const { target, wrong } = await loadApp()
    for (let i = 0; i < MAX_GUESSES; i++) await guess(user, wrong[i])

    expect(localStorage.getItem(FINISHED_KEY)).toBe('lost')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const items = history()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ countryCode: target.code, result: 'lost', guessCount: MAX_GUESSES })
    expect(items[0].guesses).toEqual(wrong.slice(0, MAX_GUESSES))
  })

  it('does not record the same finished game twice across reloads', async () => {
    const user = userEvent.setup()
    const first = await loadApp()
    await guess(user, first.target.name)
    first.unmount()
    const second = await loadApp()
    second.unmount()
    await loadApp()
    expect(history()).toHaveLength(1)
  })

  it('resumes an in-progress round after a reload', async () => {
    const user = userEvent.setup()
    const first = await loadApp()
    await guess(user, first.wrong[0])
    await guess(user, first.wrong[1])
    first.unmount()

    await loadApp()
    expect(screen.getByText('3 / 6')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(persisted().guessCount).toBe(2)
  })

  it('keeps a finished day finished after a reload', async () => {
    const user = userEvent.setup()
    const first = await loadApp()
    await guess(user, first.target.name)
    first.unmount()

    await loadApp()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(localStorage.getItem(FINISHED_KEY)).toBe('won')
  })

  it('cannot be replayed by clearing only the in-progress state', async () => {
    const user = userEvent.setup()
    const first = await loadApp()
    await guess(user, first.wrong[0])
    await guess(user, first.target.name)
    first.unmount()
    localStorage.removeItem(STATE_KEY)

    await loadApp()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('ignores corrupted saved state instead of crashing', async () => {
    localStorage.setItem(STATE_KEY, '{not json')
    await loadApp()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
  })

  it('shows a new puzzle on a new day', async () => {
    const user = userEvent.setup()
    const first = await loadApp()
    await guess(user, first.target.name)
    first.unmount()

    vi.setSystemTime(new Date(2025, 5, 2, 9))
    await loadApp()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
  })

  it('shows the globe journey and celebration once a win has finished revealing', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { target } = await loadApp()
    await guess(user, target.name)
    await waitFor(() => expect(screen.getByTestId('globe')).toBeInTheDocument(), { timeout: 8000 })
    expect(screen.getByTestId('confetti')).toBeInTheDocument()
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green', message: 'Nice job!' }))
  }, 15000)

  it('reloads at local midnight so the next puzzle loads', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(2025, 5, 1, 23, 59, 0))
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    await loadApp()
    expect(reload).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(reload).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
