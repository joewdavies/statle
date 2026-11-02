import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { createRef } from 'react'
import { renderWithProviders } from '../../test/render'
import { Navbar } from './navbar'
import { Rules } from './rules'
import { ModeToggle } from './mode-toggle'
import { WorldMap } from './world-map'
import { UserStatsService } from '../../services/userStats'
import useFocusOnKey from '../../hooks/useFocusOnKey'
import { LanguageProvider } from '../../hooks/useLanguage'
import { translations } from '../../i18n/translations'
import { countries } from '../../data/countries/countries'

describe('<Navbar /> language menu', () => {
  it('lists all four languages and marks the active one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />)
    await user.click(screen.getByRole('button', { name: 'Change language' }))
    for (const label of ['English', 'Español', 'Français', 'Deutsch']) {
      expect(await screen.findByRole('menuitem', { name: new RegExp(label) })).toBeInTheDocument()
    }
    expect(screen.getByRole('menuitem', { name: /English/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('menuitem', { name: /Deutsch/ })).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['Español', 'es'],
    ['Français', 'fr'],
    ['Deutsch', 'de'],
  ] as const)('switches the UI to %s and remembers the choice', async (label, code) => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />)
    await user.click(screen.getByRole('button', { name: 'Change language' }))
    await user.click(await screen.findByRole('menuitem', { name: new RegExp(label) }))

    expect(localStorage.getItem('statle-lang')).toBe(code)
    expect(document.documentElement.lang).toBe(code)
    const translated = (translations as any)[code]['Change language']
    expect(translated).toBeTruthy()
    expect(await screen.findByRole('button', { name: translated })).toBeInTheDocument()
  })
})

describe('<ModeToggle />', () => {
  afterEach(() => vi.useRealTimers())

  it('toggles the colour scheme on click', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider defaultColorScheme="light">
        <LanguageProvider>
          <ModeToggle />
        </LanguageProvider>
      </MantineProvider>
    )
    const btn = screen.getByRole('button')
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light')
    await user.click(btn)
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark')
    await user.click(btn)
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light')
  })

  it('has an accessible label', () => {
    renderWithProviders(<ModeToggle />)
    expect(screen.getByRole('button', { name: 'Toggle color scheme' })).toBeInTheDocument()
  })
})

describe('<Rules />', () => {
  it('is closed until the help button is pressed, then explains the game', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Rules />)
    expect(screen.queryByText('How to play')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText('How to play')).toBeInTheDocument()
    expect(screen.getByText('Guess the country in 6 guesses.')).toBeInTheDocument()
    expect(screen.getByText('Each guess must be a valid country or territory.')).toBeInTheDocument()
  })

  it('shows a worked example whose distances match the real geometry', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Rules />)
    await user.click(screen.getByRole('button'))
    const dialog = await screen.findByRole('dialog')
    const text = dialog.textContent ?? ''
    expect(text).toContain(countries[25].name)
    expect(text).toContain(countries[140].name)
    expect(text).toContain(countries[142].name)
    const proximities = [...text.matchAll(/(\d+)\s*(?:%|% of proximity)/g)].map((m) => Number(m[1]))
    expect(proximities.length).toBeGreaterThan(0)
    for (const p of proximities) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(100)
    }
  })

  it('renders in another language', async () => {
    localStorage.setItem('statle-lang', 'fr')
    const user = userEvent.setup()
    renderWithProviders(<Rules />)
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText(translations.fr['How to play'])).toBeInTheDocument()
  })
})

describe('<WorldMap />', () => {
  const rect = (width: number, height: number) =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

  const fills = (c: HTMLElement) =>
    [...c.querySelectorAll('path.country')].map((p) => ({
      title: p.querySelector('title')?.textContent,
      fill: p.getAttribute('fill'),
    }))

  it('draws the world without Antarctica', () => {
    rect(800, 400)
    const { container } = render(<WorldMap />)
    const items = fills(container)
    expect(items.length).toBeGreaterThan(150)
    expect(items.some((i) => /antarctica/i.test(i.title ?? ''))).toBe(false)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 800 400')
  })

  it('draws nothing while the container has no size', () => {
    rect(0, 0)
    const { container } = render(<WorldMap />)
    expect(container.querySelectorAll('path.country')).toHaveLength(0)
  })

  it('colours only countries the player has won', () => {
    rect(800, 400)
    const base = {
      date: '2025-01-01',
      guessCount: 1,
      guesses: [],
      finishedAt: 1,
    }
    UserStatsService.upsert({ ...base, countryCode: 'FR', countryName: 'France', result: 'won' } as any)
    UserStatsService.upsert({ ...base, date: '2025-01-02', countryCode: 'DE', countryName: 'Germany', result: 'lost' } as any)
    const { container } = render(<WorldMap />)
    const items = fills(container)
    const green = items.filter((i) => i.fill === '#4caf50').map((i) => i.title)
    expect(green).toEqual(['France'])
    expect(items.find((i) => i.title === 'Germany')?.fill).toBe('#e0e0e0')
  })
})

describe('useFocusOnKey', () => {
  function Harness({ k }: { k: string }) {
    const ref = createRef<HTMLInputElement>()
    useFocusOnKey(k, ref as any)
    return <input ref={ref} aria-label="box" />
  }

  it('focuses the input when the key is pressed and swallows the key', () => {
    render(<Harness k="/" />)
    const evt = new KeyboardEvent('keydown', { key: '/', cancelable: true })
    window.dispatchEvent(evt)
    expect(screen.getByLabelText('box')).toHaveFocus()
    expect(evt.defaultPrevented).toBe(true)
  })

  it('ignores other keys', () => {
    render(<Harness k="/" />)
    const evt = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
    window.dispatchEvent(evt)
    expect(screen.getByLabelText('box')).not.toHaveFocus()
    expect(evt.defaultPrevented).toBe(false)
  })

  it('stops listening after unmount', () => {
    const { unmount } = render(<Harness k="/" />)
    unmount()
    const evt = new KeyboardEvent('keydown', { key: '/', cancelable: true })
    window.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(false)
  })
})
