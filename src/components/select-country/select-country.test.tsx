import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { notifications } from '@mantine/notifications'
import { SelectCountry } from './select-country'
import { countries as allCountries } from '../../data/countries/countries'
import { GameStatus, MAX_GUESSES } from '../../constants'
import { translations } from '../../i18n/translations'
import { renderWithProviders } from '../../test/render'

const pick = (...codes: string[]) => codes.map((c) => allCountries.find((x) => x.code === c)!)
const countries = pick('FR', 'DE', 'ES', 'IT', 'PT', 'BE', 'NL', 'TR', 'CZ', 'SK')
const target = countries[0]

type Snapshot = { guesses: string[]; guessCount: number; status: GameStatus }

function Harness({ snapshot, initial }: { snapshot: Snapshot; initial?: Partial<Snapshot> }) {
  const [value, setValue] = useState('')
  const [guesses, setGuesses] = useState<string[]>(initial?.guesses ?? Array(MAX_GUESSES).fill(''))
  const [guessCount, setGuessCount] = useState(initial?.guessCount ?? 0)
  const [status, setStatus] = useState<GameStatus>(initial?.status ?? GameStatus.Playing)
  Object.assign(snapshot, { guesses, guessCount, status })
  return (
    <SelectCountry
      countries={countries}
      country={target}
      value={value}
      setValue={setValue}
      guesses={guesses}
      setGuesses={setGuesses}
      guessCount={guessCount}
      setGuessCount={setGuessCount}
      setGameStatus={setStatus}
    />
  )
}

function setup(initial?: Partial<Snapshot>) {
  const snapshot: Snapshot = { guesses: [], guessCount: 0, status: GameStatus.Playing }
  const show = vi.spyOn(notifications, 'show').mockImplementation(() => 'id')
  const user = userEvent.setup()
  renderWithProviders(<Harness snapshot={snapshot} initial={initial} />)
  const input = screen.getByRole('textbox')
  const guessButton = screen.getByRole('button', { name: 'Guess' })
  return { snapshot, show, user, input, guessButton }
}

describe('<SelectCountry /> guess submission', () => {
  it('asks for a country when the input is empty', async () => {
    const { user, guessButton, show, snapshot } = setup()
    await user.click(guessButton)
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red', title: 'No country selected' }))
    expect(snapshot.guessCount).toBe(0)
  })

  it('rejects text that is not a country', async () => {
    const { user, input, guessButton, show, snapshot } = setup()
    await user.type(input, 'Narnia')
    await user.click(guessButton)
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Country not found' }))
    expect(snapshot.guessCount).toBe(0)
    expect(snapshot.guesses.every((g) => g === '')).toBe(true)
  })

  it('records a wrong guess and keeps playing', async () => {
    const { user, input, guessButton, snapshot } = setup()
    await user.type(input, 'Germany')
    await user.click(guessButton)
    expect(snapshot.guesses[0]).toBe('Germany')
    expect(snapshot.guessCount).toBe(1)
    expect(snapshot.status).toBe(GameStatus.Playing)
    expect(input).toHaveValue('')
  })

  it('accepts case and accent insensitive input', async () => {
    const { user, input, guessButton, snapshot } = setup()
    await user.type(input, 'tURKIYE')
    await user.click(guessButton)
    expect(snapshot.guesses[0]).toBe('Türkiye')
  })

  it('blocks guessing the same country twice', async () => {
    const { user, input, guessButton, show, snapshot } = setup()
    await user.type(input, 'Germany')
    await user.click(guessButton)
    await user.type(input, 'Germany')
    await user.click(guessButton)
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Already guessed' }))
    expect(snapshot.guessCount).toBe(1)
  })

  it('wins on the correct guess', async () => {
    const { user, input, guessButton, snapshot } = setup()
    await user.type(input, 'France')
    await user.click(guessButton)
    expect(snapshot.status).toBe(GameStatus.Won)
    expect(snapshot.guessCount).toBe(1)
  })

  it('submits with the Enter key', async () => {
    const { user, input, snapshot } = setup()
    await user.type(input, 'Spain{Enter}')
    await waitFor(() => expect(snapshot.guesses[0]).toBe('Spain'))
  })

  it('loses after the sixth wrong guess', async () => {
    const { user, input, guessButton, snapshot } = setup()
    for (const name of ['Germany', 'Spain', 'Italy', 'Portugal', 'Belgium']) {
      await user.type(input, name)
      await user.click(guessButton)
      expect(snapshot.status).toBe(GameStatus.Playing)
    }
    await user.type(input, 'Netherlands')
    await user.click(guessButton)
    expect(snapshot.guessCount).toBe(MAX_GUESSES)
    expect(snapshot.status).toBe(GameStatus.Lost)
  })

  it('still wins when the correct answer is the final guess', async () => {
    const { user, input, guessButton, snapshot } = setup({
      guesses: ['Germany', 'Spain', 'Italy', 'Portugal', 'Belgium', ''],
      guessCount: 5,
    })
    await user.type(input, 'France')
    await user.click(guessButton)
    expect(snapshot.status).toBe(GameStatus.Won)
  })

  it('does not record more than the maximum number of guesses', async () => {
    const { user, input, guessButton, snapshot } = setup({
      guesses: ['Germany', 'Spain', 'Italy', 'Portugal', 'Belgium', 'Netherlands'],
      guessCount: MAX_GUESSES,
    })
    await user.type(input, 'Czechia')
    await user.click(guessButton)
    expect(snapshot.guessCount).toBe(MAX_GUESSES)
    expect(snapshot.guesses).not.toContain('Czechia')
  })

  it('suggests matching countries by name', async () => {
    const { user, input } = setup()
    await user.type(input, 'turk')
    expect(await screen.findByRole('option', { name: 'Türkiye' })).toBeInTheDocument()
  })

  it.each([
    ['turkey', 'Türkiye'],
    ['czech republic', 'Czechia'],
    ['czech rep', 'Czechia'],
    ['slovak republic', 'Slovakia'],
  ])('finds %s through its alias (regression: Mantine dropped keywords)', async (query, expected) => {
    const { user, input } = setup()
    await user.type(input, query)
    expect(await screen.findByRole('option', { name: expected })).toBeInTheDocument()
  })

  it('suggests nothing for gibberish', async () => {
    const { user, input } = setup()
    await user.type(input, 'qqqqqq')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('searches and submits using localized names, recording the canonical name', async () => {
    localStorage.setItem('statle-lang', 'fr')
    const snapshot: Snapshot = { guesses: [], guessCount: 0, status: GameStatus.Playing }
    vi.spyOn(notifications, 'show').mockImplementation(() => 'id')
    const user = userEvent.setup()
    renderWithProviders(<Harness snapshot={snapshot} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'allemag')
    expect(await screen.findByRole('option', { name: 'Allemagne' })).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'Allemagne')
    await user.click(screen.getByRole('button', { name: translations.fr['Guess'] }))
    expect(snapshot.guesses[0]).toBe('Germany')
  })

  it('rolls the dice to a country that has not been guessed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user, input } = setup({
      guesses: ['Germany', 'Spain', 'Italy', 'Portugal', 'Belgium', ''],
      guessCount: 5,
    })
    await user.click(screen.getByRole('button', { name: 'Roll suggestion' }))
    await vi.advanceTimersByTimeAsync(5000)
    const rolled = (input as HTMLInputElement).value
    expect(countries.map((c) => c.name)).toContain(rolled)
    expect(['Germany', 'Spain', 'Italy', 'Portugal', 'Belgium']).not.toContain(rolled)
  })
})
